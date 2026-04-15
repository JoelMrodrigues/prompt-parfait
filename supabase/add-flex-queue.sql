-- Migration : support queue flex
-- À appliquer dans le SQL Editor de Supabase

-- 1) Type de queue sur les matchs soloq (extensible : soloq, flex, aram…)
ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS queue_type TEXT NOT NULL DEFAULT 'soloq';

CREATE INDEX IF NOT EXISTS idx_psm_queue_type ON player_soloq_matches (player_id, queue_type);

-- 2) Rang flex + peak flex sur les joueurs
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS rank_flex              TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rank_flex_updated_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS peak_rank_flex_s16     TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS peak_lp_flex_s16       INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS soloq_total_match_ids_flex INTEGER DEFAULT NULL;

COMMENT ON COLUMN player_soloq_matches.queue_type       IS 'soloq | flex | aram';
COMMENT ON COLUMN players.rank_flex                     IS 'Rang Flex queue actuel (RANKED_FLEX_SR)';
COMMENT ON COLUMN players.peak_rank_flex_s16            IS 'Peak rang Flex saison 16';
COMMENT ON COLUMN players.peak_lp_flex_s16              IS 'Peak LP Flex saison 16';
COMMENT ON COLUMN players.soloq_total_match_ids_flex    IS 'Total parties Flex S16 (source Riot)';
