-- Migration : ajout player_id à team_members + transfer_team_ownership RPC
-- À appliquer dans Supabase SQL Editor

-- ─── 1. Colonne player_id sur team_members ────────────────────────────────────
-- Permet d'associer un utilisateur invité à son joueur (player) dans l'équipe.
-- Nullable : un coach/manager/spectateur n'a pas forcément de player associé.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- ─── 2. Mise à jour de join_team_by_token ─────────────────────────────────────
-- Accepte maintenant p_player_id et le stocke dans team_members.

CREATE OR REPLACE FUNCTION public.join_team_by_token(
  p_token     UUID,
  p_role      TEXT    DEFAULT 'member',
  p_position  TEXT    DEFAULT NULL,
  p_player_id UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id   UUID;
  v_team_name TEXT;
  v_user_id   UUID;
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

  -- Vérifier que p_player_id appartient bien à cette équipe (si fourni)
  IF p_player_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM players WHERE id = p_player_id AND team_id = v_team_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Joueur invalide pour cette équipe');
    END IF;
  END IF;

  INSERT INTO team_members (team_id, user_id, role, player_id)
  VALUES (v_team_id, v_user_id, COALESCE(p_role, 'member'), p_player_id)
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET role      = EXCLUDED.role,
        player_id = COALESCE(EXCLUDED.player_id, team_members.player_id);

  RETURN jsonb_build_object('success', true, 'team_name', v_team_name);
END;
$$;

-- ─── 3. transfer_team_ownership ───────────────────────────────────────────────
-- Transfère la propriété d'une équipe à un autre membre.
-- L'appelant doit être l'owner actuel (teams.user_id = auth.uid()).
-- Effet : teams.user_id → new_owner, ancien owner → 'co_owner' dans team_members.

CREATE OR REPLACE FUNCTION public.transfer_team_ownership(
  p_team_id      UUID,
  p_new_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_owner UUID;
BEGIN
  -- Vérifier que l'appelant est bien l'owner actuel
  SELECT user_id INTO v_current_owner
  FROM teams
  WHERE id = p_team_id;

  IF v_current_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Équipe introuvable');
  END IF;

  IF v_current_owner != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul le propriétaire peut transférer la propriété');
  END IF;

  IF p_new_owner_id = v_current_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous êtes déjà propriétaire');
  END IF;

  -- Vérifier que le nouveau propriétaire est bien membre de l'équipe
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = p_new_owner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le nouveau propriétaire doit être membre de l''équipe');
  END IF;

  -- 1. Transférer la propriété
  UPDATE teams SET user_id = p_new_owner_id WHERE id = p_team_id;

  -- 2. Passer l'ancien owner en co_owner dans team_members (upsert)
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (p_team_id, v_current_owner, 'co_owner')
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = 'co_owner';

  -- 3. Supprimer l'entrée team_members du nouveau owner (il est maintenant owner, pas membre)
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_new_owner_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 4. Permettre à un membre de mettre à jour son propre player_id ───────────
-- Utile si l'utilisateur veut changer son joueur associé après avoir rejoint.

CREATE OR REPLACE FUNCTION public.update_my_player_id(
  p_team_id   UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que p_player_id appartient à cette équipe
  IF p_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM players WHERE id = p_player_id AND team_id = p_team_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Joueur invalide');
  END IF;

  UPDATE team_members
  SET player_id = p_player_id
  WHERE team_id = p_team_id AND user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;
