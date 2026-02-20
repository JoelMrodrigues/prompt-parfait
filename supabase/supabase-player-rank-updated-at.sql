-- Dernière mise à jour du rang Solo Q (affichée dans le header fiche joueur)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN players.rank_updated_at IS 'Date/heure de la dernière mise à jour du rang Solo Q (sync Riot)';
