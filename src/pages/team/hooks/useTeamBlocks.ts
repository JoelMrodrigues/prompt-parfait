import { useState, useEffect, useCallback } from 'react'
import { fetchBlocksByTeam } from '../../../services/supabase/blockQueries'
import type { TeamMatchBlock } from '../../../types/matchBlocks'

// Cache module-level — même pattern que useTeamMatches
const cache = new Map<string, TeamMatchBlock[]>()
const inflight = new Map<string, Promise<TeamMatchBlock[]>>()

export function useTeamBlocks(teamId: string | null | undefined) {
  const cached = teamId ? cache.get(teamId) : undefined
  const [blocks, setBlocks] = useState<TeamMatchBlock[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const run = useCallback(async () => {
    if (!teamId) { setBlocks([]); setLoading(false); return }

    if (cache.has(teamId)) {
      setBlocks(cache.get(teamId)!)
      setLoading(false)
      return
    }

    setLoading(true)

    if (!inflight.has(teamId)) {
      const promise = fetchBlocksByTeam(teamId)
        .then(({ data, error }) => {
          inflight.delete(teamId)
          if (error) throw error
          cache.set(teamId, data)
          return data
        })
        .catch((err) => {
          inflight.delete(teamId)
          throw err
        })
      inflight.set(teamId, promise)
    }

    try {
      const result = await inflight.get(teamId)!
      setBlocks(result)
    } catch {
      setBlocks([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { run() }, [run])

  const refetch = useCallback(async () => {
    if (teamId) { cache.delete(teamId); inflight.delete(teamId) }
    await run()
  }, [run, teamId])

  return { blocks, loading, refetch }
}
