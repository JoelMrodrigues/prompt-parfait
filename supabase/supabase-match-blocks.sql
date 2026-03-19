-- ============================================================
-- Match Blocks — regroupement de parties en sessions de scrim
-- Ajouter via Supabase SQL Editor
-- ============================================================

-- 1. Table principale des blocs
CREATE TABLE IF NOT EXISTS team_match_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  block_type    TEXT NOT NULL DEFAULT 'scrim',  -- 'scrim' | 'tournament' | 'other'
  opponent_name TEXT,
  format        TEXT NOT NULL DEFAULT 'bo3',    -- 'bo1' | 'bo3' | 'bo5' | 'custom'
  game_count    INTEGER,                        -- seulement si format = 'custom'
  notes         TEXT,
  played_at     TIMESTAMPTZ,                    -- horodatage de début (pour tri)
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_match_blocks_team_id
  ON team_match_blocks(team_id);

-- 2. Colonne FK sur team_matches (nullable → parties non groupées)
ALTER TABLE team_matches
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES team_match_blocks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_matches_block_id
  ON team_matches(block_id);

-- 3. RLS — réutilise la fonction existante user_has_team_access
ALTER TABLE team_match_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their team match blocks"
  ON team_match_blocks FOR ALL TO authenticated
  USING  (user_has_team_access(team_id))
  WITH CHECK (user_has_team_access(team_id));
