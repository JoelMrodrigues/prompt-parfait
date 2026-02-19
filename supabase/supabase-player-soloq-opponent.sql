-- Ajouter la colonne adversaire (même lane, équipe opposée) pour les match-ups Solo Q
-- Remplie lors du sync quand on récupère le détail du match (1 requête = 5v5 complet)

ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS opponent_champion TEXT;

COMMENT ON COLUMN player_soloq_matches.opponent_champion IS 'Champion adverse (même lane) pour les stats match-up Solo Q';
