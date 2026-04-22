-- ─────────────────────────────────────────────────────────────────────────────
-- V1 Security & Performance fixes — sprint immédiat
-- À appliquer dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Index manquants ──────────────────────────────────────────────────────────

-- Composite index sur player_soloq_matches : filtre + tri le plus fréquent
-- (player_id déjà indexé seul mais le composite évite un tri supplémentaire)
CREATE INDEX IF NOT EXISTS idx_psm_player_game_creation
  ON player_soloq_matches (player_id, game_creation DESC);

-- Index sur team_match_participants.player_id (jointure stat joueur)
CREATE INDEX IF NOT EXISTS idx_tmp_player_id
  ON team_match_participants (player_id);

-- ── RLS sur lol_runes ────────────────────────────────────────────────────────

ALTER TABLE lol_runes ENABLE ROW LEVEL SECURITY;

-- Lecture publique (données de référence statiques)
CREATE POLICY "lol_runes_select_public"
  ON lol_runes FOR SELECT
  USING (true);

-- Écriture réservée au service role (via import-dragon-runes uniquement)
-- Pas de policy INSERT/UPDATE/DELETE pour authenticated → accès refusé par défaut
