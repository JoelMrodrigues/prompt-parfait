-- Inviter des membres à rejoindre l'équipe (joueurs, coach, manager...)
-- À exécuter dans Supabase SQL Editor
-- Permet de partager l'accès à l'équipe via un lien d'invitation

-- 1. Table des membres d'équipe (en plus du propriétaire teams.user_id)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- 2. Token d'invitation sur l'équipe (généré au clic sur "Inviter")
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE DEFAULT gen_random_uuid();

-- 3. Fonction helper : l'utilisateur a-t-il accès à cette équipe ?
CREATE OR REPLACE FUNCTION public.user_has_team_access(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = p_team_id
    AND (t.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = t.id AND tm.user_id = auth.uid()
    ))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team owners can manage members"
  ON team_members FOR ALL
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (user_has_team_access(team_id));

-- 5. Mise à jour des policies teams : les membres peuvent SELECT
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
CREATE POLICY "Users can view their own teams"
  ON teams FOR SELECT TO authenticated
  USING (user_has_team_access(id));

-- 6. Mise à jour des policies players
DROP POLICY IF EXISTS "Users can view players from their teams" ON players;
CREATE POLICY "Users can view players from their teams"
  ON players FOR SELECT TO authenticated
  USING (user_has_team_access(team_id));

DROP POLICY IF EXISTS "Users can insert players to their teams" ON players;
CREATE POLICY "Users can insert players to their teams"
  ON players FOR INSERT TO authenticated
  WITH CHECK (user_has_team_access(team_id));

DROP POLICY IF EXISTS "Users can update players from their teams" ON players;
CREATE POLICY "Users can update players from their teams"
  ON players FOR UPDATE TO authenticated
  USING (user_has_team_access(team_id))
  WITH CHECK (user_has_team_access(team_id));

DROP POLICY IF EXISTS "Users can delete players from their teams" ON players;
CREATE POLICY "Users can delete players from their teams"
  ON players FOR DELETE TO authenticated
  USING (user_has_team_access(team_id));

-- 7. Mise à jour des policies champion_pools (via players -> team_id)
DROP POLICY IF EXISTS "Users can view champion pools from their teams" ON champion_pools;
CREATE POLICY "Users can view champion pools from their teams"
  ON champion_pools FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = champion_pools.player_id AND user_has_team_access(p.team_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert champion pools to their teams" ON champion_pools;
CREATE POLICY "Users can insert champion pools to their teams"
  ON champion_pools FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = champion_pools.player_id AND user_has_team_access(p.team_id)
    )
  );

DROP POLICY IF EXISTS "Users can update champion pools from their teams" ON champion_pools;
CREATE POLICY "Users can update champion pools from their teams"
  ON champion_pools FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = champion_pools.player_id AND user_has_team_access(p.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = champion_pools.player_id AND user_has_team_access(p.team_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete champion pools from their teams" ON champion_pools;
CREATE POLICY "Users can delete champion pools from their teams"
  ON champion_pools FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p WHERE p.id = champion_pools.player_id AND user_has_team_access(p.team_id)
    )
  );

-- 8. team_matches
DROP POLICY IF EXISTS "Users can manage their team matches" ON team_matches;
CREATE POLICY "Users can manage their team matches"
  ON team_matches FOR ALL TO authenticated
  USING (user_has_team_access(team_id))
  WITH CHECK (user_has_team_access(team_id));

-- 9. team_match_participants
DROP POLICY IF EXISTS "Users can manage their team match participants" ON team_match_participants;
CREATE POLICY "Users can manage their team match participants"
  ON team_match_participants FOR ALL TO authenticated
  USING (
    match_id IN (
      SELECT id FROM team_matches WHERE user_has_team_access(team_id)
    )
  )
  WITH CHECK (
    match_id IN (
      SELECT id FROM team_matches WHERE user_has_team_access(team_id)
    )
  );

-- 10. team_match_timeline
DROP POLICY IF EXISTS "Users can manage their team match timelines" ON team_match_timeline;
CREATE POLICY "Users can manage their team match timelines"
  ON team_match_timeline FOR ALL TO authenticated
  USING (
    match_id IN (
      SELECT id FROM team_matches WHERE user_has_team_access(team_id)
    )
  )
  WITH CHECK (
    match_id IN (
      SELECT id FROM team_matches WHERE user_has_team_access(team_id)
    )
  );

-- 11. player_soloq_matches (via players)
DROP POLICY IF EXISTS "Users can view soloq matches from their team players" ON player_soloq_matches;
DROP POLICY IF EXISTS "Users can insert soloq matches for their team players" ON player_soloq_matches;
DROP POLICY IF EXISTS "Users can update soloq matches for their team players" ON player_soloq_matches;
DROP POLICY IF EXISTS "Users can delete soloq matches for their team players" ON player_soloq_matches;

CREATE POLICY "Users can view soloq matches from their team players"
  ON player_soloq_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN teams t ON t.id = p.team_id
      WHERE p.id = player_soloq_matches.player_id AND user_has_team_access(t.id)
    )
  );

CREATE POLICY "Users can insert soloq matches for their team players"
  ON player_soloq_matches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_soloq_matches.player_id AND user_has_team_access(p.team_id)
    )
  );

CREATE POLICY "Users can update soloq matches for their team players"
  ON player_soloq_matches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_soloq_matches.player_id AND user_has_team_access(p.team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_soloq_matches.player_id AND user_has_team_access(p.team_id)
    )
  );

CREATE POLICY "Users can delete soloq matches for their team players"
  ON player_soloq_matches FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_soloq_matches.player_id AND user_has_team_access(p.team_id)
    )
  );

-- 12. Fonction RPC pour rejoindre une équipe via token (contourne RLS car l'invité n'est pas encore membre)
CREATE OR REPLACE FUNCTION public.join_team_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non connecté');
  END IF;
  SELECT id, team_name INTO v_team_id, v_team_name
  FROM teams
  WHERE invite_token = p_token;
  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien invalide');
  END IF;
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'team_name', v_team_name);
END;
$$;

COMMENT ON TABLE team_members IS 'Membres invités à l''équipe (accès partagé)';
COMMENT ON COLUMN teams.invite_token IS 'Token unique pour le lien d''invitation (partagé aux joueurs, coach, manager)';
