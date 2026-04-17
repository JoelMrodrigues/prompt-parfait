-- Ajoute individual_position à player_soloq_matches
-- Stocke le rôle Riot (TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY) par partie

ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS individual_position TEXT;

-- Backfill depuis match_json (contient le participant Riot complet)
-- teamPosition est plus fiable que individualPosition selon la doc Riot
UPDATE player_soloq_matches
SET individual_position = COALESCE(
  NULLIF(match_json->>'teamPosition', ''),
  NULLIF(match_json->>'individualPosition', '')
)
WHERE individual_position IS NULL
  AND match_json IS NOT NULL;
