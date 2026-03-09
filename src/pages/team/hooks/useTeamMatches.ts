import { useState, useEffect, useCallback } from 'react'
import { fetchTeamMatchesList, fetchTeamMatches } from '../../../services/supabase/matchQueries'

// Cache légère — liste des matchs (MatchsPage, ImportPage, overview)
const listCache = new Map<string, any[]>()
// Cache complète — matchs avec toutes les stats participants (TeamStatsPage)
const fullCache = new Map<string, any[]>()

// Déduplication — si une requête est en vol pour un teamId, tous les appelants
// attendent la même Promise au lieu de lancer N requêtes identiques en parallèle.
const listInflight = new Map<string, Promise<any[]>>()
const fullInflight = new Map<string, Promise<any[]>>()

function makeHook(
  fetcher: (id: string) => Promise<any>,
  cache: Map<string, any[]>,
  inflight: Map<string, Promise<any[]>>
) {
  return (teamId: string | null | undefined) => {
    const cached = teamId ? cache.get(teamId) : undefined
    const [matches, setMatches] = useState<any[]>(cached ?? [])
    const [loading, setLoading] = useState(!cached)

    const run = useCallback(async () => {
      if (!teamId) { setMatches([]); setLoading(false); return }

      // Données déjà en cache → pas de réseau
      if (cache.has(teamId)) {
        setMatches(cache.get(teamId)!)
        setLoading(false)
        return
      }

      setLoading(true)

      // Requête déjà en vol → réutiliser la même Promise (déduplication)
      if (!inflight.has(teamId)) {
        const promise = fetcher(teamId)
          .then(({ data, error }) => {
            const result = error ? [] : (data ?? [])
            if (!error) cache.set(teamId, result)
            inflight.delete(teamId)
            return result
          })
          .catch(() => { inflight.delete(teamId); return [] })
        inflight.set(teamId, promise)
      }

      try {
        const result = await inflight.get(teamId)!
        setMatches(result)
      } finally {
        setLoading(false)
      }
    }, [teamId])

    useEffect(() => { run() }, [run])

    const refetch = useCallback(async () => {
      if (teamId) { cache.delete(teamId); inflight.delete(teamId) }
      await run()
    }, [run, teamId])

    return { matches, loading, refetch }
  }
}

// Hook léger — par défaut partout
export const useTeamMatches = makeHook(fetchTeamMatchesList, listCache, listInflight)

// Hook complet — pour les pages de statistiques
export const useTeamMatchesFull = makeHook(fetchTeamMatches, fullCache, fullInflight)

// Lecture directe du cache liste (sans abonnement React) — pour les hooks de sync
export function getListCachedMatches(teamId: string): any[] | null {
  return listCache.get(teamId) ?? null
}
