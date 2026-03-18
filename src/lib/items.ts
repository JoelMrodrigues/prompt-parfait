/**
 * Items LoL via Community Dragon (raw.communitydragon.org — accessible au boulot contrairement à ddragon)
 * Format JSON community dragon : [{ id, name, iconPath, ... }]
 * iconPath: "/lol-game-data/assets/ITEMS/Icons2D/1001_Boots.png"
 * → URL: https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/items/icons2d/1001_boots.png
 */

interface CdItem {
  id: number
  name: string
  iconPath?: string
}

interface ItemEntry {
  name: string
  imageUrl: string | null
}

let cachedItems: Record<string, ItemEntry> | null = null

async function fetchWithTimeout(url: string, ms = 10000) {
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

function iconPathToUrl(iconPath: string): string {
  // "/lol-game-data/assets/ASSETS/Items/Icons2D/1001_Class_T1_BootsofSpeed.png"
  // → https://raw.communitydragon.org/.../assets/items/icons2d/1001_class_t1_bootsofspeed.png
  const filename = iconPath.split('/').pop()?.toLowerCase() ?? ''
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/items/icons2d/${filename}`
}

/**
 * Charge et cache la liste des items depuis Community Dragon (raw.communitydragon.org)
 */
export async function loadItems(): Promise<Record<string, ItemEntry>> {
  if (cachedItems) return cachedItems
  const url =
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items.json'
  try {
    const res = await fetchWithTimeout(url)
    const json: CdItem[] = await res.json()
    cachedItems = {}
    for (const item of json) {
      if (!item?.id) continue
      cachedItems[String(item.id)] = {
        name: item.name,
        imageUrl: item.iconPath ? iconPathToUrl(item.iconPath) : null,
      }
    }
    return cachedItems
  } catch (e: any) {
    console.warn('Items CDragon indisponible, builds affichés sans icônes:', e.message || e)
    cachedItems = {}
    return cachedItems
  }
}

/**
 * URL de l'image d'un item (Community Dragon)
 */
export function getItemImageUrl(itemId: number | string | null): string | null {
  if (!itemId || itemId === 0) return null
  const items = cachedItems || {}
  return items[String(itemId)]?.imageUrl ?? null
}

/**
 * Nom de l'item (après loadItems)
 */
export function getItemName(itemId: number | string): string {
  if (!itemId || itemId === 0) return ''
  const items = cachedItems || {}
  return items[String(itemId)]?.name || `Item ${itemId}`
}

/**
 * Retourne les infos item (name, imageUrl) pour un id
 */
export function getItemInfo(itemId: number | string) {
  if (!itemId || itemId === 0) return { name: '', imageUrl: null }
  return {
    name: getItemName(itemId),
    imageUrl: getItemImageUrl(itemId),
  }
}
