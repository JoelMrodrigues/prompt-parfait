/**
 * Cache mémoire avec TTL (15 min par défaut)
 * Réinitialisé à chaque redémarrage du serveur
 */
const TTL_MS = 15 * 60 * 1000

class CacheService {
  constructor() {
    this.store = new Map()
  }

  buildKey(...parts) {
    return parts.map((p) => (p || '').trim().toLowerCase()).join('|')
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.at > TTL_MS) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  set(key, data) {
    this.store.set(key, { ...data, at: Date.now() })
  }
}

export const cache = new CacheService()
