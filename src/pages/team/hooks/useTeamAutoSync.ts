/**
 * AUTO-SYNC — Saison depuis 08/01/2026 → tout en Supabase
 *
 * Pour chaque joueur :
 * 1) match-count = total OFFICIEL S16 (validé côté Riot, sans binary search)
 *    → le PUUID est retourné et mis en cache (player.puuid) pour éviter les re-lookups
 * 2) match-ids : on récupère uniquement les totalRiot premiers IDs (pages de 100)
 * 3) Manquants = ces IDs pas encore en base → match-details → upsert Supabase
 * 4) soloq_total_match_ids = totalRiot (total OFFICIEL Riot, pas le count en base)
 * 5) sync-rank, Top 5 depuis Supabase
 * 6) Mood Solo Q + Team : 5 dernières parties depuis Supabase (pas d'API Riot), mise à jour joueur.
 * Pause 3 min, recommencer.
 *
 * Optimisations vs version précédente :
 * - player.puuid est passé à tous les endpoints → 0 re-lookup PUUID par cycle si déjà connu
 * - player.region transmis → multi-région supportée
 * - fetchMatchCount : simple pagination, pas de binary search (2 calls au lieu de 17+)
 */
import { useEffect, useRef } from 'react'
import { useTeam } from './useTeam'
import { supabase } from '../../../lib/supabase'
import {
  fetchSoloqChampionStats,
  fetchSoloqMatches,
  fetchSoloqMatchIds,
  upsertSoloqMatches,
} from '../../../services/supabase/playerQueries'
import {
  SEASON_16_START_MS,
  REMAKE_THRESHOLD_SEC,
  MATCH_IDS_PAGE,
  DETAILS_CHUNK,
  AUTOSYNC_LOOP_INTERVAL_MS,
  DELAY_BETWEEN_REQUESTS_MS,
  DELAY_BETWEEN_PLAYERS_MS,
} from '../../../lib/constants'
import { apiFetch } from '../../../lib/apiFetch'
import { logger } from '../../../lib/logger'

const SYNC_LOOP_INTERVAL_MS = AUTOSYNC_LOOP_INTERVAL_MS
const DELAY_BEFORE_FIRST_RUN_MS = 2000

const LOG_PREFIX = '[AutoSync]'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function hasValidPseudo(p: { pseudo?: string | null }) {
  const pseudo = (p.pseudo || '').trim()
  return pseudo.length > 0 && (pseudo.includes('#') || pseudo.includes('/'))
}

