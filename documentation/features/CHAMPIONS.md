# Intégration des Champions

## Format JSON attendu

Le JSON des champions doit avoir la structure suivante :

```json
{
  "champions": [
    {
      "id": "aatrox",
      "name": "Aatrox",
      "roles": ["Top"],
      "image": "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aatrox.png"
    },
    {
      "id": "ahri",
      "name": "Ahri",
      "roles": ["Mid"],
      "image": "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Ahri.png"
    }
  ]
}
```

## Où placer le JSON

### Option 1 : Fichier statique (recommandé pour développement)
1. Créer `public/data/champions.json`
2. Copier votre JSON dedans
3. Modifier `src/pages/Draft.jsx` :

```javascript
import { useEffect, useState } from 'react'

// Au début du composant Draft
const [champions, setChampions] = useState([])

useEffect(() => {
  fetch('/data/champions.json')
    .then(res => res.json())
    .then(data => setChampions(data.champions))
}, [])
```

### Option 2 : Supabase Storage (recommandé pour production)
1. Aller dans Storage dans Supabase
2. Créer un bucket public `game-data`
3. Upload `champions.json`
4. Récupérer l'URL publique

```javascript
import { supabase } from '../lib/supabase'

useEffect(() => {
  const fetchChampions = async () => {
    const { data } = await supabase
      .storage
      .from('game-data')
      .download('champions.json')
    
    const text = await data.text()
    const json = JSON.parse(text)
    setChampions(json.champions)
  }
  fetchChampions()
}, [])
```

### Option 3 : API Riot Games (dynamique)
Utiliser l'API Data Dragon de Riot :

```javascript
useEffect(() => {
  const fetchChampions = async () => {
    const version = '14.1.1' // Version actuelle du jeu
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`
    )
    const data = await response.json()
    
    const championsArray = Object.values(data.data).map(champ => ({
      id: champ.id,
      name: champ.name,
      roles: champ.tags,
      image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`
    }))
    
    setChampions(championsArray)
  }
  fetchChampions()
}, [])
```

## Script pour générer le JSON depuis Data Dragon

Si tu veux créer ton propre JSON :

```javascript
// scripts/generateChampions.js
const fs = require('fs')

const version = '14.1.1'
const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`

fetch(url)
  .then(res => res.json())
  .then(data => {
    const champions = Object.values(data.data).map(champ => ({
      id: champ.id,
      name: champ.name,
      roles: champ.tags,
      image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`
    }))
    
    fs.writeFileSync(
      'public/data/champions.json',
      JSON.stringify({ champions }, null, 2)
    )
    
    console.log(`✅ ${champions.length} champions générés`)
  })
```

## Où modifier le code

Pour remplacer les données mock par les vraies :

**Fichier : `src/pages/Draft.jsx`**

Remplacer cette ligne :
```javascript
const MOCK_CHAMPIONS = [...]
```

Par :
```javascript
const [champions, setChampions] = useState([])

useEffect(() => {
  // Utiliser une des méthodes ci-dessus
}, [])
```

Et passer `champions` au lieu de `MOCK_CHAMPIONS` au modal :
```javascript
<ChampionSelectModal
  champions={champions}
  onSelect={handleChampionSelect}
  ...
/>
```

## Images des champions

Les images des champions proviennent de Data Dragon :
- URL de base : `https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championId}.png`
- Exemple : `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aatrox.png`

Tu peux aussi télécharger toutes les images en local dans `public/champions/` si tu préfères.
