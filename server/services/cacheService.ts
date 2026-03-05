/**
 * Cache mémoire avec TTL (15 min par défaut)
 * Réinitialisé à chaque redémarrage du serveur
 */
import type { CacheEntry } from '../types/index.js'

const TTL_MS = 15 * 60 * 1000
const MAX_SIZE = 500

class CacheService {
  private store: Map<string, CacheEntry>

  constructor() {
    this.store = new Map()
  }

  buildKey(...parts: (string | undefined)[]): string {
    return parts.map((p) => (p || '').trim().toLowerCase()).join('|')
  }

  get(key: string): CacheEntry | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.at > TTL_MS) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  set(key: string, data: Record<string, unknown>): void {
    if (this.store.size >= MAX_SIZE) {
      // Éviction LRU approximative : supprimer la première entrée insérée
      const firstKey = this.store.keys().next().value
      if (firstKey !== undefined) this.store.delete(firstKey)
    }
    this.store.set(key, { ...data, at: Date.now() })
  }
}

export const cache = new CacheService()
