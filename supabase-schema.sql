-- Table pour les statistiques professionnelles
-- Cette table stocke les données des CSV de toutes les saisons (S10-S16)

CREATE TABLE IF NOT EXISTS pro_stats (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identifiants du match
  gameid TEXT NOT NULL,
  datacompleteness TEXT,
  url TEXT,
  league TEXT,
  year INTEGER,
  split TEXT,
  playoffs INTEGER,
  date TIMESTAMP,
  game INTEGER,
  patch TEXT,
  
  -- Joueur et équipe
  participantid INTEGER,
  side TEXT,
  position TEXT,
  playername TEXT,
  playerid TEXT,
  teamname TEXT,
  teamid TEXT,
  
  -- Draft
  firstPick INTEGER,
  champion TEXT,
  ban1 TEXT,
  ban2 TEXT,
  ban3 TEXT,
  ban4 TEXT,
  ban5 TEXT,
  pick1 TEXT,
  pick2 TEXT,
  pick3 TEXT,
  pick4 TEXT,
  pick5 TEXT,
  
  -- Stats de base
  gamelength INTEGER,
  result INTEGER,
  kills INTEGER,
  deaths INTEGER,
  assists INTEGER,
  teamkills INTEGER,
  teamdeaths INTEGER,
  doublekills INTEGER,
  triplekills INTEGER,
  quadrakills INTEGER,
  pentakills INTEGER,
  firstblood INTEGER,
  firstbloodkill INTEGER,
  firstbloodassist INTEGER,
  firstbloodvictim INTEGER,
  
  -- Objectifs
  team_kpm DECIMAL,
  ckpm DECIMAL,
  firstdragon INTEGER,
  dragons INTEGER,
  opp_dragons INTEGER,
  elementaldrakes INTEGER,
  opp_elementaldrakes INTEGER,
  infernals INTEGER,
  mountains INTEGER,
  clouds INTEGER,
  oceans INTEGER,
  chemtechs INTEGER,
  hextechs INTEGER,
  dragons_type_unknown INTEGER,
  elders INTEGER,
  opp_elders INTEGER,
  firstherald INTEGER,
  heralds INTEGER,
  opp_heralds INTEGER,
  void_grubs INTEGER,
  opp_void_grubs INTEGER,
  firstbaron INTEGER,
  barons INTEGER,
  opp_barons INTEGER,
  atakhans INTEGER,
  opp_atakhans INTEGER,
  firsttower INTEGER,
  towers INTEGER,
  opp_towers INTEGER,
  firstmidtower INTEGER,
  firsttothreetowers INTEGER,
  turretplates INTEGER,
  opp_turretplates INTEGER,
  inhibitors INTEGER,
  opp_inhibitors INTEGER,
  
  -- Dégâts
  damagetochampions INTEGER,
  dpm DECIMAL,
  damageshare DECIMAL,
  damagetakenperminute DECIMAL,
  damagemitigatedperminute DECIMAL,
  damagetotowers INTEGER,
  
  -- Vision
  wardsplaced INTEGER,
  wpm DECIMAL,
  wardskilled INTEGER,
  wcpm DECIMAL,
  controlwardsbought INTEGER,
  visionscore INTEGER,
  vspm DECIMAL,
  
  -- Gold
  totalgold INTEGER,
  earnedgold INTEGER,
  earned_gpm DECIMAL,
  earnedgoldshare DECIMAL,
  goldspent INTEGER,
  gspd DECIMAL,
  gpr DECIMAL,
  
  -- CS
  total_cs INTEGER,
  minionkills INTEGER,
  monsterkills INTEGER,
  monsterkillsownjungle INTEGER,
  monsterkillsenemyjungle INTEGER,
  cspm DECIMAL,
  
  -- Stats à 10 min
  goldat10 INTEGER,
  xpat10 INTEGER,
  csat10 INTEGER,
  opp_goldat10 INTEGER,
  opp_xpat10 INTEGER,
  opp_csat10 INTEGER,
  golddiffat10 DECIMAL,
  xpdiffat10 DECIMAL,
  csdiffat10 DECIMAL,
  killsat10 INTEGER,
  assistsat10 INTEGER,
  deathsat10 INTEGER,
  opp_killsat10 INTEGER,
  opp_assistsat10 INTEGER,
  opp_deathsat10 INTEGER,
  
  -- Stats à 15 min
  goldat15 INTEGER,
  xpat15 INTEGER,
  csat15 INTEGER,
  opp_goldat15 INTEGER,
  opp_xpat15 INTEGER,
  opp_csat15 INTEGER,
  golddiffat15 DECIMAL,
  xpdiffat15 DECIMAL,
  csdiffat15 DECIMAL,
  killsat15 INTEGER,
  assistsat15 INTEGER,
  deathsat15 INTEGER,
  opp_killsat15 INTEGER,
  opp_assistsat15 INTEGER,
  opp_deathsat15 INTEGER,
  
  -- Stats à 20 min
  goldat20 INTEGER,
  xpat20 INTEGER,
  csat20 INTEGER,
  opp_goldat20 INTEGER,
  opp_xpat20 INTEGER,
  opp_csat20 INTEGER,
  golddiffat20 DECIMAL,
  xpdiffat20 DECIMAL,
  csdiffat20 DECIMAL,
  killsat20 INTEGER,
  assistsat20 INTEGER,
  deathsat20 INTEGER,
  opp_killsat20 INTEGER,
  opp_assistsat20 INTEGER,
  opp_deathsat20 INTEGER,
  
  -- Stats à 25 min
  goldat25 INTEGER,
  xpat25 INTEGER,
  csat25 INTEGER,
  opp_goldat25 INTEGER,
  opp_xpat25 INTEGER,
  opp_csat25 INTEGER,
  golddiffat25 DECIMAL,
  xpdiffat25 DECIMAL,
  csdiffat25 DECIMAL,
  killsat25 INTEGER,
  assistsat25 INTEGER,
  deathsat25 INTEGER,
  opp_killsat25 INTEGER,
  opp_assistsat25 INTEGER,
  opp_deathsat25 INTEGER,
  
  -- Métadonnées
  season TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_pro_stats_playername ON pro_stats(playername);
CREATE INDEX IF NOT EXISTS idx_pro_stats_champion ON pro_stats(champion);
CREATE INDEX IF NOT EXISTS idx_pro_stats_league ON pro_stats(league);
CREATE INDEX IF NOT EXISTS idx_pro_stats_year ON pro_stats(year);
CREATE INDEX IF NOT EXISTS idx_pro_stats_season ON pro_stats(season);
CREATE INDEX IF NOT EXISTS idx_pro_stats_teamname ON pro_stats(teamname);
CREATE INDEX IF NOT EXISTS idx_pro_stats_position ON pro_stats(position);
CREATE INDEX IF NOT EXISTS idx_pro_stats_date ON pro_stats(date);

-- RLS (Row Level Security) - Lecture publique
ALTER TABLE pro_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON pro_stats
  FOR SELECT
  TO public
  USING (true);

-- Commentaire
COMMENT ON TABLE pro_stats IS 'Statistiques professionnelles League of Legends (S10-S16)';
