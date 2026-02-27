-- Table des runes LoL (Data Dragon runesReforged.json)
-- À exécuter dans Supabase SQL Editor.
-- On y stocke l'id de la rune + son icône + infos de base.

CREATE TABLE IF NOT EXISTS lol_runes (
  id INTEGER PRIMARY KEY,                  -- id numérique de la rune (ex. 8112)
  tree_id INTEGER,                         -- id de l'arbre (ex. 8100 Domination)
  tree_key TEXT,                           -- clé interne de l'arbre (ex. "Domination")
  tree_name TEXT,                          -- nom affiché de l'arbre
  slot_index INTEGER,                      -- index du slot dans l'arbre (0,1,2,3)
  key TEXT,                                -- clé interne de la rune (ex. "Electrocute")
  name TEXT,                               -- nom affiché (ex. "Électrocution")
  icon TEXT,                               -- chemin d'icône Data Dragon (ex. "perk-images/Styles/...")
  short_desc TEXT,                         -- description courte (HTML)
  long_desc TEXT,                          -- description longue (HTML)
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE lol_runes IS 'Table de référence des runes (Data Dragon runesReforged.json).';
COMMENT ON COLUMN lol_runes.icon IS 'Chemin relatif Data Dragon (à préfixer avec https://ddragon.leagueoflegends.com/cdn/img/).';

