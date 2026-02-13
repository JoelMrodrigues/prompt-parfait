-- Permettre de distinguer les games du compte 1 (principal) et compte 2 (secondaire)
-- À exécuter dans Supabase SQL Editor

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS soloq_total_match_ids_secondary INTEGER;

ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS account_source TEXT DEFAULT 'primary';

-- Les lignes existantes restent 'primary'
UPDATE player_soloq_matches SET account_source = 'primary' WHERE account_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_player_soloq_matches_account ON player_soloq_matches(player_id, account_source);

COMMENT ON COLUMN player_soloq_matches.account_source IS 'primary = pseudo principal, secondary = compte secondaire';
COMMENT ON COLUMN players.soloq_total_match_ids_secondary IS 'Total match IDs Riot pour le compte secondaire';
