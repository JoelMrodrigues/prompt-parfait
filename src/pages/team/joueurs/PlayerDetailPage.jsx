/**
 * Page détail d'un joueur - Stats solo q, pool champions, liens
 * Sidebar interne: Général, Solo Q, Team, Best Champs, Tableau Solo Q/Team, Points forts/faibles
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { usePlayerSync } from '../hooks/usePlayerSync'
import { getChampionImage, getBigChampionImage } from '../../../lib/championImages'
import { TIER_KEYS } from '../champion-pool/constants/tiers'
import { TierTable } from '../champion-pool/components/TierTable'
import { PlayerDetailSidebar } from './components/PlayerDetailSidebar'
import { PlayerTeamStatsSection } from './components/PlayerTeamStatsSection'
import { usePlayerTeamStats } from '../hooks/usePlayerTeamStats'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

const getBackendUrl = () => (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const PAGE_SIZE = 20
// Début saison 16 LoL : 8 janvier 2026 00:00 UTC (millisecondes)
const SEASON_16_START_MS = 1767830400000

function rowToMatch(row) {
  return {
    matchId: row.riot_match_id,
    championId: row.champion_id,
    championName: row.champion_name,
    win: !!row.win,
    kills: row.kills ?? 0,
    deaths: row.deaths ?? 0,
    assists: row.assists ?? 0,
    gameDuration: row.game_duration ?? 0,
    gameCreation: row.game_creation ?? 0,
  }
}

const ROLE_LABELS = {
  TOP: 'Top',
  JNG: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUP: 'Support',
}

function getRankColor(rank) {
  if (!rank) return 'from-gray-500 to-gray-700'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'from-yellow-400 via-blue-500 to-yellow-400'
  if (r.includes('grandmaster')) return 'from-orange-500 to-orange-700'
  if (r.includes('master')) return 'from-purple-500 to-purple-700'
  if (r.includes('diamond')) return 'from-blue-500 to-blue-700'
  if (r.includes('emerald')) return 'from-emerald-500 to-emerald-700'
  if (r.includes('platinum')) return 'from-cyan-500 to-cyan-700'
  if (r.includes('gold')) return 'from-yellow-500 to-yellow-700'
  if (r.includes('silver')) return 'from-gray-400 to-gray-600'
  if (r.includes('bronze')) return 'from-orange-600 to-orange-800'
  if (r.includes('iron')) return 'from-gray-600 to-gray-800'
  return 'from-gray-500 to-gray-700'
}

export const PlayerDetailPage = () => {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { players = [], updatePlayer, refetch } = useTeam()
  const { syncExistingPlayer } = usePlayerSync()
  const { stats: teamStats, teamTotalsByMatch, loading: teamStatsLoading } = usePlayerTeamStats(playerId)
  const [selectedSection, setSelectedSection] = useState('general')
  const [syncing, setSyncing] = useState(false)
  const [matchHistory, setMatchHistory] = useState([])
  const [matchHistoryLoading, setMatchHistoryLoading] = useState(false)
  const [matchHistoryHasMore, setMatchHistoryHasMore] = useState(false)
  const [matchHistoryLoadMoreLoading, setMatchHistoryLoadMoreLoading] = useState(false)
  const [matchHistoryCountInDb, setMatchHistoryCountInDb] = useState(null)
  const [loadOlderFromRiotLoading, setLoadOlderFromRiotLoading] = useState(false)
  const [load20FromRiotLoading, setLoad20FromRiotLoading] = useState(false)
  const [soloqTopChampionsFromDb, setSoloqTopChampionsFromDb] = useState([])
  const [soloqTopChampionsLoading, setSoloqTopChampionsLoading] = useState(false)
  const [selectedSoloqAccount, setSelectedSoloqAccount] = useState(1)
  const matchHistoryPlayerIdRef = useRef(null)

  const player = players.find((p) => p.id === playerId)

  const activeSoloqPseudo = selectedSoloqAccount === 1
    ? (player?.pseudo ?? '')
    : (player?.secondary_account ?? '')
  const soloqAccountSource = selectedSoloqAccount === 1 ? 'primary' : 'secondary'

  const totalFromRiot = selectedSoloqAccount === 1
    ? (player?.soloq_total_match_ids ?? null)
    : (player?.soloq_total_match_ids_secondary ?? null)
  const countInDb = matchHistoryCountInDb
  const toLoad = (totalFromRiot != null && countInDb != null && totalFromRiot > countInDb)
    ? totalFromRiot - countInDb
    : null

  const loadMatchHistoryFromSupabase = async (offset, limit, append) => {
    if (!player?.id || !supabase) return
    const loading = offset === 0 ? setMatchHistoryLoading : setMatchHistoryLoadMoreLoading
    loading(true)
    try {
      const query = supabase
        .from('player_soloq_matches')
        .select('*', { count: offset === 0 ? 'exact' : undefined })
        .eq('player_id', player.id)
        .eq('account_source', soloqAccountSource)
        .gte('game_creation', SEASON_16_START_MS)
        .order('game_creation', { ascending: false })
        .range(offset, offset + limit - 1)
      const { data: rows, error, count } = await query
      if (error) throw error
      if (offset === 0 && count != null) setMatchHistoryCountInDb(count)
      const matches = (rows || []).map(rowToMatch).filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
      if (append) {
        setMatchHistory((prev) => [...prev, ...matches])
      } else {
        setMatchHistory(matches)
        matchHistoryPlayerIdRef.current = `${player.id}:${soloqAccountSource}`
      }
      setMatchHistoryHasMore(matches.length === limit)
    } catch (e) {
      console.error('loadMatchHistoryFromSupabase', e)
      if (!append) {
        setMatchHistory([])
        setMatchHistoryHasMore(false)
        setMatchHistoryCountInDb(null)
      }
    } finally {
      setMatchHistoryLoading(false)
      setMatchHistoryLoadMoreLoading(false)
    }
  }

  /** Charger les N games plus anciennes depuis Riot (au-delà de ce qu'on a en base) et les enregistrer */
  const loadOlderGamesFromRiot = async () => {
    if (!activeSoloqPseudo?.trim() || (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))) return
    const start = countInDb ?? 0
    const count = Math.min(PAGE_SIZE, toLoad != null && toLoad > 0 ? toLoad : PAGE_SIZE)
    setLoadOlderFromRiotLoading(true)
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/riot/match-history?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}&start=${start}&limit=${count}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success || !Array.isArray(data.matches)) return
      const s16Matches = data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
      if (s16Matches.length > 0 && supabase) {
        const rows = s16Matches.map((m) => ({
          player_id: player.id,
          riot_match_id: m.matchId,
          account_source: soloqAccountSource,
          champion_id: m.championId ?? null,
          champion_name: m.championName ?? null,
          win: !!m.win,
          kills: m.kills ?? 0,
          deaths: m.deaths ?? 0,
          assists: m.assists ?? 0,
          game_duration: m.gameDuration ?? 0,
          game_creation: m.gameCreation ?? 0,
        }))
        await supabase.from('player_soloq_matches').upsert(rows, {
          onConflict: 'player_id,riot_match_id',
        })
        const s16Matches = data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
        const newCount = (countInDb ?? 0) + rows.length
        setMatchHistoryCountInDb(newCount)
        setMatchHistory((prev) => [...prev, ...s16Matches])
        loadSoloqTopChampionsFromDb()
        const knownTotal = selectedSoloqAccount === 1
          ? (player?.soloq_total_match_ids ?? 0)
          : (player?.soloq_total_match_ids_secondary ?? 0)
        if (newCount > knownTotal) {
          try {
            const field = selectedSoloqAccount === 1 ? 'soloq_total_match_ids' : 'soloq_total_match_ids_secondary'
            await updatePlayer(player.id, { [field]: newCount })
            await refetch()
          } catch (e) {
            if (e?.code !== 'PGRST204') throw e
          }
        }
      }
    } catch (e) {
      console.error('loadOlderGamesFromRiot', e)
    } finally {
      setLoadOlderFromRiotLoading(false)
    }
  }

  /** Charger les 20 dernières parties depuis Riot (surtout pour compte 2, ou rafraîchir compte 1) */
  const handleLoad20FromRiot = async () => {
    if (!activeSoloqPseudo?.trim() || (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))) {
      alert('Pseudo au format GameName#TagLine ou GameName/TagLine requis pour ce compte')
      return
    }
    setLoad20FromRiotLoading(true)
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success) throw new Error(data.error || 'Erreur API')
      const field = selectedSoloqAccount === 1 ? 'soloq_total_match_ids' : 'soloq_total_match_ids_secondary'
      if (typeof data.totalMatchIds === 'number') {
        try {
          await updatePlayer(player.id, { [field]: data.totalMatchIds })
          await refetch()
        } catch (e) {
          if (e?.code !== 'PGRST204') throw e
        }
      }
      const load20S16 = Array.isArray(data.matches) ? data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS) : []
      if (load20S16.length > 0 && supabase) {
        const rows = load20S16.map((m) => ({
          player_id: player.id,
          riot_match_id: m.matchId,
          account_source: soloqAccountSource,
          champion_id: m.championId ?? null,
          champion_name: m.championName ?? null,
          win: !!m.win,
          kills: m.kills ?? 0,
          deaths: m.deaths ?? 0,
          assists: m.assists ?? 0,
          game_duration: m.gameDuration ?? 0,
          game_creation: m.gameCreation ?? 0,
        }))
        await supabase.from('player_soloq_matches').upsert(rows, {
          onConflict: 'player_id,riot_match_id',
        })
      }
      matchHistoryPlayerIdRef.current = null
      await loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
      await loadSoloqTopChampionsFromDb()
    } catch (e) {
      console.error('handleLoad20FromRiot', e)
      alert('Erreur: ' + (e.message || 'Impossible de charger les parties'))
    } finally {
      setLoad20FromRiotLoading(false)
    }
  }

  /** Top 5 champions les plus joués + winrate, calculés à partir des games en base */
  const loadSoloqTopChampionsFromDb = async () => {
    if (!player?.id || !supabase) return
    setSoloqTopChampionsLoading(true)
    try {
      const { data: rows, error } = await supabase
        .from('player_soloq_matches')
        .select('champion_name, win')
        .eq('player_id', player.id)
        .eq('account_source', soloqAccountSource)
        .gte('game_creation', SEASON_16_START_MS)
      if (error) throw error
      const byChamp = new Map()
      for (const row of rows || []) {
        const name = row.champion_name || 'Unknown'
        if (!byChamp.has(name)) byChamp.set(name, { games: 0, wins: 0 })
        const stat = byChamp.get(name)
        stat.games += 1
        if (row.win) stat.wins += 1
      }
      const list = Array.from(byChamp.entries())
        .map(([name, s]) => ({
          name,
          games: s.games,
          wins: s.wins,
          winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 5)
      setSoloqTopChampionsFromDb(list)
    } catch (e) {
      console.error('loadSoloqTopChampionsFromDb', e)
      setSoloqTopChampionsFromDb([])
    } finally {
      setSoloqTopChampionsLoading(false)
    }
  }

  // Réinitialiser l’historique quand on change de joueur
  useEffect(() => {
    setMatchHistory([])
    setMatchHistoryHasMore(false)
    setMatchHistoryCountInDb(null)
    setSoloqTopChampionsFromDb([])
    matchHistoryPlayerIdRef.current = null
  }, [player?.id, selectedSoloqAccount])

  // Charger les 20 premières games depuis Supabase à l’affichage de l’onglet Solo Q
  useEffect(() => {
    if (selectedSection !== 'soloq' || !player?.id) return
    const refKey = `${player.id}:${soloqAccountSource}`
    if (matchHistoryPlayerIdRef.current === refKey) {
      loadSoloqTopChampionsFromDb()
      return
    }
    loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
    loadSoloqTopChampionsFromDb()
  }, [selectedSection, player?.id, selectedSoloqAccount])

  const generateDpmLink = (pseudo) => {
    if (!pseudo) return ''
    const formatted = pseudo.replace(/#/g, '-')
    return `https://dpm.lol/${encodeURIComponent(formatted)}?queue=solo`
  }

  const handleSync = async () => {
    if (!player?.pseudo) return
    if (!player.pseudo.includes('#') && !player.pseudo.includes('/')) {
      alert('Pseudo au format GameName#TagLine ou GameName/TagLine requis')
      return
    }
    setSyncing(true)
    try {
      const updateData = await syncExistingPlayer(player)
      if (updateData && Object.keys(updateData).length > 0) {
        await updatePlayer(player.id, updateData)
        await refetch()
      }
    } catch (e) {
      console.error(e)
      alert('Erreur sync: ' + (e.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  /** Actualiser le rank + charger les 20 dernières games depuis Riot et les sauvegarder dans Supabase */
  const handleRefreshData = async () => {
    if (!player?.pseudo || (!player.pseudo.includes('#') && !player.pseudo.includes('/'))) {
      alert('Pseudo au format GameName#TagLine ou GameName/TagLine requis')
      return
    }
    setSyncing(true)
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(player.pseudo.trim())}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success) {
        throw new Error(data.error || 'Erreur API')
      }
      const updates = {}
      if (data.rank != null) updates.rank = data.rank
      if (typeof data.totalMatchIds === 'number') updates.soloq_total_match_ids = data.totalMatchIds
      if (Object.keys(updates).length > 0) {
        try {
          await updatePlayer(player.id, updates)
          await refetch()
        } catch (err) {
          if (err?.code === 'PGRST204' && updates.soloq_total_match_ids != null) {
            const { soloq_total_match_ids: _, ...rest } = updates
            if (Object.keys(rest).length > 0) {
              await updatePlayer(player.id, rest)
              await refetch()
            }
          } else {
            throw err
          }
        }
      }
      const refreshS16Matches = Array.isArray(data.matches) ? data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS) : []
      if (refreshS16Matches.length > 0) {
        if (supabase) {
          const rows = refreshS16Matches.map((m) => ({
            player_id: player.id,
            riot_match_id: m.matchId,
            account_source: 'primary',
            champion_id: m.championId ?? null,
            champion_name: m.championName ?? null,
            win: !!m.win,
            kills: m.kills ?? 0,
            deaths: m.deaths ?? 0,
            assists: m.assists ?? 0,
            game_duration: m.gameDuration ?? 0,
            game_creation: m.gameCreation ?? 0,
          }))
          await supabase.from('player_soloq_matches').upsert(rows, {
            onConflict: 'player_id,riot_match_id',
          })
        }
        if (selectedSection === 'soloq') {
          if (supabase) {
            matchHistoryPlayerIdRef.current = null
            await loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
            await loadSoloqTopChampionsFromDb()
          } else {
            setMatchHistory(refreshS16Matches)
            setMatchHistoryHasMore(false)
            matchHistoryPlayerIdRef.current = player.id
          }
        }
      }
    } catch (e) {
      console.error(e)
      alert('Erreur actualisation: ' + (e.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Joueur introuvable</p>
        <button
          onClick={() => navigate('/team/joueurs')}
          className="text-accent-blue hover:underline"
        >
          Retour aux joueurs
        </button>
      </div>
    )
  }

  const roleLabel = ROLE_LABELS[player.position] || player.position
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null

  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try {
      topChampions = JSON.parse(topChampions)
    } catch {
      topChampions = []
    }
  }
  if (!Array.isArray(topChampions)) topChampions = []

  const mostPlayedChamp = topChampions[0]
  const mostPlayedName = mostPlayedChamp ? (mostPlayedChamp.name || mostPlayedChamp) : null
  const bigChampBg = mostPlayedName ? getBigChampionImage(mostPlayedName) : null

  const tiersRaw = (player.champion_pools || []).reduce((acc, cp) => {
    const tier = cp.tier || 'A'
    if (TIER_KEYS.includes(tier)) {
      if (!acc[tier]) acc[tier] = []
      acc[tier].push({ id: cp.champion_id, name: cp.champion_id })
    }
    return acc
  }, {})
  const tiersForTable = Object.fromEntries(TIER_KEYS.map((k) => [k, tiersRaw[k] || []]))

  const renderSection = () => {
    switch (selectedSection) {
      case 'general':
        return (
          <section className="space-y-6">
            <div
              className={`relative rounded-xl p-6 overflow-hidden ${bigChampBg ? '' : `bg-gradient-to-r ${getRankColor(player.rank)}`}`}
              style={bigChampBg ? {
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.4) 100%), url(${bigChampBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
              } : undefined}
            >
              <div className="relative z-10">
                <h1 className="font-display text-2xl font-bold text-white mb-1">
                  {player.player_name || 'Joueur'}
                </h1>
              <p className="text-white/90 mb-3">{player.pseudo || '—'}</p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                  {roleLabel}
                </span>
                {player.rank && (
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                    {player.rank}
                  </span>
                )}
              </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.opgg_link && (
                <a
                  href={player.opgg_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={16} />
                  OP.gg
                </a>
              )}
              {dpmLink && (
                <>
                  <a
                    href={dpmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    dpm.lol
                  </a>
                  <button
                    onClick={handleRefreshData}
                    disabled={syncing}
                    className="px-4 py-2 bg-accent-blue/20 border border-accent-blue rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    Actualiser les données (rang + 20 dernières games)
                  </button>
                </>
              )}
              {player.lolpro_link && (
                <a
                  href={player.lolpro_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={16} />
                  Lol Pro
                </a>
              )}
            </div>
          </section>
        )
      case 'soloq':
        return (
          <section className="space-y-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSelectedSoloqAccount(1)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSoloqAccount === 1
                    ? 'bg-accent-blue text-white border border-accent-blue'
                    : 'bg-dark-card border border-dark-border text-gray-400 hover:border-accent-blue/50 hover:text-white'
                }`}
              >
                Compte 1 · {player.pseudo || '—'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSoloqAccount(2)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSoloqAccount === 2
                    ? 'bg-accent-blue text-white border border-accent-blue'
                    : 'bg-dark-card border border-dark-border text-gray-400 hover:border-accent-blue/50 hover:text-white'
                }`}
              >
                Compte 2 · {player.secondary_account || '—'}
              </button>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white mb-4">
                Solo Q — Champions les plus joués (saison 16)
              </h2>
              <p className="text-gray-500 text-xs mb-3">
                Calculé à partir des parties enregistrées en base — nombre de games et winrate.
              </p>
              {soloqTopChampionsLoading ? (
                <p className="text-gray-500 text-sm">Chargement…</p>
              ) : soloqTopChampionsFromDb.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {soloqTopChampionsFromDb.map((champ, idx) => {
                    const name = champ.name
                    if (!name) return null
                    return (
                      <div key={`${name}-${idx}`} className="flex flex-col items-center" title={`${name} — ${champ.games} games, ${champ.winrate}% victoires`}>
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-dark-border">
                          <img src={getChampionImage(name)} alt={name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1 truncate max-w-[60px]">{name}</span>
                        <span className="text-xs text-gray-500">
                          {champ.games} game{champ.games > 1 ? 's' : ''} · {champ.winrate}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucune partie enregistrée. Utilisez « Actualiser les données » (onglet Général) pour charger des games.</p>
              )}
            </div>
            <div>
                <h3 className="font-display text-base font-semibold text-white mb-3">
                  Historique des parties (Solo Q)
                </h3>
                {(totalFromRiot != null || countInDb != null) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mb-2">
                    {totalFromRiot != null && (
                      <span>
                        <span className="text-white font-medium">{totalFromRiot}</span> games jouées (Riot)
                      </span>
                    )}
                    {countInDb != null && (
                      <span>
                        <span className="text-white font-medium">{countInDb}</span> enregistrées
                      </span>
                    )}
                    {toLoad != null && toLoad > 0 && (
                      <span className="text-amber-400">
                        {toLoad} à charger
                      </span>
                    )}
                  </div>
                )}
                {activeSoloqPseudo?.trim() && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      type="button"
                      onClick={handleLoad20FromRiot}
                      disabled={load20FromRiotLoading}
                      className="px-4 py-2 rounded-lg bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-sm font-medium hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {load20FromRiotLoading ? 'Chargement…' : 'Charger 20 parties depuis Riot'}
                    </button>
                    {((toLoad != null && toLoad > 0) || (countInDb != null && countInDb >= 100)) && (
                      <button
                        type="button"
                        onClick={loadOlderGamesFromRiot}
                        disabled={loadOlderFromRiotLoading}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadOlderFromRiotLoading
                          ? 'Chargement…'
                          : toLoad != null && toLoad > 0
                            ? `Charger ${Math.min(PAGE_SIZE, toLoad)} games plus anciennes depuis Riot`
                            : 'Charger 20 games encore plus anciennes (au-delà de 100)'}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-gray-500 text-xs mb-2">
                  Données enregistrées en base (saison 16 uniquement). Utilisez le bouton ci-dessus pour charger les 20 dernières parties depuis Riot.
                </p>
                {matchHistoryLoading ? (
                  <p className="text-gray-500 text-sm">Chargement de l’historique…</p>
                ) : matchHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-dark-border">
                          <th className="py-2 pr-4">Champion</th>
                          <th className="py-2 pr-4">K/D/A</th>
                          <th className="py-2 pr-4">Résultat</th>
                          <th className="py-2 pr-4">Durée</th>
                          <th className="py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS).map((m, i) => (
                          <tr key={m.matchId || i} className="border-b border-dark-border/50">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getChampionImage(m.championName)}
                                  alt={m.championName}
                                  className="w-8 h-8 rounded object-cover"
                                />
                                <span>{m.championName}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">{m.kills}/{m.deaths}/{m.assists}</td>
                            <td className="py-3">
                              <span className={m.win ? 'text-green-400' : 'text-red-400'}>
                                {m.win ? 'Victoire' : 'Défaite'}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{m.gameDuration ? `${Math.round(m.gameDuration / 60)} min` : '—'}</td>
                            <td className="py-3 text-gray-400">
                              {m.gameCreation
                                ? new Date(m.gameCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune partie enregistrée. Cliquez sur « Actualiser les données » (onglet Général).</p>
                )}
                {matchHistory.length > 0 && matchHistoryHasMore && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => loadMatchHistoryFromSupabase(matchHistory.length, PAGE_SIZE, true)}
                      disabled={matchHistoryLoadMoreLoading}
                      className="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/80 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {matchHistoryLoadMoreLoading ? 'Chargement…' : 'Charger plus (20 parties)'}
                    </button>
                  </div>
                )}
              </div>
            </section>
        )
      case 'team':
        return (
          <section className="space-y-8">
            <h2 className="font-display text-lg font-semibold text-white mb-4">Team</h2>
            <PlayerTeamStatsSection playerId={playerId} />
          </section>
        )
      case 'match-team':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Stats en équipe (matchs)
            </h2>
            {teamStatsLoading ? (
              <p className="text-gray-500 text-sm">Chargement...</p>
            ) : teamStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-dark-border">
                      <th className="py-2 pr-4">Champion</th>
                      <th className="py-2 pr-4">K/D/A</th>
                      <th className="py-2 pr-4">KDA</th>
                      <th className="py-2 pr-4">DMG</th>
                      <th className="py-2 pr-4">Gold</th>
                      <th className="py-2 pr-4">CS</th>
                      <th className="py-2 pr-4">Vision</th>
                      <th className="py-2">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map((s, i) => {
                      const m = s.team_matches
                      return (
                        <tr key={s.id || i} className="border-b border-dark-border/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={getChampionImage(s.champion_name)}
                                alt={s.champion_name}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span>{s.champion_name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{s.kills}/{s.deaths}/{s.assists}</td>
                          <td className="py-3 pr-4">{s.kda ?? '—'}</td>
                          <td className="py-3 pr-4">{s.total_damage_dealt_to_champions?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 pr-4">{s.gold_earned?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 pr-4">{s.cs ?? '—'}</td>
                          <td className="py-3 pr-4">{s.vision_score ?? '—'}</td>
                          <td className="py-3">
                            <span className={m?.our_win ? 'text-green-400' : 'text-red-400'}>
                              {m?.our_win ? 'Victoire' : 'Défaite'}
                            </span>
                            {m?.game_duration && (
                              <span className="text-gray-500 ml-1">({Math.round(m.game_duration / 60)} min)</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <p className="text-gray-500 text-sm">
                  Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.
                </p>
              </div>
            )}
          </section>
        )
      case 'pool-champ':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Pool Champ
            </h2>
            <TierTable
              tiers={tiersForTable}
              activeTier={null}
            />
            {TIER_KEYS.every((k) => !(tiersForTable[k] || []).length) && (
              <p className="text-gray-500 text-sm mt-4">
                Aucun champion dans le pool. Rendez-vous dans Pool de Champions pour en ajouter.
              </p>
            )}
          </section>
        )
      case 'points-forts':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Points forts détaillés
            </h2>
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <p className="text-gray-500 text-sm">Points forts du joueur — à venir.</p>
            </div>
          </section>
        )
      case 'points-faibles':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Points faibles détaillés
            </h2>
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <p className="text-gray-500 text-sm">Points faibles du joueur — à venir.</p>
            </div>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex w-full -ml-6 -mr-6">
      {/* Sidebar interne à gauche */}
      <PlayerDetailSidebar
        selectedSection={selectedSection}
        onSelect={setSelectedSection}
      />

      {/* Zone contenu */}
      <div className="flex-1 min-w-0 pl-6 pr-6 overflow-auto">
        <button
          onClick={() => navigate('/team/joueurs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Retour aux joueurs
        </button>

        {renderSection()}
      </div>
    </div>
  )
}
