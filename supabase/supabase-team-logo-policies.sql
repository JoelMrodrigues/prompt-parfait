-- Policies Supabase Storage pour le bucket "team-logos"
-- À exécuter dans Supabase → SQL Editor

-- Lecture publique (déjà couverte par le bucket public, mais explicite)
CREATE POLICY "team-logos: lecture publique"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-logos');

-- Upload : seul le propriétaire de l'équipe peut uploader dans son dossier
CREATE POLICY "team-logos: upload owner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM teams WHERE user_id = auth.uid()
  )
);

-- Mise à jour (upsert) : idem
CREATE POLICY "team-logos: update owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM teams WHERE user_id = auth.uid()
  )
);

-- Suppression : idem
CREATE POLICY "team-logos: delete owner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM teams WHERE user_id = auth.uid()
  )
);
