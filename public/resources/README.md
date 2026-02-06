# 📁 Dossier Resources

Ce dossier contient toutes les ressources statiques du projet.

## 📂 Structure

```
public/resources/
├── champions/       # Fichiers JSON des champions
├── images/          # Images et assets visuels
└── data/            # Autres données (configs, mappings, etc.)
```

---

## 🎮 Champions (`champions/`)

### Fichiers à ajouter ici :

#### `champions.json` (optionnel)
Si tu veux utiliser un fichier JSON local au lieu de l'API Riot :

```json
{
  "champions": [
    {
      "id": "Aatrox",
      "name": "Aatrox",
      "roles": ["Top", "Jungle"],
      "image": "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Aatrox.png"
    }
  ]
}
```

**Note** : Actuellement, l'app utilise l'API Riot Data Dragon (pas besoin de fichier local).

---

## 🖼️ Images (`images/`)

### Fichiers suggérés :

- **Icônes de rôles** : `top.png`, `jungle.png`, `mid.png`, `adc.png`, `support.png`
- **Logos d'équipes** : Pour la page Équipe
- **Bannières** : Pour la page d'accueil
- **Avatars** : Placeholder pour les joueurs

### Formats recommandés :
- PNG (avec transparence)
- WebP (meilleure compression)
- SVG (pour les icônes)

---

## 📊 Data (`data/`)

### Fichiers à ajouter :

#### `role-mapping.json` (optionnel)
Mapping personnalisé des tags Riot vers les rôles :

```json
{
  "Fighter": ["Top", "Jungle"],
  "Tank": ["Top", "Jungle", "Support"],
  "Mage": ["Mid", "Support"],
  "Assassin": ["Mid", "Jungle"],
  "Marksman": ["ADC"],
  "Support": ["Support"]
}
```

#### `team-stats-template.json`
Template pour les stats d'équipe :

```json
{
  "winrate": 0,
  "avg_game_duration": 0,
  "region": "",
  "total_games": 0,
  "recent_matches": [],
  "detailed": {
    "economy": {},
    "aggression": {},
    "objectives": {},
    "vision": {}
  }
}
```

---

## 🚫 Ne PAS commiter

Ajouter dans `.gitignore` si nécessaire :

```gitignore
# Fichiers volumineux
public/resources/images/*.png
public/resources/images/*.jpg

# Données sensibles
public/resources/data/private-*.json
```

---

## 📝 Notes

- Les CSV de stats sont chargés depuis Google Drive (pas besoin de les mettre ici)
- Les champions sont chargés depuis l'API Riot (pas besoin de fichier local)
- Ce dossier est pour les **ressources personnalisées** uniquement

---

## 🔗 Liens Utiles

- **Data Dragon** : https://developer.riotgames.com/docs/lol#data-dragon
- **Champions JSON** : https://ddragon.leagueoflegends.com/cdn/14.24.1/data/fr_FR/champion.json
- **Images Champions** : https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/
