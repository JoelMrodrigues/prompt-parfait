-- Migration : ajoute puuid_secondary pour le compte secondaire des joueurs
-- À appliquer dans l'éditeur SQL Supabase

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS puuid_secondary TEXT;

COMMENT ON COLUMN players.puuid_secondary IS 'PUUID Riot du compte secondaire — pour sync directe sans re-lookup';