export function useTeamAutoSync() {
  const { team, players, updatePlayer } = useTeam()
  const runningRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updatePlayerRef = useRef(updatePlayer)
  const playersRef = useRef(players)
  updatePlayerRef.current = updatePlayer
  playersRef.current = players

  useEffect(() => {
    if (!team?.id || !players?.length) return
    const toSync = players.filter(hasValidPseudo)
    if (!toSync.length) return
    if (runningRef.current) return

    const runLoop = async () => {
      const currentPlayers = playersRef.current
      const updatePlayerFn = updatePlayerRef.current
      const listToSync = (currentPlayers || []).filter(hasValidPseudo)

      runningRef.current = true
      logger.debug(LOG_PREFIX, '--- Début du cycle ---', listToSync.length, 'joueur(s)')

      try {
        for (let i = 0; i < listToSync.length; i++) {
          const player = listToSync[i]
          const pseudo = (player.pseudo || '').trim()
          const name = player.player_name || pseudo
          const region = (player.region || 'euw1').toLowerCase()

          // PUUID en cache : si connu, tous les endpoints l'utilisent directement (0 re-lookup)
          let cachedPuuid: string | null = player.puuid || null

          // Helper : construit les query params communs (pseudo + region + puuid si connu)
          const buildParams = (extra = '') => {
            let p = `pseudo=${encodeURIComponent(pseudo)}&region=${encodeURIComponent(region)}`
            if (cachedPuuid) p += `&puuid=${encodeURIComponent(cachedPuuid)}`
            if (extra) p += `&${extra}`
            return p
          }

          try {
            // ─── 1) Total OFFICIEL S16 (match-count, simple pagination sans binary search) ───
            let countRes = await apiFetch(
              `/api/riot/match-count?${buildParams()}`
            )
            let countData = await countRes.json().catch(() => ({}))
            if (countRes.status === 429 && (countData.retry_after ?? countData.retryAfter)) {
              const wait = Math.max(2000, (countData.retry_after ?? countData.retryAfter) * 1000)
              await delay(wait)
              countRes = await apiFetch(
                `/api/riot/match-count?${buildParams()}`
              )
              countData = await countRes.json().catch(() => ({}))
            }
            if (!countData.success || typeof countData.total !== 'number') {
              // PUUID invalide/corrompu → relance sans PUUID pour forcer un fresh lookup Riot
              if (countRes.status === 400 && cachedPuuid && /decrypt/i.test(countData.error || '')) {
                logger.warn(LOG_PREFIX, name, '| PUUID invalide — relance sans PUUID (fresh lookup Riot)')
                cachedPuuid = null
                const retryRes = await apiFetch(`/api/riot/match-count?pseudo=${encodeURIComponent(pseudo)}&region=${encodeURIComponent(region)}`)
                const retryData = await retryRes.json().catch(() => ({}))
                if (retryData.success && typeof retryData.total === 'number') {
                  if (retryData.puuid) {
                    cachedPuuid = retryData.puuid
                    await updatePlayerFn(player.id, { puuid: cachedPuuid }).catch(() => {})
                  }
                  // Continuer avec le bon total
                  Object.assign(countData, retryData)
                } else {
                  logger.warn(LOG_PREFIX, name, '| match-count retry erreur:', retryData.error || retryRes.status)
                  await delay(DELAY_BETWEEN_PLAYERS_MS)
                  continue
                }
              } else {
                logger.warn(LOG_PREFIX, name, '| match-count erreur:', countData.error || countRes.status)
                await delay(DELAY_BETWEEN_PLAYERS_MS)
                continue
              }
            }
            const totalRiot = countData.total

            // Mise en cache du PUUID retourné par le serveur
            if (countData.puuid && !cachedPuuid) {
              cachedPuuid = countData.puuid
              await updatePlayerFn(player.id, { puuid: cachedPuuid })
            } else if (!countData.puuid && !cachedPuuid) {
              logger.warn(LOG_PREFIX, name, '| match-count sans puuid (Railway ancien code?) — match-ids re-lookupera le joueur')
            }

            await delay(DELAY_BETWEEN_REQUESTS_MS)

            if (totalRiot === 0) {
              await updatePlayerFn(player.id, { soloq_total_match_ids: 0 })
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }

            // ─── 2) Récupérer uniquement les totalRiot premiers IDs (pages de 100) ───
            const allRiotIds: string[] = []
            let start = 0
            let idsRetry404 = 0
            while (allRiotIds.length < totalRiot) {
              const idsRes = await apiFetch(
                `/api/riot/match-ids?${buildParams(`start=${start}&count=${MATCH_IDS_PAGE}`)}`
              )
              const idsData = await idsRes.json().catch(() => ({}))
              if (idsRes.status === 429 && (idsData.retry_after ?? idsData.retryAfter)) {
                const wait = Math.max(2000, (idsData.retry_after ?? idsData.retryAfter) * 1000)
                await delay(wait)
                continue
              }
              // Retry unique sur 404 (joueur introuvable transient côté Riot)
              if (idsRes.status === 404 && idsRetry404 < 1) {
                idsRetry404++
                logger.warn(LOG_PREFIX, name, '| match-ids 404 — retry dans 3s...')
                await delay(3000)
                continue
              }
              if (!idsData.success || !Array.isArray(idsData.matchIds)) {
                logger.warn(LOG_PREFIX, name, '| match-ids erreur:', idsData.error || idsRes.status)
                break
              }
              // Mise en cache du PUUID si pas encore connu
              if (idsData.puuid && !cachedPuuid) {
                cachedPuuid = idsData.puuid
                await updatePlayerFn(player.id, { puuid: cachedPuuid })
              }
              const chunk = idsData.matchIds || []
              for (const id of chunk) {
                if (allRiotIds.length >= totalRiot) break
                allRiotIds.push(id)
              }
              if (chunk.length < MATCH_IDS_PAGE || !idsData.hasMore) break
              start += MATCH_IDS_PAGE
              await delay(DELAY_BETWEEN_REQUESTS_MS)
            }
            const idsToSync = allRiotIds.slice(0, totalRiot)

            // ─── 3) IDs déjà en base → manquants = idsToSync − base ───
            const { count: countInDb } = await fetchSoloqMatches({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
              offset: 0,
              limit: 1,
              withCount: true,
            })
            const inDb = countInDb ?? 0
            const { data: existingIds } = await fetchSoloqMatchIds(player.id, 'primary', SEASON_16_START_MS)
            const existingSet = new Set(existingIds || [])
            const missingIds = idsToSync.filter((id: string) => !existingSet.has(id))

            // ─── 4) Détails uniquement pour les manquants, upsert Supabase ───
            if (missingIds.length > 0) {
              for (let c = 0; c < missingIds.length; c += DETAILS_CHUNK) {
                const chunk = missingIds.slice(c, c + DETAILS_CHUNK)
                try {
                  const detailsRes = await apiFetch(
                    `/api/riot/match-details?${buildParams(`matchIds=${chunk.join(',')}`)}`
                  )
                  const detailsData = await detailsRes.json().catch(() => ({}))
                  if (detailsRes.status === 429 && (detailsData.retry_after ?? detailsData.retryAfter)) {
                    const wait = Math.max(2000, (detailsData.retry_after ?? detailsData.retryAfter) * 1000)
                    await delay(wait)
                    c -= DETAILS_CHUNK
                    continue
                  }
                  if (detailsData.success && Array.isArray(detailsData.matches) && detailsData.matches.length > 0 && supabase) {
                    const rows = detailsData.matches.map((m: any) => ({
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
                      total_damage: m.totalDamage ?? null,
                      gold_earned: m.goldEarned ?? null,
                      cs: m.cs ?? null,
                      vision_score: m.visionScore ?? null,
                      match_json: m.matchJson ?? null,
                    }))
                    const { error: upsertErr } = await upsertSoloqMatches(rows)
                    if (upsertErr) logger.warn(LOG_PREFIX, name, '| upsert erreur:', upsertErr)
                  }
                } catch (err) {
                  logger.warn(LOG_PREFIX, name, '| erreur match-details:', err)
                }
                await delay(DELAY_BETWEEN_REQUESTS_MS)
              }
            }

            // soloq_total_match_ids = total OFFICIEL Riot (pas le count en base)
            // Cela reflète le nombre réel de parties jouées en S16, même si la DB est incomplète.
            await updatePlayerFn(player.id, { soloq_total_match_ids: totalRiot })

            // ─── 5) Rang en dernier (sync-rank seul) ───
            await delay(DELAY_BETWEEN_REQUESTS_MS)
            let rankRes = await apiFetch(
              `/api/riot/sync-rank?${buildParams()}`
            )
            let rankData = await rankRes.json().catch(() => ({}))
            if (rankRes.status === 429 && (rankData.retry_after ?? rankData.retryAfter)) {
              const wait = Math.max(2000, (rankData.retry_after ?? rankData.retryAfter) * 1000)
              await delay(wait)
              rankRes = await apiFetch(
                `/api/riot/sync-rank?${buildParams()}`
              )
              rankData = await rankRes.json().catch(() => ({}))
            }
            if (rankData.success && rankData.rank != null) {
              await updatePlayerFn(player.id, {
                rank: rankData.rank,
                rank_updated_at: new Date().toISOString(),
              })
            } else {
              logger.warn(LOG_PREFIX, name, '| sync-rank erreur:', rankData.error || rankRes.status)
            }

            // ─── 6) Top 5 via Supabase, hors remakes ───
            const { data: rows } = await fetchSoloqChampionStats({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
              minDuration: REMAKE_THRESHOLD_SEC,
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
              }
            }

            await delay(DELAY_BETWEEN_PLAYERS_MS)
          } catch (e) {
            logger.warn(LOG_PREFIX, 'Erreur joueur', name, e)
            await delay(DELAY_BETWEEN_PLAYERS_MS)
          }
        }

        // Pas de refetchFn() — les updatePlayer locaux maintiennent l'état React à jour
        // sans déclencher de refetch global (2 requêtes Supabase + re-render complet évités)
        logger.debug(LOG_PREFIX, '--- Fin du cycle ---')
      } catch (e) {
        logger.warn(LOG_PREFIX, 'Erreur boucle', e)
      } finally {
        runningRef.current = false
      }

      timeoutRef.current = setTimeout(runLoop, SYNC_LOOP_INTERVAL_MS)
    }

    const t = setTimeout(() => {
      runLoop()
    }, DELAY_BEFORE_FIRST_RUN_MS)
    logger.debug(LOG_PREFIX, 'Démarré (premier cycle dans', DELAY_BEFORE_FIRST_RUN_MS / 1000, 's)')

    return () => {
      clearTimeout(t)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      runningRef.current = false
    }
  }, [team?.id, players?.length])
}
