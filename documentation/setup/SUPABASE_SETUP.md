# Configuration Supabase

## 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier l'URL et la clé anonyme dans `.env`

## 2. Structure de la base de données

### Tables à créer

#### `teams`
```sql
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_teams_user_id ON teams(user_id);

-- RLS (Row Level Security)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teams" ON teams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams" ON teams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams" ON teams
  FOR DELETE USING (auth.uid() = user_id);
```

#### `players`
```sql
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Top', 'Jungle', 'Mid', 'ADC', 'Support')),
  player_order INTEGER NOT NULL CHECK (player_order >= 1 AND player_order <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, player_order)
);

-- Index
CREATE INDEX idx_players_team_id ON players(team_id);

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view players of own teams" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create players for own teams" ON players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update players of own teams" ON players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete players of own teams" ON players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
    )
  );
```

#### `champion_pools`
```sql
CREATE TABLE champion_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players ON DELETE CASCADE NOT NULL,
  champion_id VARCHAR(50) NOT NULL,
  mastery_level VARCHAR(20) NOT NULL CHECK (mastery_level IN ('Comfortable', 'Main', 'Pocket')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, champion_id)
);

-- Index
CREATE INDEX idx_champion_pools_player_id ON champion_pools(player_id);

-- RLS
ALTER TABLE champion_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view champion pools of own teams" ON champion_pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create champion pools for own teams" ON champion_pools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update champion pools of own teams" ON champion_pools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete champion pools of own teams" ON champion_pools
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE players.id = champion_pools.player_id AND teams.user_id = auth.uid()
    )
  );
```

#### `team_stats`
```sql
CREATE TABLE team_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams ON DELETE CASCADE NOT NULL UNIQUE,
  json_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_team_stats_team_id ON team_stats(team_id);

-- RLS
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stats of own teams" ON team_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = team_stats.team_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create stats for own teams" ON team_stats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = team_stats.team_id AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stats of own teams" ON team_stats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = team_stats.team_id AND teams.user_id = auth.uid()
    )
  );
```

## 3. Configuration Auth

L'authentification est déjà configurée par défaut dans Supabase.

Pour activer l'inscription par email:
1. Aller dans Authentication > Settings
2. Activer "Enable email confirmations" (optionnel)
3. Configurer les redirections si nécessaire

## 4. Storage (optionnel pour avatars joueurs)

Si vous voulez ajouter des avatars de joueurs :

```sql
-- Créer un bucket public
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Policy pour upload
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Notes importantes

- Toutes les tables utilisent RLS (Row Level Security) pour la sécurité
- Les utilisateurs peuvent seulement voir/modifier leurs propres données
- Les suppressions en cascade sont activées (DELETE CASCADE)
- Les contraintes CHECK assurent l'intégrité des données
