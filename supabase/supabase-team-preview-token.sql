-- Fonction RPC : preview d'une équipe via son token d'invitation
-- Accepte TEXT (token brut OU URL complète) — extrait l'UUID via regex
-- SECURITY DEFINER pour contourner RLS (l'invité n'est pas encore membre)

-- Supprimer toutes les versions existantes (UUID ou TEXT, retour différent)
DROP FUNCTION IF EXISTS public.get_team_preview_by_token(UUID);
DROP FUNCTION IF EXISTS public.get_team_preview_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.get_team_preview_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_uuid   UUID;
  v_team_id      UUID;
  v_team_name    TEXT;
  v_logo_url     TEXT;
  v_players      JSONB;
  v_staff_counts JSONB;
BEGIN
  -- Extraire l'UUID depuis le token brut ou l'URL complète
  BEGIN
    v_token_uuid := (regexp_match(p_token,
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i'))[1]::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  IF v_token_uuid IS NULL THEN RETURN NULL; END IF;

  SELECT id, team_name, logo_url
  INTO v_team_id, v_team_name, v_logo_url
  FROM teams WHERE invite_token = v_token_uuid;
  IF v_team_id IS NULL THEN RETURN NULL; END IF;

  -- Joueurs + flag taken (slot déjà pris par un membre invité)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',           p.id,
        'player_name',  p.player_name,
        'position',     p.position,
        'top_champion', (
          SELECT cp.champion_id FROM champion_pools cp
          WHERE cp.player_id = p.id
          ORDER BY cp.mastery_level DESC LIMIT 1
        ),
        'taken', EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = v_team_id AND tm.player_id = p.id
        )
      ) ORDER BY p.created_at
    ),
    '[]'::JSONB
  )
  INTO v_players
  FROM players p WHERE p.team_id = v_team_id;

  -- Comptage staff par rôle
  SELECT jsonb_build_object(
    'coach',      COUNT(*) FILTER (WHERE role = 'coach'),
    'analyst',    COUNT(*) FILTER (WHERE role = 'analyst'),
    'manager',    COUNT(*) FILTER (WHERE role = 'manager'),
    'spectateur', COUNT(*) FILTER (WHERE role = 'spectateur')
  )
  INTO v_staff_counts
  FROM team_members WHERE team_id = v_team_id;

  RETURN jsonb_build_object(
    'id',           v_team_id,
    'team_name',    v_team_name,
    'logo_url',     v_logo_url,
    'players',      COALESCE(v_players, '[]'::JSONB),
    'staff_counts', COALESCE(v_staff_counts, '{"coach":0,"analyst":0,"manager":0,"spectateur":0}'::JSONB)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_preview_by_token(TEXT) TO anon, authenticated;


-- join_team_by_token : même approche TEXT + extraction UUID
DROP FUNCTION IF EXISTS public.join_team_by_token(UUID, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.join_team_by_token(
  p_token     TEXT,
  p_role      TEXT    DEFAULT 'member',
  p_position  TEXT    DEFAULT NULL,
  p_player_id UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_uuid UUID;
  v_team_id    UUID;
  v_team_name  TEXT;
  v_user_id    UUID;
BEGIN
  BEGIN
    v_token_uuid := (regexp_match(p_token,
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i'))[1]::UUID;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END;
  IF v_token_uuid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non connecté');
  END IF;

  SELECT id, team_name INTO v_team_id, v_team_name
  FROM teams WHERE invite_token = v_token_uuid;
  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien invalide');
  END IF;

  IF p_player_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id AND team_id = v_team_id) THEN
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

GRANT EXECUTE ON FUNCTION public.join_team_by_token(TEXT, TEXT, TEXT, UUID) TO authenticated;
