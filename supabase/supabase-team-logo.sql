-- Ajouter la colonne logo_url à la table teams
-- Permet de stocker l'URL du logo de l'équipe (uploadé via Supabase Storage)

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN teams.logo_url IS 'URL publique du logo de l''équipe (Supabase Storage bucket: team-logos)';

-- ─── Supabase Storage ─────────────────────────────────────────────────────────
-- IMPORTANT : créer manuellement le bucket dans le dashboard Supabase :
--   Storage > New bucket > Name: "team-logos" > Public: true
--
-- Structure des fichiers dans le bucket :
--   {team_id}/logo.{ext}   (ex: abc123.../logo.jpg)
--
-- Les fichiers sont publics (lecture) mais l'upload est géré côté client
-- avec les credentials Supabase de l'utilisateur authentifié.
--
-- Policy Storage recommandée (à appliquer dans Storage > Policies) :
--   INSERT / UPDATE : auth.uid() IN (SELECT user_id FROM teams WHERE id = (storage.foldername(name))[1]::uuid)
--   SELECT : true (public)
