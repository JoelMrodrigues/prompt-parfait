# 📁 Structure du Module Team

## 🎯 Principe
**Un fichier = Une responsabilité**

Chaque fichier fait UNE SEULE chose, ce qui rend le code :
- ✅ **Maintenable** : Facile de trouver où corriger un bug
- ✅ **Testable** : Chaque fonction peut être testée indépendamment
- ✅ **Compréhensible** : On sait exactement ce que fait chaque fichier

---

## 📂 Structure des Dossiers

```
src/lib/team/
├── scrapers/              # Récupération HTML uniquement (fetch)
│   └── opggScraper.js
├── extractors/           # Extraction de données depuis HTML
│   └── opgg/
│       ├── extractRank.js
│       └── extractChampions.js
├── utils/                 # Utilitaires partagés
│   ├── parseUrl.js
│   └── formatChampionName.js
├── index.js               # Point d'entrée principal (orchestration)
└── README.md
```

---

## 📄 Description des Fichiers

### 🔧 Utils

#### `utils/parseUrl.js`
**Rôle**: Parse une URL OP.gg pour extraire région et pseudo
- **Input**: `"https://op.gg/fr/lol/summoners/euw/Marcel%20le%20Zgeg-BACK"`
- **Output**: `{ region: "euw", summonerName: "Marcel le Zgeg#BACK" }`

#### `utils/formatChampionName.js`
**Rôle**: Formate un slug de champion en nom lisible
- **Input**: `"drmundo"` ou `"dr-mundo"`
- **Output**: `"Dr. Mundo"`

---

### 🌐 Scrapers

#### `scrapers/opggScraper.js`
**Rôle**: Récupère le HTML d'OP.gg via proxy CORS
- **Fonction**: `fetchOpggHtml(opggUrl)`
- **Retourne**: HTML brut (string)
- **Ne fait PAS**: Extraction de données

---

### 🔍 Extractors OP.gg

#### `extractors/opgg/extractRank.js`
**Rôle**: Extrait le rank depuis le HTML d'OP.gg
- **Fonction**: `extractRankFromOpgg(html)`
- **Input**: HTML brut
- **Output**: `"master 364 LP"` ou `null`
- **Ne fait PAS**: Scraping ou extraction de champions

#### `extractors/opgg/extractChampions.js`
**Rôle**: Extrait les top 5 champions depuis le HTML d'OP.gg
- **Fonction**: `extractChampionsFromOpgg(html)`
- **Input**: HTML brut
- **Output**: `[{ name: "Jayce", winrate: 75, games: 8 }, ...]`
- **Ne fait PAS**: Scraping ou extraction de rank

---

### 🎯 Point d'Entrée

#### `index.js`
**Rôle**: Orchestre tout le processus
- **Fonction**: `fetchOpggData(opggUrl)`
- **Flux**:
  1. Parse l'URL OP.gg
  2. Scrape HTML depuis OP.gg
  3. Extrait rank
  4. Extrait champions
  5. Retourne les données

---

## 🔄 Flux de Données

```
fetchOpggData(opggUrl)
  ↓
parseOpggUrl() → { region, summonerName }
  ↓
fetchOpggHtml() → HTML
  ↓
extractRankFromOpgg() → rank
extractChampionsFromOpgg() → champions
  ↓
{ rank, topChampions, region, summonerName }
```

---

## ✅ Avantages de cette Structure

1. **Maintenabilité**
   - Si le parsing OP.gg bug, on va directement dans `extractors/opgg/`
   - Si un proxy CORS ne marche plus, on modifie uniquement `scrapers/opggScraper.js`

2. **Testabilité**
   - Chaque fonction peut être testée indépendamment
   - On peut mocker facilement les scrapers pour tester les extractors

3. **Clarté**
   - On sait exactement où chercher pour corriger un bug
   - Pas de confusion entre scraping et extraction

4. **Réutilisabilité**
   - Les extractors peuvent être utilisés avec d'autres sources HTML
   - Les scrapers peuvent être utilisés pour d'autres extractions

---

## 🐛 Correction de Bugs

### Exemple 1: Le rank n'est pas extrait d'OP.gg
→ Aller dans `extractors/opgg/extractRank.js`
→ Modifier les patterns regex ou les selectors DOM

### Exemple 2: Un proxy CORS ne fonctionne plus
→ Aller dans `scrapers/opggScraper.js`
→ Ajouter/modifier la liste des proxies

### Exemple 3: Les champions ne sont pas bien extraits d'OP.gg
→ Aller dans `extractors/opgg/extractChampions.js`
→ Modifier la logique de parsing DOM

---

## 📝 Notes

- **Tous les fichiers sont indépendants** : Chaque fichier peut être modifié sans impacter les autres
- **Pas de dépendances circulaires** : Les extractors n'importent pas les scrapers
- **Utils partagés** : `parseUrl` et `formatChampionName` sont utilisés par plusieurs fichiers
