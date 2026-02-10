-- Snapshots timeline par match (or / XP à 5, 10, 15, 20, 25 min)
-- À exécuter après supabase-team-matches.sql

CREATE TABLE IF NOT EXISTS team_match_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES team_matches(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id)
);

-- snapshot: { "5": { "gold_100": 12000, "gold_200": 11500, "xp_100": 5000, "xp_200": 4800 }, "10": { ... }, "15": { ... }, "20": { ... }, "25": { ... } }

CREATE INDEX IF NOT EXISTS idx_team_match_timeline_match_id ON team_match_timeline(match_id);

ALTER TABLE team_match_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their team match timelines"
  ON team_match_timeline FOR ALL
  USING (
    match_id IN (
      SELECT id FROM team_matches
      WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    match_id IN (
      SELECT id FROM team_matches
      WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    )
  );
