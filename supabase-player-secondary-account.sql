-- Ajouter le compte secondaire optionnel à la table players
-- Le compte principal = celui le plus haut en LP (pseudo ou secondary_account)
-- IMPORTANT: À exécuter dans Supabase SQL Editor pour que le bouton Enregistrer fonctionne avec le compte secondaire

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS secondary_account TEXT;

COMMENT ON COLUMN players.secondary_account IS 'Compte secondaire optionnel du joueur. Le compte le plus haut en LP devient le compte principal (pseudo).';
