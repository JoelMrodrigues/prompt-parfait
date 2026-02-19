/**
 * Items LoL via Data Dragon (remonte les builds + S16)
 * Patch fixe pour éviter les timeouts sur versions.json
 */
const PATCH = '15.6.1'

let cachedItems = null

async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(id)
    return res
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

/**
 * Charge et cache la liste des items depuis Data Dragon
 */
export async function loadItems() {
  if (cachedItems) return cachedItems
  const url = `https://ddragon.leagueoflegends.com/cdn/${PATCH}/data/en_US/item.json`
  try {
    const res = await fetchWithTimeout(url)
    const json = await res.json()
    cachedItems = json.data || {}
    return cachedItems
  } catch (e) {
    console.warn(
      'Items DDragon timeout ou indisponible, builds affichés sans noms:',
      e.message || e
    )
    cachedItems = {}
    return cachedItems
  }
}

/**
 * URL de l'image d'un item (Data Dragon)
 */
export function getItemImageUrl(itemId, patch = null) {
  if (!itemId || itemId === 0) return null
  const p = patch || PATCH
  return `https://ddragon.leagueoflegends.com/cdn/${p}/img/item/${itemId}.png`
}

/**
 * Nom de l'item (après loadItems)
 */
export function getItemName(itemId) {
  if (!itemId || itemId === 0) return ''
  const items = cachedItems || {}
  const item = items[String(itemId)]
  return item?.name || `Item ${itemId}`
}

/**
 * Retourne les infos item (name, imageUrl) pour un id
 */
export function getItemInfo(itemId) {
  if (!itemId || itemId === 0) return { name: '', imageUrl: null }
  return {
    name: getItemName(itemId),
    imageUrl: getItemImageUrl(itemId),
  }
}
