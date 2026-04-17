-- Corrige les logo_url stockées sans /public/ dans le chemin
-- Cause : ancienne URL obtenue hors getPublicUrl() → format privé au lieu de public
-- /storage/v1/object/team-logos/... → /storage/v1/object/public/team-logos/...

UPDATE teams
SET logo_url = REPLACE(logo_url, '/storage/v1/object/', '/storage/v1/object/public/')
WHERE logo_url LIKE '%/storage/v1/object/%'
  AND logo_url NOT LIKE '%/storage/v1/object/public/%';
