-- Ajoute participant_id (1-10, Riot) pour lier aux snapshots timeline et matcher vis-à-vis par rôle
ALTER TABLE team_match_participants
  ADD COLUMN IF NOT EXISTS participant_id INTEGER;

COMMENT ON COLUMN team_match_participants.participant_id IS 'Riot participantId (1-10): 1-5 équipe 100, 6-10 équipe 200';
