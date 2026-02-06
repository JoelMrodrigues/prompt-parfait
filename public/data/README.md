# Données d'Exemple

Ce dossier contient des données d'exemple pour tester l'application.

## Fichiers disponibles

### `example-stats.csv`
Statistiques de champions (50 champions avec données S16)

**Colonnes** :
- Champion
- Winrate (%)
- Pickrate (%)
- Banrate (%)
- KDA (ratio)
- Games (nombre de matchs)
- Season

**Utilisation** :
1. Aller sur la page Stats
2. Cliquer "Importer CSV"
3. Sélectionner `example-stats.csv`

### `example-team-stats.json`
Statistiques d'équipe complètes

**Structure** :
```json
{
  "winrate": 65.5,
  "avg_game_duration": 32,
  "region": "EUW",
  "total_games": 42,
  "recent_matches": [...],
  "detailed": {
    "economy": {...},
    "aggression": {...},
    "objectives": {...},
    "vision": {...}
  }
}
```

**Utilisation** :
1. Aller sur la page Équipe
2. Créer une équipe
3. Scroller en bas
4. Cliquer "Importer JSON"
5. Sélectionner `example-team-stats.json`

## Créer vos propres données

### CSV Stats
Format minimal :
```csv
Champion,Winrate,Pickrate,Banrate,KDA,Games
Aatrox,51.2,8.5,12.3,2.8,1245
```

### JSON Team Stats
Format minimal :
```json
{
  "winrate": 65.5,
  "total_games": 42
}
```

## Sources de données réelles

- **gol.gg** - Stats professionnelles
- **op.gg** - Stats Solo Queue
- **u.gg** - Stats par patch
- **leagueofgraphs.com** - Statistiques diverses

## Champions

Les champions sont chargés automatiquement depuis l'API Riot Data Dragon.

Pas besoin de fichier JSON manuel !
