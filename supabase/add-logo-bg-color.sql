-- Ajoute la colonne logo_bg_color sur la table teams
-- À exécuter dans le SQL Editor Supabase

ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_bg_color TEXT;
