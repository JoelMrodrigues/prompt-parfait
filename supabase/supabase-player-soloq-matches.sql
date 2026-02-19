-- Historique Solo Q par joueur (sauvegardé pour limiter les appels API Riot)
-- Une fois une game enregistrée, on la lit depuis la base au lieu de rappeler Riot.

CREATE TABLE IF NOT EXISTS player_soloq_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  riot_match_id TEXT NOT NULL,
  champion_id INTEGER,
  champion_name TEXT,
  win BOOLEAN NOT NULL DEFAULT false,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  game_duration INTEGER NOT NULL DEFAULT 0,
  game_creation BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, riot_match_id)
);

CREATE INDEX IF NOT EXISTS idx_player_soloq_matches_player_id ON player_soloq_matches(player_id);
CREATE INDEX IF NOT EXISTS idx_player_soloq_matches_game_creation ON player_soloq_matches(player_id, game_creation DESC);

COMMENT ON TABLE player_soloq_matches IS 'Historique des parties ranked Solo Q par joueur (source: API Riot, sauvegardé pour éviter les appels répétés)';

-- RLS : même logique que players (accès via équipe de l'utilisateur)
ALTER TABLE player_soloq_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view soloq matches from their team players"
  ON player_soloq_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = player_soloq_matches.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert soloq matches for their team players"
  ON player_soloq_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = player_soloq_matches.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update soloq matches for their team players"
  ON player_soloq_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = player_soloq_matches.player_id
      AND teams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = player_soloq_matches.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete soloq matches for their team players"
  ON player_soloq_matches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = player_soloq_matches.player_id
      AND teams.user_id = auth.uid()
    )
  );
