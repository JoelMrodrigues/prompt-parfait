-- Fonction SECURITY DEFINER : copie les matchs soloq/flex/aram d'un autre joueur
-- partageant le même PUUID vers p_target_player_id, en ignorant la RLS.
--
-- Justification : les données soloq/flex/aram sont publiques (accessibles via l'API Riot
-- sans authentification). Seules les stats de match d'équipe (team_matches) restent privées.
-- Cette fonction est scopée à player_soloq_matches uniquement.
--
-- À appliquer dans l'éditeur SQL Supabase.

CREATE OR REPLACE FUNCTION bootstrap_soloq_from_puuid(
  p_target_player_id UUID,
  p_puuid            TEXT,
  p_account_source   TEXT,
  p_season_start     BIGINT,
  p_queue_type       TEXT    DEFAULT NULL,
  p_puuid_field      TEXT    DEFAULT 'puuid'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_player_id UUID;
  v_inserted         INTEGER;
BEGIN
  -- Trouver le joueur source avec le même PUUID (RLS ignorée — données publiques Riot)
  IF p_puuid_field = 'puuid_secondary' THEN
    SELECT id INTO v_source_player_id
    FROM players
    WHERE puuid_secondary = p_puuid
      AND id != p_target_player_id
    LIMIT 1;
  ELSE
    SELECT id INTO v_source_player_id
    FROM players
    WHERE puuid = p_puuid
      AND id != p_target_player_id
    LIMIT 1;
  END IF;

  IF v_source_player_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Copier les matchs en une seule requête, sans match_json ni timeline_json
  -- (trop volumineux — le ré-enrichissement les récupère au cycle suivant)
  INSERT INTO player_soloq_matches (
    player_id, riot_match_id, account_source, queue_type,
    champion_id, champion_name, opponent_champion, individual_position,
    win, kills, deaths, assists, game_duration, game_creation,
    total_damage, cs, vision_score, gold_earned, items, runes
  )
  SELECT
    p_target_player_id, riot_match_id, account_source, queue_type,
    champion_id, champion_name, opponent_champion, individual_position,
    win, kills, deaths, assists, game_duration, game_creation,
    total_damage, cs, vision_score, gold_earned, items, runes
  FROM player_soloq_matches
  WHERE player_id = v_source_player_id
    AND account_source = p_account_source
    AND game_creation >= p_season_start
    AND (p_queue_type IS NULL OR queue_type = p_queue_type)
  ON CONFLICT (player_id, riot_match_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
