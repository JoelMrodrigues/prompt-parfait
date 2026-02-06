-- Schema pour les matchs d'équipe (Exalty/Riot JSON)
-- À exécuter dans Supabase SQL Editor

-- Table des matchs
CREATE TABLE IF NOT EXISTS team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_id BIGINT NOT NULL,
  game_creation BIGINT,
  game_duration INTEGER,
  game_mode TEXT,
  game_type TEXT,
  our_team_id INTEGER,
  our_win BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, game_id)
);

-- Table des participants par match (stats par joueur)
CREATE TABLE IF NOT EXISTS team_match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES team_matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  pseudo TEXT,
  champion_id INTEGER,
  champion_name TEXT,
  role TEXT,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  kda NUMERIC(6,2),
  total_damage_dealt_to_champions INTEGER DEFAULT 0,
  gold_earned INTEGER DEFAULT 0,
  cs INTEGER DEFAULT 0,
  win BOOLEAN DEFAULT false,
  vision_score INTEGER DEFAULT 0,
  vision_wards_bought INTEGER DEFAULT 0,
  wards_placed INTEGER DEFAULT 0,
  wards_killed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_matches_team_id ON team_matches(team_id);
CREATE INDEX IF NOT EXISTS idx_team_matches_game_id ON team_matches(game_id);
CREATE INDEX IF NOT EXISTS idx_team_match_participants_match_id ON team_match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_team_match_participants_player_id ON team_match_participants(player_id);

-- RLS
ALTER TABLE team_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_match_participants ENABLE ROW LEVEL SECURITY;

-- Policies (à adapter selon votre auth)
CREATE POLICY "Users can manage their team matches"
  ON team_matches FOR ALL
  USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their team match participants"
  ON team_match_participants FOR ALL
  USING (
    match_id IN (
      SELECT id FROM team_matches
      WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    )
  );
