-- Ajoute les colonnes objectif LP à la table teams
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS lp_goal INTEGER,
  ADD COLUMN IF NOT EXISTS lp_goal_deadline DATE;
