-- Corriger les participants déjà importés avec Aurora (champion_id 893)
-- à afficher comme "Aurora" au lieu de "Unknown_893"
-- À exécuter dans le SQL Editor Supabase (Table Editor > team_match_participants ou SQL Editor)

UPDATE team_match_participants
SET champion_name = 'Aurora'
WHERE champion_id = 893
   OR champion_name = 'Unknown_893';
