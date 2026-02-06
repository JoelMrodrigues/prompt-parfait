-- Schéma pour les tables de gestion d'équipe
-- Teams, Players, Champion Pools

-- Table des équipes
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- Un utilisateur ne peut avoir qu'une seule équipe
);

-- Table des joueurs
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  position TEXT, -- TOP, JNG, MID, BOT, SUP
  player_order INTEGER, -- Ordre d'affichage (1-5)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des pools de champions par joueur
CREATE TABLE IF NOT EXISTS champion_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  champion_id TEXT NOT NULL, -- ID du champion (ex: "Aatrox", "Ahri")
  mastery_level INTEGER DEFAULT 0, -- Niveau de maîtrise (0-7)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, champion_id) -- Un joueur ne peut avoir qu'une entrée par champion
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_order ON players(team_id, player_order);
CREATE INDEX IF NOT EXISTS idx_champion_pools_player_id ON champion_pools(player_id);
CREATE INDEX IF NOT EXISTS idx_champion_pools_champion_id ON champion_pools(champion_id);

-- RLS (Row Level Security) - Les utilisateurs ne peuvent voir/modifier que leurs propres équipes
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_pools ENABLE ROW LEVEL SECURITY;

-- Policies pour teams
CREATE POLICY "Users can view their own teams"
  ON teams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
  ON teams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies pour players
CREATE POLICY "Users can view players from their teams"
  ON players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert players to their teams"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update players from their teams"
  ON players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete players from their teams"
  ON players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = players.team_id
      AND teams.user_id = auth.uid()
    )
  );

-- Policies pour champion_pools
CREATE POLICY "Users can view champion pools from their teams"
  ON champion_pools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert champion pools to their teams"
  ON champion_pools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update champion pools from their teams"
  ON champion_pools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id
      AND teams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete champion pools from their teams"
  ON champion_pools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id
      AND teams.user_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE teams IS 'Équipes créées par les utilisateurs';
COMMENT ON TABLE players IS 'Joueurs appartenant aux équipes';
COMMENT ON TABLE champion_pools IS 'Pools de champions maîtrisés par chaque joueur';
