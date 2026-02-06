# Intégration des CSV de stats

## Format CSV attendu

Le parser est flexible et détecte automatiquement les colonnes, mais voici des formats recommandés :

### Champions Stats
```csv
Champion,Winrate,Pickrate,Banrate,KDA,Games,Season
Aatrox,51.2,8.5,12.3,2.8,1245,S16
Ahri,52.1,15.2,5.6,3.1,2890,S16
```

### Players Stats
```csv
Player,Team,Role,KDA,GPM,DPM,Games,Season
Faker,T1,Mid,5.2,450,580,45,S16
Chovy,GenG,Mid,4.8,440,560,42,S16
```

### Teams Stats
```csv
Team,Region,Wins,Losses,Winrate,AvgGameTime,Season
T1,LCK,18,2,90.0,32.5,S16
GenG,LCK,16,4,80.0,33.2,S16
```

## Où placer les CSV

### Option 1 : Import manuel via UI
C'est déjà implémenté ! L'utilisateur peut :
1. Aller sur la page Stats
2. Cliquer sur "Importer CSV"
3. Sélectionner son fichier
4. Les données s'affichent automatiquement

### Option 2 : Charger depuis public/
1. Placer les CSV dans `public/data/stats/`
2. Exemple : `public/data/stats/champions_s16.csv`
3. Créer un hook pour les charger :

```javascript
// src/hooks/useStats.js
import { useState, useEffect } from 'react'
import { parseCSV, convertDataTypes } from '../lib/csvParser'

export const useStats = (filename) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/data/stats/${filename}`)
      .then(res => res.text())
      .then(csvText => {
        const parsed = parseCSV(csvText)
        const converted = convertDataTypes(parsed)
        setData(converted)
        setLoading(false)
      })
  }, [filename])

  return { data, loading }
}
```

### Option 3 : Stocker dans Supabase
1. Créer une table `stats_data` :

```sql
CREATE TABLE stats_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'champions', 'players', 'teams'
  season VARCHAR(10) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stats_category ON stats_data(category);
CREATE INDEX idx_stats_season ON stats_data(season);
```

2. Script pour importer les CSV dans Supabase :

```javascript
// scripts/importStatsToSupabase.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { parseCSV, convertDataTypes } from '../src/lib/csvParser.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key (pas anon key)
)

const importCSV = async (filepath, category, season) => {
  const csvText = fs.readFileSync(filepath, 'utf-8')
  const parsed = parseCSV(csvText)
  const converted = convertDataTypes(parsed)

  const { error } = await supabase
    .from('stats_data')
    .insert([{
      category,
      season,
      data: converted
    }])

  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`✅ Imported ${converted.length} rows for ${category} ${season}`)
  }
}

// Importer vos fichiers
await importCSV('data/champions_s16.csv', 'champions', 'S16')
await importCSV('data/players_s16.csv', 'players', 'S16')
```

3. Récupérer dans l'app :

```javascript
// Dans Stats.jsx
const fetchStatsFromSupabase = async (category, season) => {
  const { data, error } = await supabase
    .from('stats_data')
    .select('data')
    .eq('category', category)
    .eq('season', season)
    .single()

  if (data) {
    setStatsData(data.data)
  }
}
```

## Parser CSV avancé

Si vos CSV ont des formats spéciaux, vous pouvez personnaliser le parser :

```javascript
// src/lib/csvParser.js - version améliorée
export const parseCSV = (csvText, options = {}) => {
  const {
    delimiter = ',',
    skipEmptyLines = true,
    trimValues = true
  } = options

  const lines = csvText.split('\n').filter(line => 
    skipEmptyLines ? line.trim() : true
  )

  if (lines.length === 0) return []

  // Support des guillemets dans les valeurs
  const parseLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        values.push(trimValues ? current.trim() : current)
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(trimValues ? current.trim() : current)
    return values
  }

  const headers = parseLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}
```

## Conversion automatique JSON → CSV

Si vous avez des JSON et voulez les convertir en CSV :

```javascript
// utils/jsonToCSV.js
export const jsonToCSV = (data) => {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvLines = [headers.join(',')]

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      // Échapper les valeurs avec des virgules
      return typeof value === 'string' && value.includes(',')
        ? `"${value}"`
        : value
    })
    csvLines.push(values.join(','))
  })

  return csvLines.join('\n')
}

// Utilisation
const csvContent = jsonToCSV(myData)
const blob = new Blob([csvContent], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
// Télécharger ou envoyer
```

## Structure recommandée pour vos fichiers

```
public/
  data/
    stats/
      champions/
        s16_champions.csv
        s15_champions.csv
        ...
      players/
        s16_players_pros.csv
        s16_players_soloq.csv
      teams/
        s16_teams.csv
      tournaments/
        worlds_2024.csv
```

## Validation des données

Ajouter une validation avant import :

```javascript
const validateChampionStats = (data) => {
  const requiredFields = ['Champion', 'Winrate', 'Pickrate']
  
  return data.every(row => 
    requiredFields.every(field => row[field] !== undefined)
  )
}

// Utilisation
if (!validateChampionStats(parsed)) {
  alert('❌ CSV invalide : colonnes manquantes')
  return
}
```
