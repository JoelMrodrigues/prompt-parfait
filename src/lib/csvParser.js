// Fonction pour parser un CSV en JSON
export const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}

// Fonction pour convertir les types de données
export const convertDataTypes = (data) => {
  return data.map(row => {
    const converted = { ...row }
    
    Object.keys(converted).forEach(key => {
      const value = converted[key]
      
      // Convertir les pourcentages
      if (value && value.includes('%')) {
        converted[key] = parseFloat(value.replace('%', ''))
      }
      // Convertir les nombres
      else if (value && !isNaN(value)) {
        converted[key] = parseFloat(value)
      }
    })
    
    return converted
  })
}

// Fonction pour filtrer par saison
export const filterBySeason = (data, season) => {
  if (!season || season === 'all') return data
  return data.filter(row => row.Season === season || row.season === season)
}

// Fonction pour trier les données
export const sortData = (data, key, direction = 'desc') => {
  return [...data].sort((a, b) => {
    const aVal = typeof a[key] === 'number' ? a[key] : String(a[key]).toLowerCase()
    const bVal = typeof b[key] === 'number' ? b[key] : String(b[key]).toLowerCase()
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}
