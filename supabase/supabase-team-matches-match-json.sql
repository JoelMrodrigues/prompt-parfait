-- Stocke l'intégralité du JSON de match (Exalty/Riot) pour avoir toutes les stats disponibles.
-- À exécuter dans Supabase SQL Editor.
ALTER TABLE team_matches
  ADD COLUMN IF NOT EXISTS match_json JSONB;

COMMENT ON COLUMN team_matches.match_json IS 'JSON brut du match (participants, participantIdentities, stats complètes).';
