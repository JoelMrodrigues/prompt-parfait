-- Objectifs par équipe (dragons, baron, herald, tours, grubs, first tower, etc.)
-- À exécuter dans Supabase SQL Editor

ALTER TABLE team_matches
ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT NULL;

COMMENT ON COLUMN team_matches.objectives IS 'Objectifs par teamId: { "100": { dragonKills, baronKills, riftHeraldKills, towerKills, inhibitorKills, hordeKills, firstBaron, firstBlood, firstDragon, firstInhibitor, firstTower }, "200": { ... } }';
