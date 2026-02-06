-- Script pour ajouter les colonnes manquantes à la table players
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes si elles n'existent pas déjà
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS pseudo TEXT,
  ADD COLUMN IF NOT EXISTS opgg_link TEXT,
  ADD COLUMN IF NOT EXISTS lolpro_link TEXT,
  ADD COLUMN IF NOT EXISTS rank TEXT,
  ADD COLUMN IF NOT EXISTS top_champions JSONB DEFAULT '[]'::jsonb;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN players.pseudo IS 'Pseudo/Summoner name du joueur';
COMMENT ON COLUMN players.opgg_link IS 'Lien OP.gg vers le profil du joueur';
COMMENT ON COLUMN players.lolpro_link IS 'Lien Lol Pro vers le profil du joueur (facultatif)';
COMMENT ON COLUMN players.rank IS 'Rang actuel du joueur (ex: Diamond II)';
COMMENT ON COLUMN players.top_champions IS 'Top 5 champions du joueur en JSON (ex: [{"name": "Ahri", "winrate": 65}])';