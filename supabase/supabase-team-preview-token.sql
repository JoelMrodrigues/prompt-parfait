-- Fonction RPC : preview d'une équipe via son token d'invitation
-- Accessible sans être membre (SECURITY DEFINER, contourne RLS)
-- Retourne infos équipe + joueurs + flag taken + comptage staff

CREATE OR REPLACE FUNCTION public.get_team_preview_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id      UUID;
  v_team_name    TEXT;
  v_logo_url     TEXT;
  v_players      JSONB;
  v_staff_counts JSONB;
BEGIN
  -- 1. Trouver l'équipe par son token
  SELECT id, team_name, logo_url
  INTO v_team_id, v_team_name, v_logo_url
  FROM teams
  WHERE invite_token = p_token;

  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Joueurs + flag taken (slot déjà pris par un membre invité)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',           p.id,
        'player_name',  p.player_name,
        'position',     p.position,
        'top_champion', (
          SELECT cp.champion_id
          FROM champion_pools cp
          WHERE cp.player_id = p.id
          ORDER BY cp.mastery_level DESC
          LIMIT 1
        ),
        'taken', EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = v_team_id AND tm.player_id = p.id
        )
      )
      ORDER BY p.created_at
    ),
    '[]'::JSONB
  )
  INTO v_players
  FROM players p
  WHERE p.team_id = v_team_id;

  -- 3. Comptage staff par rôle
  SELECT jsonb_build_object(
    'coach',      COUNT(*) FILTER (WHERE role = 'coach'),
    'analyst',    COUNT(*) FILTER (WHERE role = 'analyst'),
    'manager',    COUNT(*) FILTER (WHERE role = 'manager'),
    'spectateur', COUNT(*) FILTER (WHERE role = 'spectateur')
  )
  INTO v_staff_counts
  FROM team_members
  WHERE team_id = v_team_id;

  RETURN jsonb_build_object(
    'id',           v_team_id,
    'team_name',    v_team_name,
    'logo_url',     v_logo_url,
    'players',      COALESCE(v_players, '[]'::JSONB),
    'staff_counts', COALESCE(v_staff_counts, '{"coach":0,"analyst":0,"manager":0,"spectateur":0}'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_preview_by_token(UUID) TO anon, authenticated;
