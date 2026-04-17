-- Corrige les logo_url stockées avec des problèmes de chemin

-- 1. Ajouter /public/ manquant
-- /storage/v1/object/team-logos/... → /storage/v1/object/public/team-logos/...
UPDATE teams
SET logo_url = REPLACE(logo_url, '/storage/v1/object/', '/storage/v1/object/public/')
WHERE logo_url LIKE '%/storage/v1/object/%'
  AND logo_url NOT LIKE '%/storage/v1/object/public/%';

-- 2. Supprimer le query param ?v=... (Supabase Storage retourne 400 avec des query params)
UPDATE teams
SET logo_url = SPLIT_PART(logo_url, '?', 1)
WHERE logo_url LIKE '%?%';
