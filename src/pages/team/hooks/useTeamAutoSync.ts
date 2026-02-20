/**
 * Sync automatique : au chargement du site (section Team), remonte pour chaque joueur
 * le rang + toutes les games classées (avec délais pour ne pas saturer l'API Riot),
 * met à jour rank_updated_at, puis recalcule le Top 5 champions via Supabase.
 * Boucle répétée après un intervalle. Logs détaillés pour debug.
 */
import { useEffect, useRef } from 'react'
import { useTeam } from './useTeam'
import { supabase } from '../../../lib/supabase'
import {
  fetchSoloqChampionStats,
  fetchSoloqMatches,
  upsertSoloqMatches,
} from '../../../services/supabase/playerQueries'

const getBackendUrl = () =>
  (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const SEASON_16_START_MS = 1767830400000
const DELAY_BETWEEN_REQUESTS_MS = 2500
const DELAY_BETWEEN_PLAYERS_MS = 3000
const SYNC_LOOP_INTERVAL_MS = 5 * 60 * 1000
const DELAY_BEFORE_FIRST_RUN_MS = 2000
const MAX_MATCHES_PER_PLAYER = 200
const PAGE_SIZE = 20

const LOG_PREFIX = '[AutoSync]'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function hasValidPseudo(p: { pseudo?: string | null }) {
  const pseudo = (p.pseudo || '').trim()
  return pseudo.length > 0 && (pseudo.includes('#') || pseudo.includes('/'))
}

export function useTeamAutoSync() {
  const { team, players, updatePlayer, refetch } = useTeam()
  const runningRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updatePlayerRef = useRef(updatePlayer)
  const refetchRef = useRef(refetch)
  const playersRef = useRef(players)
  updatePlayerRef.current = updatePlayer
  refetchRef.current = refetch
  playersRef.current = players

  useEffect(() => {
    if (!team?.id || !players?.length) return
    const toSync = players.filter(hasValidPseudo)
    if (!toSync.length) {
      console.log(LOG_PREFIX, 'Aucun joueur avec pseudo valide (GameName#Tag), sync désactivé')
      return
    }
    if (runningRef.current) {
      console.log(LOG_PREFIX, 'Cycle déjà en cours, on ne relance pas')
      return
    }

    const runLoop = async () => {
      const currentPlayers = playersRef.current
      const updatePlayerFn = updatePlayerRef.current
      const refetchFn = refetchRef.current
      const listToSync = (currentPlayers || []).filter(hasValidPseudo)

      runningRef.current = true
      console.log(LOG_PREFIX, '--- Début du cycle ---', listToSync.length, 'joueur(s) à synchroniser')

      try {
        for (let i = 0; i < listToSync.length; i++) {
          const player = listToSync[i]
          const pseudo = (player.pseudo || '').trim()
          const name = player.player_name || pseudo
          console.log(LOG_PREFIX, `[${i + 1}/${listToSync.length}]`, name, '| requête sync rank + 20 matches')

          try {
            const res = await fetch(
              `${getBackendUrl()}/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(pseudo)}`
            )
            const data = await res.json().catch(() => ({}))
            if (!data.success) {
              console.warn(LOG_PREFIX, name, '| API erreur:', data.error || res.status)
              if (data.rateLimitSeconds) {
                console.log(LOG_PREFIX, 'Rate limit:', data.rateLimitSeconds, 's — attente')
                await delay(Math.max(2000, data.rateLimitSeconds * 1000))
              }
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }

            const updates: Record<string, unknown> = {}
            if (data.rank != null) {
              updates.rank = data.rank
              updates.rank_updated_at = new Date().toISOString()
            }
            if (typeof data.totalMatchIds === 'number') updates.soloq_total_match_ids = data.totalMatchIds
            if (Object.keys(updates).length > 0) {
              await updatePlayerFn(player.id, updates)
              console.log(LOG_PREFIX, name, '| rang mis à jour, rank_updated_at enregistré')
            }

            const s16FromSync = Array.isArray(data.matches)
              ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
              : []
            if (s16FromSync.length > 0 && supabase) {
              const rows = s16FromSync.map((m: any) => ({
                player_id: player.id,
                riot_match_id: m.matchId,
                account_source: 'primary',
                champion_id: m.championId ?? null,
                champion_name: m.championName ?? null,
                opponent_champion: m.opponentChampionName ?? null,
                win: !!m.win,
                kills: m.kills ?? 0,
                deaths: m.deaths ?? 0,
                assists: m.assists ?? 0,
                game_duration: m.gameDuration ?? 0,
                game_creation: m.gameCreation ?? 0,
              }))
              const { error: upsertError } = await upsertSoloqMatches(rows)
              if (upsertError) {
                console.error(LOG_PREFIX, name, '| erreur Supabase upsert (batch sync):', upsertError)
              } else {
                console.log(LOG_PREFIX, name, '|', rows.length, 'matches (S16) poussés en base Supabase')
              }
            }

            const totalRiot = typeof data.totalMatchIds === 'number' ? data.totalMatchIds : 0
            const { count: countInDb } = await fetchSoloqMatches({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
              offset: 0,
              limit: 1,
              withCount: true,
            })
            const inDb = countInDb ?? 0
            const toLoad = Math.max(0, Math.min(totalRiot - inDb, MAX_MATCHES_PER_PLAYER - inDb))
            if (toLoad <= 0) {
              console.log(LOG_PREFIX, name, '| déjà à jour —', inDb, 'parties en base /', totalRiot, 'Riot — 0 requête inutile')
            } else {
              console.log(LOG_PREFIX, name, '| manquantes:', toLoad, '(Supabase:', inDb, ', Riot:', totalRiot, ') — on ne remonte que celles-là')
              let start = inDb
              while (start < totalRiot && start < MAX_MATCHES_PER_PLAYER) {
                const limit = Math.min(PAGE_SIZE, totalRiot - start)
                console.log(LOG_PREFIX, name, '| match-history start=', start, 'limit=', limit)
                try {
                  const histRes = await fetch(
                    `${getBackendUrl()}/api/riot/match-history?pseudo=${encodeURIComponent(pseudo)}&start=${start}&limit=${limit}`
                  )
                  const histData = await histRes.json().catch(() => ({}))
                  if (histRes.status === 429 && (histData.retry_after ?? histData.retryAfter)) {
                    const wait = Math.max(2000, (histData.retry_after ?? histData.retryAfter) * 1000)
                    console.log(LOG_PREFIX, name, '| rate limit 429 — attente', Math.round(wait / 1000), 's')
                    await delay(wait)
                    continue
                  }
                  if (!histData.success || !Array.isArray(histData.matches) || histData.matches.length === 0) {
                    console.log(LOG_PREFIX, name, '| plus de matches ou erreur, arrêt')
                    break
                  }
                  const s16 = (histData.matches || []).filter(
                    (m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS
                  )
                  if (s16.length > 0 && supabase) {
                    const rows = s16.map((m: any) => ({
                      player_id: player.id,
                      riot_match_id: m.matchId,
                      account_source: 'primary',
                      champion_id: m.championId ?? null,
                      champion_name: m.championName ?? null,
                      opponent_champion: m.opponentChampionName ?? null,
                      win: !!m.win,
                      kills: m.kills ?? 0,
                      deaths: m.deaths ?? 0,
                      assists: m.assists ?? 0,
                      game_duration: m.gameDuration ?? 0,
                      game_creation: m.gameCreation ?? 0,
                    }))
                    const { error: upsertErr } = await upsertSoloqMatches(rows)
                    if (upsertErr) {
                      console.error(LOG_PREFIX, name, '| erreur Supabase upsert (manquantes):', upsertErr)
                    } else {
                      console.log(LOG_PREFIX, name, '| +', rows.length, 'parties poussées en base Supabase (manquantes)')
                    }
                  }
                  start += histData.matches?.length ?? 0
                  if (!histData.hasMore || (histData.matches?.length ?? 0) < limit) break
                  await delay(DELAY_BETWEEN_REQUESTS_MS)
                } catch (err) {
                  console.warn(LOG_PREFIX, name, '| erreur réseau match-history:', err)
                  break
                }
              }
              const { count: countAfter } = await fetchSoloqMatches({
                playerId: player.id,
                accountSource: 'primary',
                seasonStart: SEASON_16_START_MS,
                offset: 0,
                limit: 1,
                withCount: true,
              })
              console.log(LOG_PREFIX, name, '| total en base après sync:', countAfter ?? 0, '/ Riot:', totalRiot)
            }

            await delay(DELAY_BETWEEN_PLAYERS_MS)
          } catch (e) {
            console.warn(LOG_PREFIX, 'Erreur joueur', player.player_name, e)
            await delay(DELAY_BETWEEN_PLAYERS_MS)
          }
        }

        console.log(LOG_PREFIX, 'Refetch équipe...')
        await refetchFn()

        console.log(LOG_PREFIX, 'Recalcul Top 5 champions (Supabase uniquement)...')
        const allPlayers = playersRef.current || []
        for (const player of allPlayers) {
          try {
            const { data: rows } = await fetchSoloqChampionStats({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
            })
            if (!rows?.length) continue
            const byChamp: Record<string, { games: number; wins: number }> = {}
            for (const r of rows) {
              const champName = r.champion_name
              if (!champName) continue
              if (!byChamp[champName]) byChamp[champName] = { games: 0, wins: 0 }
              byChamp[champName].games++
              if (r.win) byChamp[champName].wins++
            }
            const top5 = Object.entries(byChamp)
              .sort((a, b) => b[1].games - a[1].games)
              .slice(0, 5)
              .map(([name, s]) => ({
                name,
                games: s.games,
                winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
              }))
            if (top5.length > 0) {
              await updatePlayerFn(player.id, { top_champions: top5 })
              console.log(LOG_PREFIX, player.player_name, '| Top 5 mis à jour')
            }
          } catch (e) {
            console.warn(LOG_PREFIX, 'Top 5', player.player_name, e)
          }
        }
        await refetchFn()
        console.log(LOG_PREFIX, '--- Fin du cycle ---')
      } catch (e) {
        console.warn(LOG_PREFIX, 'Erreur boucle', e)
      } finally {
        runningRef.current = false
      }

      console.log(LOG_PREFIX, 'Prochain cycle dans', Math.round(SYNC_LOOP_INTERVAL_MS / 60000), 'min')
      timeoutRef.current = setTimeout(runLoop, SYNC_LOOP_INTERVAL_MS)
    }

    const t = setTimeout(() => {
      runLoop()
    }, DELAY_BEFORE_FIRST_RUN_MS)
    console.log(LOG_PREFIX, 'Démarré (premier cycle dans', DELAY_BEFORE_FIRST_RUN_MS / 1000, 's)')

    return () => {
      clearTimeout(t)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
        console.log(LOG_PREFIX, 'Cleanup: timer annulé')
      }
      runningRef.current = false
    }
  }, [team?.id, players?.length])
}
