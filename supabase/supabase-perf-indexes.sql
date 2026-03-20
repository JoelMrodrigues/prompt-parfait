-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE — Index manquants + RPC pour éviter les double round-trips
-- À appliquer dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Index sur team_matches (filtre + tri des listes)
CREATE INDEX IF NOT EXISTS idx_team_matches_team_id_creation
  ON team_matches(team_id, game_creation DESC);

-- 2. Index sur team_match_participants (jointure match)
CREATE INDEX IF NOT EXISTS idx_team_match_participants_match_id
  ON team_match_participants(match_id);

-- 3. Index sur team_members (lookup user)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON team_members(user_id);

-- 4. Index sur players (lookup team)
CREATE INDEX IF NOT EXISTS idx_players_team_id
  ON players(team_id);

-- 5. Index sur team_match_blocks (lookup team)
CREATE INDEX IF NOT EXISTS idx_team_match_blocks_team_id
  ON team_match_blocks(team_id, played_at DESC);

-- 6. Index sur player_soloq_matches (lookup player + tri)
CREATE INDEX IF NOT EXISTS idx_player_soloq_matches_player_id
  ON player_soloq_matches(player_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC : get_team_matches_list
-- Un seul round-trip, SECURITY DEFINER bypass RLS row-by-row overhead
-- Remplace les 2 requêtes séquentielles de fetchTeamMatchesList
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_team_matches_list(p_team_id UUID, p_limit INT DEFAULT 200)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent_matches AS (
    SELECT id, game_id, team_id, game_creation, game_duration,
           our_win, our_team_id, match_type, block_id
    FROM team_matches
    WHERE team_id = p_team_id
    ORDER BY game_creation DESC
    LIMIT p_limit
  ),
  participants_agg AS (
    SELECT
      p.match_id,
      json_agg(json_build_object(
        'id',            p.id,
        'match_id',      p.match_id,
        'player_id',     p.player_id,
        'champion_name', p.champion_name,
        'role',          p.role,
        'team_side',     p.team_side,
        'win',           p.win,
        'kills',         p.kills,
        'deaths',        p.deaths,
        'assists',       p.assists
      )) AS participants
    FROM team_match_participants p
    INNER JOIN recent_matches rm ON p.match_id = rm.id
    GROUP BY p.match_id
  )
  SELECT json_build_object(
    'matches', COALESCE(
      json_agg(
        json_build_object(
          'id',              m.id,
          'game_id',         m.game_id,
          'team_id',         m.team_id,
          'game_creation',   m.game_creation,
          'game_duration',   m.game_duration,
          'our_win',         m.our_win,
          'our_team_id',     m.our_team_id,
          'match_type',      m.match_type,
          'block_id',        m.block_id,
          'team_match_participants', COALESCE(pa.participants, '[]'::json)
        )
        ORDER BY m.game_creation DESC
      ),
      '[]'::json
    )
  )
  FROM recent_matches m
  LEFT JOIN participants_agg pa ON pa.match_id = m.id;
$$;

-- Autorisation d'exécution pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_team_matches_list(UUID, INT) TO authenticated;
