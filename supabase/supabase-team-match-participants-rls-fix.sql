-- Fix RLS pour permettre l'INSERT sur team_match_participants
-- À exécuter dans Supabase SQL Editor si l'import renvoie 400

DROP POLICY IF EXISTS "Users can manage their team match participants" ON team_match_participants;

CREATE POLICY "Users can manage their team match participants"
  ON team_match_participants FOR ALL
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
