-- Équipe adverse + items pour team_match_participants
-- À exécuter après supabase-team-matches.sql

-- Colonne équipe (our = nous, enemy = adversaire)
ALTER TABLE team_match_participants
  ADD COLUMN IF NOT EXISTS team_side TEXT DEFAULT 'our';

-- Colonnes items (ID Riot)
ALTER TABLE team_match_participants
  ADD COLUMN IF NOT EXISTS item0 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item1 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item2 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item3 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item4 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item5 INTEGER DEFAULT 0;

COMMENT ON COLUMN team_match_participants.team_side IS 'our = notre équipe, enemy = équipe adverse';
