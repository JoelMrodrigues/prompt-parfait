-- Ajoute la colonne rank_secondary sur la table players
-- À exécuter dans le SQL Editor Supabase

ALTER TABLE players ADD COLUMN IF NOT EXISTS rank_secondary TEXT;
