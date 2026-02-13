-- Supprimer toutes les parties Solo Q antérieures au 8 janvier 2026 (début saison 16)
-- À exécuter dans Supabase SQL Editor
-- game_creation est en millisecondes (epoch) — 1767830400000 = 8 janv. 2026 00:00 UTC

DELETE FROM player_soloq_matches
WHERE game_creation < 1767830400000;
