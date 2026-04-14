-- Plans feature — dossiers et fichiers de plans tactiques
-- À appliquer dans l'éditeur SQL Supabase

CREATE TABLE IF NOT EXISTS plan_folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id   UUID NOT NULL REFERENCES plan_folders(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  canvas_data JSONB NOT NULL DEFAULT '{"tokens":[],"wards":[],"drawings":[]}',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE plan_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_files   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_folders_select" ON plan_folders FOR SELECT
  USING (user_has_team_access(team_id));
CREATE POLICY "plans_folders_insert" ON plan_folders FOR INSERT
  WITH CHECK (user_has_team_access(team_id));
CREATE POLICY "plans_folders_update" ON plan_folders FOR UPDATE
  USING (user_has_team_access(team_id));
CREATE POLICY "plans_folders_delete" ON plan_folders FOR DELETE
  USING (user_has_team_access(team_id));

CREATE POLICY "plans_files_select" ON plan_files FOR SELECT
  USING (user_has_team_access(team_id));
CREATE POLICY "plans_files_insert" ON plan_files FOR INSERT
  WITH CHECK (user_has_team_access(team_id));
CREATE POLICY "plans_files_update" ON plan_files FOR UPDATE
  USING (user_has_team_access(team_id));
CREATE POLICY "plans_files_delete" ON plan_files FOR DELETE
  USING (user_has_team_access(team_id));
