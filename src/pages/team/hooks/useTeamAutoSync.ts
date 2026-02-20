/**
 * Sync automatique : pour chaque joueur dans l'ordre :
 * 1) Total RÉEL de parties (match-count, comme "Actualiser le total")
 * 2) Comparer avec Supabase (obligatoire : base <= total réel)
 * 3) Remonter uniquement les parties manquantes, les pousser en Supabase
 * 4) Mettre à jour le RANG en dernier (sync-rank, pas sync-rank-and-matches)
 * 5) Top 5 champions via Supabase (pas d'API Riot)
 * Pause 3 min puis recommencer.
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
const SYNC_LOOP_INTERVAL_MS = 3 * 60 * 1000
const DELAY_BEFORE_FIRST_RUN_MS = 2000
const MAX_MATCHES_PER_PLAYER = 300
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
      console.log(LOG_PREFIX, '--- Début du cycle ---', listToSync.length, 'joueur(s)')

      try {
        for (let i = 0; i < listToSync.length; i++) {
          const player = listToSync[i]
          const pseudo = (player.pseudo || '').trim()
          const name = player.player_name || pseudo
          console.log(LOG_PREFIX, `[${i + 1}/${listToSync.length}]`, name)

          try {
            // ─── 1) Total RÉEL (comme "Actualiser le total" en Import) ───
            console.log(LOG_PREFIX, name, '| 1/4 total réel (match-count)...')
            let countRes = await fetch(
              `${getBackendUrl()}/api/riot/match-count?pseudo=${encodeURIComponent(pseudo)}`
            )
            let countData = await countRes.json().catch(() => ({}))
            if (countRes.status === 429 && (countData.retry_after ?? countData.retryAfter)) {
              const wait = Math.max(2000, (countData.retry_after ?? countData.retryAfter) * 1000)
              console.log(LOG_PREFIX, name, '| match-count rate limit — attente', Math.round(wait / 1000), 's')
              await delay(wait)
              countRes = await fetch(
                `${getBackendUrl()}/api/riot/match-count?pseudo=${encodeURIComponent(pseudo)}`
              )
              countData = await countRes.json().catch(() => ({}))
            }
            if (!countData.success || typeof countData.total !== 'number') {
              console.warn(LOG_PREFIX, name, '| match-count erreur:', countData.error || countRes.status)
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }
            const totalRiot = countData.total
            console.log(LOG_PREFIX, name, '| total réel Riot (S16):', totalRiot)
            await delay(DELAY_BETWEEN_REQUESTS_MS)

            // ─── 2) Comparer avec Supabase ───
            const { count: countInDb } = await fetchSoloqMatches({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
              offset: 0,
              limit: 1,
              withCount: true,
            })
            const inDb = countInDb ?? 0
            if (inDb > totalRiot) {
              console.warn(LOG_PREFIX, name, '| incohérence: base=', inDb, '> Riot=', totalRiot, '(impossible en théorie, on ne touche pas aux parties)')
            }

            // ─── 3) Remonter uniquement les parties manquantes, pousser en Supabase ───
            const toLoad = Math.max(0, Math.min(totalRiot - inDb, MAX_MATCHES_PER_PLAYER - inDb))
            if (toLoad > 0) {
              console.log(LOG_PREFIX, name, '| 2/4 manquantes:', toLoad, '— on remonte et pousse en base')
              let start = inDb
              while (start < totalRiot && start < MAX_MATCHES_PER_PLAYER) {
                const limit = Math.min(PAGE_SIZE, totalRiot - start)
                try {
                  const histRes = await fetch(
                    `${getBackendUrl()}/api/riot/match-history?pseudo=${encodeURIComponent(pseudo)}&start=${start}&limit=${limit}`
                  )
                  const histData = await histRes.json().catch(() => ({}))
                  if (histRes.status === 429 && (histData.retry_after ?? histData.retryAfter)) {
                    const wait = Math.max(2000, (histData.retry_after ?? histData.retryAfter) * 1000)
                    console.log(LOG_PREFIX, name, '| rate limit — attente', Math.round(wait / 1000), 's')
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
                      console.error(LOG_PREFIX, name, '| erreur Supabase upsert:', upsertErr)
                    } else {
                      console.log(LOG_PREFIX, name, '| +', rows.length, 'parties poussées en Supabase')
                    }
                  }
                  start += histData.matches?.length ?? 0
                  if (!histData.hasMore || (histData.matches?.length ?? 0) < limit) break
                  await delay(DELAY_BETWEEN_REQUESTS_MS)
                } catch (err) {
                  console.warn(LOG_PREFIX, name, '| erreur match-history:', err)
                  break
                }
              }
              const { count: afterCount } = await fetchSoloqMatches({
                playerId: player.id,
                accountSource: 'primary',
                seasonStart: SEASON_16_START_MS,
                offset: 0,
                limit: 1,
                withCount: true,
              })
              console.log(LOG_PREFIX, name, '| en base après sync:', afterCount ?? 0, '/', totalRiot)
            } else {
              console.log(LOG_PREFIX, name, '| 2/4 déjà à jour —', inDb, 'parties en base /', totalRiot, 'Riot')
            }
            await updatePlayerFn(player.id, { soloq_total_match_ids: totalRiot })

            // ─── 4) Rang en dernier (sync-rank seul, pas sync-rank-and-matches) ───
            console.log(LOG_PREFIX, name, '| 3/4 mise à jour rang (sync-rank)...')
            await delay(DELAY_BETWEEN_REQUESTS_MS)
            let rankRes = await fetch(
              `${getBackendUrl()}/api/riot/sync-rank?pseudo=${encodeURIComponent(pseudo)}`
            )
            let rankData = await rankRes.json().catch(() => ({}))
            if (rankRes.status === 429 && (rankData.retry_after ?? rankData.retryAfter)) {
              const wait = Math.max(2000, (rankData.retry_after ?? rankData.retryAfter) * 1000)
              console.log(LOG_PREFIX, name, '| sync-rank rate limit — attente', Math.round(wait / 1000), 's')
              await delay(wait)
              rankRes = await fetch(
                `${getBackendUrl()}/api/riot/sync-rank?pseudo=${encodeURIComponent(pseudo)}`
              )
              rankData = await rankRes.json().catch(() => ({}))
            }
            if (rankData.success && rankData.rank != null) {
              await updatePlayerFn(player.id, {
                rank: rankData.rank,
                rank_updated_at: new Date().toISOString(),
              })
              console.log(LOG_PREFIX, name, '| rang + rank_updated_at enregistrés')
            } else {
              console.warn(LOG_PREFIX, name, '| sync-rank erreur:', rankData.error || rankRes.status)
            }

            // ─── 5) Top 5 via Supabase (pas d'API Riot) ───
            console.log(LOG_PREFIX, name, '| 4/4 Top 5 champions (Supabase)...')
            const { data: rows } = await fetchSoloqChampionStats({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
            })
            if (rows?.length) {
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
                .map(([champName, s]) => ({
                  name: champName,
                  games: s.games,
                  winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
                }))
              if (top5.length > 0) {
                await updatePlayerFn(player.id, { top_champions: top5 })
                console.log(LOG_PREFIX, name, '| Top 5 mis à jour')
              }
            }

            await delay(DELAY_BETWEEN_PLAYERS_MS)
          } catch (e) {
            console.warn(LOG_PREFIX, 'Erreur joueur', name, e)
            await delay(DELAY_BETWEEN_PLAYERS_MS)
          }
        }

        console.log(LOG_PREFIX, 'Refetch équipe...')
        await refetchFn()
        console.log(LOG_PREFIX, '--- Fin du cycle ---')
      } catch (e) {
        console.warn(LOG_PREFIX, 'Erreur boucle', e)
      } finally {
        runningRef.current = false
      }

      console.log(LOG_PREFIX, 'Prochain cycle dans 3 min')
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
