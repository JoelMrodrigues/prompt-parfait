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
import { useToast } from '../../../contexts/ToastContext'
import { supabase } from '../../../lib/supabase'
import {
  fetchSoloqChampionStats,
  fetchSoloqMatchIds,
  fetchUnenrichedMatchIds,
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
import { buildSoloqMatchRow } from '../../../lib/soloq/matchRowBuilder'
import { setSyncStatus } from '../../../lib/syncStatus'

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
  const { error: toastError } = useToast()
  const toastRef = useRef(toastError)
  toastRef.current = toastError
  const runningRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const updatePlayerRef = useRef(updatePlayer)
  const playersRef = useRef(players)
  const teamIdRef = useRef<string | null>(null)
  updatePlayerRef.current = updatePlayer
  playersRef.current = players

  useEffect(() => {
    if (!team?.id || !players?.length) return
    const toSync = players.filter(hasValidPseudo)
    if (!toSync.length) return
    if (runningRef.current) return

    abortRef.current = false
    teamIdRef.current = team.id

    const runLoop = async () => {
      const currentPlayers = playersRef.current
      const updatePlayerFn = updatePlayerRef.current
      const listToSync = (currentPlayers || []).filter(hasValidPseudo)
      const isFlexTeam = team?.team_type === 'flex' || team?.features?.flex === true
      const queueSuffix = isFlexTeam ? '&queue=flex' : ''

      // Nouveau AbortController pour chaque cycle — annule toutes les requêtes en vol si abort
      const controller = new AbortController()
      abortControllerRef.current = controller
      const signal = controller.signal

      runningRef.current = true
      logger.debug(LOG_PREFIX, '--- Début du cycle ---', listToSync.length, 'joueur(s)')
      let upsertErrorShown = false

      try {
        for (let i = 0; i < listToSync.length; i++) {
          if (abortRef.current) {
            logger.debug(LOG_PREFIX, 'Cycle interrompu (changement équipe)')
            break
          }
          const player = listToSync[i]
          const pseudo = (player.pseudo || '').trim()
          const name = player.player_name || pseudo
          const region = (player.region || 'euw1').toLowerCase()
          setSyncStatus({ isSyncing: true, currentPlayer: name, currentIndex: i + 1, totalPlayers: listToSync.length })

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
              `/api/riot/match-count?${buildParams()}${queueSuffix}`, { signal }
            )
            let countData = await countRes.json().catch(() => ({}))
            if (countRes.status === 429 && (countData.retry_after ?? countData.retryAfter)) {
              const wait = Math.max(2000, (countData.retry_after ?? countData.retryAfter) * 1000)
              await delay(wait)
              countRes = await apiFetch(
                `/api/riot/match-count?${buildParams()}`, { signal }
              )
              countData = await countRes.json().catch(() => ({}))
            }
            if (!countData.success || typeof countData.total !== 'number') {
              // PUUID invalide/corrompu → relance sans PUUID pour forcer un fresh lookup Riot
              if (countRes.status === 400 && cachedPuuid && /decrypt/i.test(countData.error || '')) {
                logger.warn(LOG_PREFIX, name, '| PUUID invalide — relance sans PUUID (fresh lookup Riot)')
                cachedPuuid = null
                const retryRes = await apiFetch(`/api/riot/match-count?pseudo=${encodeURIComponent(pseudo)}&region=${encodeURIComponent(region)}${queueSuffix}`, { signal })
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
              await updatePlayerFn(player.id, { [isFlexTeam ? 'soloq_total_match_ids_flex' : 'soloq_total_match_ids']: 0 })
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }

            // ─── 2) Récupérer uniquement les totalRiot premiers IDs (pages de 100) ───
            const allRiotIds: string[] = []
            let start = 0
            let idsRetry404 = 0
            const MAX_PAGES = Math.ceil(totalRiot / MATCH_IDS_PAGE) + 2
            let pageCount = 0
            while (allRiotIds.length < totalRiot && pageCount < MAX_PAGES) {
              if (abortRef.current) break
              pageCount++
              const idsRes = await apiFetch(
                `/api/riot/match-ids?${buildParams(`start=${start}&count=${MATCH_IDS_PAGE}`)}${queueSuffix}`, { signal }
              )
              const idsData = await idsRes.json().catch(() => ({}))
              if (idsRes.status === 429) {
                const wait = Math.max(2000, ((idsData.retry_after ?? idsData.retryAfter) || 2) * 1000)
                await delay(wait)
                pageCount-- // ne pas compter cette tentative
                continue
              }
              // Retry unique sur 404 (joueur introuvable transient côté Riot)
              if (idsRes.status === 404 && idsRetry404 < 1) {
                idsRetry404++
                logger.warn(LOG_PREFIX, name, '| match-ids 404 — retry dans 3s...')
                await delay(3000)
                pageCount--
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
            const { data: existingIds } = await fetchSoloqMatchIds(player.id, 'primary', SEASON_16_START_MS, isFlexTeam ? 'flex' : 'soloq')
            const existingSet = new Set(existingIds || [])
            const missingIds = idsToSync.filter((id: string) => !existingSet.has(id))

            // ─── 4) Détails uniquement pour les manquants, upsert Supabase ───
            if (missingIds.length > 0) {
              for (let c = 0; c < missingIds.length; c += DETAILS_CHUNK) {
                const chunk = missingIds.slice(c, c + DETAILS_CHUNK)
                try {
                  const detailsRes = await apiFetch(
                    `/api/riot/match-details?${buildParams(`matchIds=${chunk.join(',')}`)}${queueSuffix}`, { signal }
                  )
                  const detailsData = await detailsRes.json().catch(() => ({}))
                  if (detailsRes.status === 429 && (detailsData.retry_after ?? detailsData.retryAfter)) {
                    const wait = Math.max(2000, (detailsData.retry_after ?? detailsData.retryAfter) * 1000)
                    await delay(wait)
                    c -= DETAILS_CHUNK
                    continue
                  }
                  if (detailsData.success && Array.isArray(detailsData.matches) && detailsData.matches.length > 0 && supabase) {
                    const rows = detailsData.matches.map((m: any) => buildSoloqMatchRow(m, player.id, 'primary', isFlexTeam ? 'flex' : 'soloq'))
                    const { error: upsertErr } = await upsertSoloqMatches(rows)
                    if (upsertErr) {
                      logger.warn(LOG_PREFIX, name, '| upsert erreur:', upsertErr)
                      if (!upsertErrorShown) {
                        upsertErrorShown = true
                        toastRef.current(`Erreur sauvegarde SoloQ (${name}) — les données seront re-tentées au prochain cycle`)
                      }
                    }
                  }
                } catch (err) {
                  if (err instanceof Error && err.name === 'AbortError') throw err
                  logger.warn(LOG_PREFIX, name, '| erreur match-details:', err)
                }
                await delay(DELAY_BETWEEN_REQUESTS_MS)
              }
            }

            // ─── 4b) Ré-enrichissement des parties sans match_json (max 60/cycle) ───
            const { data: unenrichedIds } = await fetchUnenrichedMatchIds(player.id, 'primary', SEASON_16_START_MS, 60, isFlexTeam ? 'flex' : undefined)
            if (unenrichedIds && unenrichedIds.length > 0) {
              logger.debug(LOG_PREFIX, name, `| ${unenrichedIds.length} partie(s) à enrichir`)
              for (let c = 0; c < unenrichedIds.length; c += DETAILS_CHUNK) {
                const chunk = unenrichedIds.slice(c, c + DETAILS_CHUNK)
                try {
                  const detailsRes = await apiFetch(
                    `/api/riot/match-details?${buildParams(`matchIds=${chunk.join(',')}`)}${queueSuffix}`, { signal }
                  )
                  const detailsData = await detailsRes.json().catch(() => ({}))
                  if (detailsRes.status === 429 && (detailsData.retry_after ?? detailsData.retryAfter)) {
                    const wait = Math.max(2000, (detailsData.retry_after ?? detailsData.retryAfter) * 1000)
                    await delay(wait)
                    c -= DETAILS_CHUNK
                    continue
                  }
                  if (detailsData.success && Array.isArray(detailsData.matches) && detailsData.matches.length > 0 && supabase) {
                    const rows = detailsData.matches.map((m: any) => buildSoloqMatchRow(m, player.id, 'primary', isFlexTeam ? 'flex' : 'soloq'))
                    const { error: upsertErr } = await upsertSoloqMatches(rows)
                    if (upsertErr) {
                      logger.warn(LOG_PREFIX, name, '| enrichissement upsert erreur:', upsertErr)
                      if (!upsertErrorShown) {
                        upsertErrorShown = true
                        toastRef.current(`Erreur sauvegarde SoloQ (${name}) — les données seront re-tentées au prochain cycle`)
                      }
                    }
                  }
                } catch (err) {
                  if (err instanceof Error && err.name === 'AbortError') throw err
                  logger.warn(LOG_PREFIX, name, '| enrichissement match-details erreur:', err)
                }
                await delay(DELAY_BETWEEN_REQUESTS_MS)
              }
            }

            // total OFFICIEL Riot (pas le count en base)
            await updatePlayerFn(player.id, { [isFlexTeam ? 'soloq_total_match_ids_flex' : 'soloq_total_match_ids']: totalRiot })

            // ─── 5) Rang (sync-rank) ───
            await delay(DELAY_BETWEEN_REQUESTS_MS)
            // Pour les équipes flex : sync du rang flex (RANKED_FLEX_SR)
            const rankQueueParam = isFlexTeam ? '&queueType=flex' : ''
            let rankRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}${rankQueueParam}`, { signal })
            let rankData = await rankRes.json().catch(() => ({}))
            if (rankRes.status === 429 && (rankData.retry_after ?? rankData.retryAfter)) {
              const wait = Math.max(2000, (rankData.retry_after ?? rankData.retryAfter) * 1000)
              await delay(wait)
              rankRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}${rankQueueParam}`, { signal })
              rankData = await rankRes.json().catch(() => ({}))
            }
            if (rankData.success) {
              const updates: Record<string, unknown> = {}
              if (rankData.rank != null) {
                const newRank: string = rankData.rank
                const lpMatch = newRank.match(/(\d+)\s*LP/i)
                const currentLp = lpMatch ? parseInt(lpMatch[1], 10) : null
                if (isFlexTeam) {
                  const peakLp: number | null | undefined = (player as any).peak_lp_flex_s16
                  updates.rank_flex = newRank
                  updates.rank_flex_updated_at = new Date().toISOString()
                  if (currentLp != null && (peakLp == null || currentLp > peakLp)) {
                    updates.peak_lp_flex_s16 = currentLp
                    updates.peak_rank_flex_s16 = newRank
                  }
                } else {
                  const peakLp: number | null | undefined = (player as any).peak_lp_s16
                  updates.rank = newRank
                  updates.rank_updated_at = new Date().toISOString()
                  if (currentLp != null && (peakLp == null || currentLp > peakLp)) {
                    updates.peak_lp_s16 = currentLp
                    updates.peak_rank_s16 = newRank
                  }
                }
              }
              // Détection automatique de changement de pseudo
              if (rankData.currentPseudo && rankData.currentPseudo.toLowerCase() !== (player.pseudo || '').toLowerCase()) {
                logger.info(LOG_PREFIX, name, '| Changement de pseudo détecté:', player.pseudo, '→', rankData.currentPseudo)
                updates.pseudo = rankData.currentPseudo
              }
              if (Object.keys(updates).length > 0) await updatePlayerFn(player.id, updates)
            } else {
              logger.warn(LOG_PREFIX, name, '| sync-rank erreur:', rankData.error || rankRes.status)
            }

            // Pour les équipes flex : sync du rang soloq également (pour affichage JoueursPage)
            if (isFlexTeam) {
              await delay(DELAY_BETWEEN_REQUESTS_MS)
              let soloqRankRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}`, { signal })
              let soloqRankData = await soloqRankRes.json().catch(() => ({}))
              if (soloqRankRes.status === 429 && (soloqRankData.retry_after ?? soloqRankData.retryAfter)) {
                await delay(Math.max(2000, (soloqRankData.retry_after ?? soloqRankData.retryAfter) * 1000))
                soloqRankRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}`, { signal })
                soloqRankData = await soloqRankRes.json().catch(() => ({}))
              }
              if (soloqRankData.success && soloqRankData.rank != null) {
                const soloqUpdates: Record<string, unknown> = {}
                const newRank: string = soloqRankData.rank
                const lpMatch = newRank.match(/(\d+)\s*LP/i)
                const currentLp = lpMatch ? parseInt(lpMatch[1], 10) : null
                const peakLp: number | null | undefined = (player as any).peak_lp_s16
                soloqUpdates.rank = newRank
                soloqUpdates.rank_updated_at = new Date().toISOString()
                if (currentLp != null && (peakLp == null || currentLp > peakLp)) {
                  soloqUpdates.peak_lp_s16 = currentLp
                  soloqUpdates.peak_rank_s16 = newRank
                }
                if (Object.keys(soloqUpdates).length > 0) await updatePlayerFn(player.id, soloqUpdates)
              }
            }

            // ─── 6) Top 5 via Supabase, hors remakes ───
            const { data: rows } = await fetchSoloqChampionStats({
              playerId: player.id,
              accountSource: 'primary',
              seasonStart: SEASON_16_START_MS,
              minDuration: REMAKE_THRESHOLD_SEC,
              queueType: isFlexTeam ? 'flex' : 'soloq',
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
            // AbortError = sync annulée volontairement (changement d'équipe) — pas une erreur
            if (e instanceof Error && e.name === 'AbortError') break
            logger.warn(LOG_PREFIX, 'Erreur joueur', name, e)
            await delay(DELAY_BETWEEN_PLAYERS_MS)
          }
        }

        // ─── Passe secondaire : comptes alternatifs (soloq + flex selon type d'équipe) ───────
        const withSecondary = listToSync.filter((p) => {
          const s = ((p.secondary_account || '') as string).trim()
          return s.length > 0 && (s.includes('#') || s.includes('/'))
        })
        logger.debug(LOG_PREFIX, `--- Passe secondaire --- ${withSecondary.length} joueur(s) avec alt (queue: ${isFlexTeam ? 'flex' : 'soloq'})`)

        for (let i = 0; i < withSecondary.length; i++) {
          if (abortRef.current) break
          const player = withSecondary[i]
          const pseudo = (player.secondary_account || '').trim()
          const name = player.player_name || pseudo
          const region = (player.region || 'euw1').toLowerCase()
          setSyncStatus({ isSyncing: true, currentPlayer: name, currentIndex: i + 1, totalPlayers: withSecondary.length, isSecondaryPass: true })

          let cachedPuuid: string | null = (player as any).puuid_secondary || null

          const buildParams = (extra = '') => {
            let p = `pseudo=${encodeURIComponent(pseudo)}&region=${encodeURIComponent(region)}`
            if (cachedPuuid) p += `&puuid=${encodeURIComponent(cachedPuuid)}`
            if (extra) p += `&${extra}`
            return p
          }

          try {
            // 1) Total S16
            let countRes = await apiFetch(`/api/riot/match-count?${buildParams()}${queueSuffix}`, { signal })
            let countData = await countRes.json().catch(() => ({}))
            if (countRes.status === 429 && (countData.retry_after ?? countData.retryAfter)) {
              await delay(Math.max(2000, (countData.retry_after ?? countData.retryAfter) * 1000))
              countRes = await apiFetch(`/api/riot/match-count?${buildParams()}${queueSuffix}`, { signal })
              countData = await countRes.json().catch(() => ({}))
            }
            if (!countData.success || typeof countData.total !== 'number') {
              logger.warn(LOG_PREFIX, name, '(alt) | match-count erreur:', countData.error || countRes.status)
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }
            const totalRiot = countData.total
            if (countData.puuid && !cachedPuuid) {
              cachedPuuid = countData.puuid
              await updatePlayerFn(player.id, { puuid_secondary: cachedPuuid }).catch(() => {})
            }
            await delay(DELAY_BETWEEN_REQUESTS_MS)

            if (totalRiot === 0) {
              await updatePlayerFn(player.id, { soloq_total_match_ids_secondary: 0 })
              await delay(DELAY_BETWEEN_PLAYERS_MS)
              continue
            }

            // 2) IDs
            const allRiotIds: string[] = []
            let start = 0
            const MAX_PAGES = Math.ceil(totalRiot / MATCH_IDS_PAGE) + 2
            let pageCount = 0
            while (allRiotIds.length < totalRiot && pageCount < MAX_PAGES) {
              if (abortRef.current) break
              pageCount++
              const idsRes = await apiFetch(`/api/riot/match-ids?${buildParams(`start=${start}&count=${MATCH_IDS_PAGE}`)}${queueSuffix}`, { signal })
              const idsData = await idsRes.json().catch(() => ({}))
              if (idsRes.status === 429) { await delay(Math.max(2000, ((idsData.retry_after ?? idsData.retryAfter) || 2) * 1000)); pageCount--; continue }
              if (!idsData.success || !Array.isArray(idsData.matchIds)) { logger.warn(LOG_PREFIX, name, '(alt) | match-ids erreur'); break }
              if (idsData.puuid && !cachedPuuid) { cachedPuuid = idsData.puuid; await updatePlayerFn(player.id, { puuid_secondary: cachedPuuid }).catch(() => {}) }
              for (const id of idsData.matchIds) { if (allRiotIds.length >= totalRiot) break; allRiotIds.push(id) }
              if (idsData.matchIds.length < MATCH_IDS_PAGE || !idsData.hasMore) break
              start += MATCH_IDS_PAGE
              await delay(DELAY_BETWEEN_REQUESTS_MS)
            }
            const idsToSync = allRiotIds.slice(0, totalRiot)

            // 3) Diff avec base
            const { data: existingIds } = await fetchSoloqMatchIds(player.id, 'secondary', SEASON_16_START_MS, isFlexTeam ? 'flex' : undefined)
            const existingSet = new Set(existingIds || [])
            const missingIds = idsToSync.filter((id: string) => !existingSet.has(id))

            // 4) Détails manquants
            if (missingIds.length > 0) {
              for (let c = 0; c < missingIds.length; c += DETAILS_CHUNK) {
                const chunk = missingIds.slice(c, c + DETAILS_CHUNK)
                try {
                  const detailsRes = await apiFetch(`/api/riot/match-details?${buildParams(`matchIds=${chunk.join(',')}`)}${queueSuffix}`, { signal })
                  const detailsData = await detailsRes.json().catch(() => ({}))
                  if (detailsRes.status === 429 && (detailsData.retry_after ?? detailsData.retryAfter)) {
                    await delay(Math.max(2000, (detailsData.retry_after ?? detailsData.retryAfter) * 1000))
                    c -= DETAILS_CHUNK; continue
                  }
                  if (detailsData.success && Array.isArray(detailsData.matches) && detailsData.matches.length > 0) {
                    const rows = detailsData.matches.map((m: any) => buildSoloqMatchRow(m, player.id, 'secondary', isFlexTeam ? 'flex' : 'soloq'))
                    await upsertSoloqMatches(rows)
                  }
                } catch (err) {
                  if (err instanceof Error && err.name === 'AbortError') throw err
                  logger.warn(LOG_PREFIX, name, '(alt) | erreur match-details:', err)
                }
                await delay(DELAY_BETWEEN_REQUESTS_MS)
              }
            }

            await updatePlayerFn(player.id, { soloq_total_match_ids_secondary: totalRiot })

            // ─── Rang compte secondaire ───────────────────────────────────────
            await delay(DELAY_BETWEEN_REQUESTS_MS)
            let rankSecRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}`, { signal })
            let rankSecData = await rankSecRes.json().catch(() => ({}))
            if (rankSecRes.status === 429 && (rankSecData.retry_after ?? rankSecData.retryAfter)) {
              await delay(Math.max(2000, (rankSecData.retry_after ?? rankSecData.retryAfter) * 1000))
              rankSecRes = await apiFetch(`/api/riot/sync-rank?${buildParams()}`, { signal })
              rankSecData = await rankSecRes.json().catch(() => ({}))
            }
            if (rankSecData.success) {
              const secUpdates: Record<string, unknown> = {}
              if (rankSecData.rank != null) {
                const newRankSec: string = rankSecData.rank
                const lpMatchSec = newRankSec.match(/(\d+)\s*LP/i)
                const currentLpSec = lpMatchSec ? parseInt(lpMatchSec[1], 10) : null
                const peakLpSec: number | null | undefined = (player as any).peak_lp_s16_secondary
                secUpdates.rank_secondary = newRankSec
                if (currentLpSec != null && (peakLpSec == null || currentLpSec > peakLpSec)) {
                  secUpdates.peak_lp_s16_secondary = currentLpSec
                  secUpdates.peak_rank_s16_secondary = newRankSec
                }
              }
              // Détection automatique de changement de pseudo secondaire
              if (rankSecData.currentPseudo && rankSecData.currentPseudo.toLowerCase() !== (player.secondary_account || '').toLowerCase()) {
                logger.info(LOG_PREFIX, name, '(alt) | Changement de pseudo détecté:', player.secondary_account, '→', rankSecData.currentPseudo)
                secUpdates.secondary_account = rankSecData.currentPseudo
              }
              if (Object.keys(secUpdates).length > 0) await updatePlayerFn(player.id, secUpdates)
            } else {
              logger.warn(LOG_PREFIX, name, '(alt) | sync-rank erreur:', rankSecData.error || rankSecRes.status)
            }

            await delay(DELAY_BETWEEN_PLAYERS_MS)
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') break
            logger.warn(LOG_PREFIX, 'Erreur joueur (alt)', name, e)
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
        setSyncStatus({ isSyncing: false, currentPlayer: '', isSecondaryPass: false, lastCycleAt: Date.now() })
      }

      if (!abortRef.current) {
        timeoutRef.current = setTimeout(runLoop, SYNC_LOOP_INTERVAL_MS)
      }
    }

    const t = setTimeout(() => {
      runLoop()
    }, DELAY_BEFORE_FIRST_RUN_MS)
    logger.debug(LOG_PREFIX, 'Démarré (premier cycle dans', DELAY_BEFORE_FIRST_RUN_MS / 1000, 's)')

    return () => {
      abortRef.current = true
      // Annule immédiatement toutes les requêtes réseau en vol
      abortControllerRef.current?.abort()
      clearTimeout(t)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      runningRef.current = false
    }
  }, [team?.id, players?.length])
}
