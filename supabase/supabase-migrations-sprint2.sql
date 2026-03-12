-- ============================================================
-- Migrations Sprint 2 — À exécuter dans Supabase SQL Editor
-- Safe : utilise IF NOT EXISTS partout
-- ============================================================

-- 1. player_type : distingue Titulaire ('starter') et Sub ('sub')
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS player_type TEXT DEFAULT 'starter';

-- 2. puuid : identifiant Riot pour sync directe sans passer par le compte
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS puuid TEXT;

-- 3. accent_color : couleur d'accentuation choisie dans TeamEditModal
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- 4. team_type : type d'équipe (scrim, soloq, flex, fun)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'scrim';

-- 5. player_soloq_matches — colonnes enrichies (backend Riot)
ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS total_damage   INTEGER,
  ADD COLUMN IF NOT EXISTS cs             INTEGER,
  ADD COLUMN IF NOT EXISTS vision_score   INTEGER,
  ADD COLUMN IF NOT EXISTS gold_earned    INTEGER,
  ADD COLUMN IF NOT EXISTS items         JSONB,
  ADD COLUMN IF NOT EXISTS runes         JSONB,
  ADD COLUMN IF NOT EXISTS match_json    JSONB;

-- 6. player_soloq_matches — timeline SoloQ (optionnel, pour graphes avancés)
ALTER TABLE player_soloq_matches
  ADD COLUMN IF NOT EXISTS timeline_json JSONB;

-- ============================================================
-- Commentaires pour la doc
-- ============================================================
COMMENT ON COLUMN players.player_type     IS 'starter = titulaire | sub = remplaçant potentiel';
COMMENT ON COLUMN players.puuid           IS 'PUUID Riot — pour sync directe via Riot API';
COMMENT ON COLUMN teams.accent_color      IS 'Couleur accent RGB ex: "99 102 241" — choisie dans les paramètres équipe';
COMMENT ON COLUMN teams.team_type         IS 'Type : scrim | soloq | flex | fun';
COMMENT ON COLUMN player_soloq_matches.total_damage  IS 'Dégâts totaux infligés aux champions';
COMMENT ON COLUMN player_soloq_matches.cs            IS 'CS (creep score) total';
COMMENT ON COLUMN player_soloq_matches.vision_score  IS 'Score de vision';
COMMENT ON COLUMN player_soloq_matches.gold_earned   IS 'Or total gagné';
COMMENT ON COLUMN player_soloq_matches.items         IS 'Items finaux [id, id, ...] ou [{id, name, ...}]';
COMMENT ON COLUMN player_soloq_matches.runes         IS 'Runes choisies — structure Data Dragon';
COMMENT ON COLUMN player_soloq_matches.match_json    IS 'JSON complet du match depuis Riot API (enrichissement backend)';
COMMENT ON COLUMN player_soloq_matches.timeline_json IS 'JSON timeline du match depuis Riot API';
