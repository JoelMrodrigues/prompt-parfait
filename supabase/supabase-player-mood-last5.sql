-- Mood des 5 dernières parties (Solo Q et Team) — mis à jour par l’auto-sync
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS soloq_mood_last_5 jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS team_mood_last_5 jsonb DEFAULT NULL;

COMMENT ON COLUMN players.soloq_mood_last_5 IS '5 dernières Solo Q: { wins, losses, kda, count } (mis à jour par auto-sync)';
COMMENT ON COLUMN players.team_mood_last_5 IS '5 dernières Team: { wins, losses, kda, count } (mis à jour par auto-sync)';
