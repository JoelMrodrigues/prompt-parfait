-- Migration : peak elo saison 16 pour le compte secondaire
-- À appliquer dans le SQL Editor de Supabase

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS peak_lp_s16_secondary   integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS peak_rank_s16_secondary  text    DEFAULT NULL;
