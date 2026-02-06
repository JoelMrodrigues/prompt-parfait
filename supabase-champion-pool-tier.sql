-- Ajout de la colonne tier (S, A, B, C) à champion_pools
-- À exécuter dans Supabase SQL Editor avant d'utiliser la page Pool de Champions

ALTER TABLE champion_pools
  ADD COLUMN IF NOT EXISTS tier TEXT;

-- Valeur par défaut pour les données existantes
UPDATE champion_pools SET tier = 'A' WHERE tier IS NULL;

COMMENT ON COLUMN champion_pools.tier IS 'Tier du champion dans le pool (S, A, B, C)';
