/**
 * Page Overview — Vue d'ensemble de l'équipe (redesign)
 * Hero · Stats strip · LP Ranking · Forme récente · Roster
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  UserPlus,
  Copy,
  Check,
  Camera,
  Trophy,
  TrendingUp,
  Users,
  Loader2,
  Edit3,
  Target,
  Calendar,
  X,
  Swords,
  Zap,
  CalendarClock,
  RefreshCw,
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { usePlayerSync } from '../hooks/usePlayerSync'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useToast } from '../../../contexts/ToastContext'
import { TeamForm } from '../components/TeamForm'
import { PlayerModal } from '../components/PlayerModal'
import { ConfirmModal } from '../../../components/common/ConfirmModal'
import { supabase } from '../../../lib/supabase'
import { getChampionImage } from '../../../lib/championImages'
import { fetchWeeklyGames } from '../../../lib/riotSync'

// ── Rank helpers ───────────────────────────────────────────────────────────────

function parseLP(rank: string | null | undefined): number {
  if (!rank) return 0
  const m = rank.match(/(\d+)\s*LP/i)
  return m ? parseInt(m[1]) : 0
}

function rankToSortValue(rank: string | null | undefined): number {
  if (!rank) return -1
  const tiers = [
    'iron', 'bronze', 'silver', 'gold', 'platinum',
    'emerald', 'diamond', 'master', 'grandmaster', 'challenger',
  ]
  const divisions = ['IV', 'III', 'II', 'I']
  const r = rank.toLowerCase()
  const tierIdx = tiers.findIndex((t) => r.includes(t))
  const divIdx = divisions.findIndex(
    (d) => rank.includes(` ${d} `) || rank.includes(` ${d}`) || rank.endsWith(d),
  )
  const lp = parseLP(rank)
  return (tierIdx >= 0 ? tierIdx * 400 : 0) + (divIdx >= 0 ? divIdx * 100 : 0) + lp
}

function getRankColor(rank: string | null | undefined): string {
  if (!rank) return 'text-gray-500'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'text-yellow-300'
  if (r.includes('grandmaster')) return 'text-orange-400'
  if (r.includes('master')) return 'text-purple-400'
  if (r.includes('diamond')) return 'text-blue-400'
  if (r.includes('emerald')) return 'text-emerald-400'
  if (r.includes('platinum')) return 'text-cyan-400'
  if (r.includes('gold')) return 'text-yellow-400'
  if (r.includes('silver')) return 'text-gray-300'
  if (r.includes('bronze')) return 'text-orange-500'
  if (r.includes('iron')) return 'text-gray-500'
  return 'text-gray-400'
}

function stripLP(rank: string | null | undefined): string {
  if (!rank) return '—'
  return rank.replace(/\s*\d+\s*LP/i, '').trim()
}

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; text: string; gradient: string }> = {
  TOP: { label: 'Top', text: 'text-blue-400', gradient: 'from-blue-600/20 to-transparent' },
  JNG: { label: 'Jungle', text: 'text-green-400', gradient: 'from-green-600/20 to-transparent' },
  MID: { label: 'Mid', text: 'text-yellow-400', gradient: 'from-yellow-600/20 to-transparent' },
  ADC: { label: 'ADC', text: 'text-red-400', gradient: 'from-red-600/20 to-transparent' },
  SUP: { label: 'Support', text: 'text-purple-400', gradient: 'from-purple-600/20 to-transparent' },
}

const ROSTER_ROLES = ['TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const

// ── Component ─────────────────────────────────────────────────────────────────

export const TeamOverviewPage = () => {
  const navigate = useNavigate()
  const { error: toastError, success: toastSuccess } = useToast()
  const {
    team,
    players,
    loading,
    updateTeam,
    createTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getInviteLink,
    isTeamOwner,
  } = useTeam()
  const { syncExistingPlayer } = usePlayerSync()
  const { matches: teamMatches, refetch: refetchMatches } = useTeamMatches(team?.id)

  // Refetch matches quand la page reprend le focus (retour après import)
  useEffect(() => {
    const onFocus = () => refetchMatches()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetchMatches])

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // ── Weekly SoloQ ─────────────────────────────────────────────────────────────
  const [weeklyGames, setWeeklyGames] = useState<Record<string, number | null>>({})
  const [weeklyLoading, setWeeklyLoading] = useState(false)

  const refreshWeeklyGames = async () => {
    const playersWithPseudo = players.filter((p) => p.pseudo)
    if (!playersWithPseudo.length) return
    setWeeklyLoading(true)
    try {
      const results = await Promise.all(
        playersWithPseudo.map(async (p) => ({
          id: p.id,
          count: await fetchWeeklyGames(p.pseudo),
        })),
      )
      const map: Record<string, number | null> = {}
      for (const r of results) map[r.id] = r.count
      setWeeklyGames(map)
    } finally {
      setWeeklyLoading(false)
    }
  }

  // ── LP Goal ──────────────────────────────────────────────────────────────────
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalLPInput, setGoalLPInput] = useState('')
  const [goalDeadlineInput, setGoalDeadlineInput] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)

  const startEditGoal = () => {
    setGoalLPInput(team?.lp_goal ? String(team.lp_goal) : '')
    setGoalDeadlineInput(team?.lp_goal_deadline || '')
    setEditingGoal(true)
  }


  const handleSaveGoal = async () => {
    if (!team?.id) return
    setGoalSaving(true)
    try {
      const lpVal = goalLPInput ? parseInt(goalLPInput) : null
      await updateTeam(team.id, {
        lp_goal: lpVal,
        lp_goal_deadline: goalDeadlineInput || null,
      })
      setEditingGoal(false)
      toastSuccess('Objectif mis à jour !')
    } catch (e: any) {
      toastError(`Erreur: ${e.message}`)
    } finally {
      setGoalSaving(false)
    }
  }

  // ── Logo upload ──────────────────────────────────────────────────────────────
  const handleLogoUpload = async (file: File) => {
    if (!team?.id || !supabase) return
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${team.id}/logo.${ext}`
      // Convertir en ArrayBuffer pour éviter que Supabase stocke le multipart form entier
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(path, arrayBuffer, { upsert: true, contentType: file.type })
      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket') || (uploadError as any).statusCode === '400') {
          toastError("Bucket introuvable. Dans Supabase : Storage → New bucket → Nom : \"team-logos\" → cocher Public → Save.")
        } else {
          toastError(`Erreur upload : ${uploadError.message}`)
        }
        return
      }
      const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(path)
      console.log('[Logo] URL générée :', urlData.publicUrl)
      try {
        await updateTeam(team.id, { logo_url: urlData.publicUrl })
        toastSuccess(`Logo uploadé. Ouvre cette URL pour vérifier : ${urlData.publicUrl}`)
      } catch {
        toastError("Image uploadée mais non sauvegardée. Exécutez supabase/supabase-team-logo.sql dans le SQL Editor Supabase pour ajouter la colonne logo_url.")
      }
    } catch (e: any) {
      toastError(`Erreur : ${e.message}`)
    } finally {
      setLogoUploading(false)
    }
  }

  // ── Computed data ────────────────────────────────────────────────────────────
  const sortedPlayersByLP = useMemo(
    () => [...players].sort((a, b) => rankToSortValue(b.rank) - rankToSortValue(a.rank)),
    [players],
  )

  const maxSortValue = useMemo(() => {
    const vals = players.map((p) => rankToSortValue(p.rank)).filter((v) => v > 0)
    return vals.length ? Math.max(...vals) : 1
  }, [players])

  const totalLP = useMemo(
    () => players.reduce((sum, p) => sum + parseLP(p.rank), 0),
    [players],
  )

  const teamStats = useMemo(() => {
    if (!teamMatches?.length) return null
    const n = teamMatches.length
    const wins = teamMatches.filter((m: any) => m.our_win).length
    let totalK = 0, totalD = 0, totalA = 0
    for (const m of teamMatches) {
      const our = (m.team_match_participants || []).filter(
        (p: any) => p.team_side === 'our' || !p.team_side,
      )
      for (const p of our) {
        totalK += p.kills ?? 0
        totalD += p.deaths ?? 0
        totalA += p.assists ?? 0
      }
    }
    const kda = totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : (totalK + totalA).toFixed(1)
    return { n, wins, losses: n - wins, winrate: Math.round((wins / n) * 100), kda }
  }, [teamMatches])

  const recentMatches = useMemo(() => (teamMatches || []).slice(0, 8), [teamMatches])

  const recentStreak = useMemo(() => {
    if (!recentMatches.length) return null
    const first = recentMatches[0]?.our_win
    let count = 0
    for (const m of recentMatches) {
      if (m.our_win !== first) break
      count++
    }
    return count >= 2 ? { count, win: first } : null
  }, [recentMatches])

  const playersByRole = useMemo(() => {
    const byRole: Record<string, any[]> = { TOP: [], JNG: [], MID: [], ADC: [], SUP: [] }
    for (const p of players) {
      const pos = p.position?.toUpperCase()
      if (pos === 'BOT') byRole['ADC']?.push(p)
      else if (byRole[pos]) byRole[pos].push(p)
    }
    return byRole
  }, [players])

  const teamChampionStats = useMemo(() => {
    type ChampStats = { games: number; wins: number; kdaSum: number }

    // score = games * (0.6 + 0.35*(wr/100) + 0.05*avgKda)
    // → games prime, WR second, KDA anecdotique
    const calcScore = (s: ChampStats) => {
      const wr = s.games > 0 ? s.wins / s.games : 0
      const avgKda = s.games > 0 ? s.kdaSum / s.games : 0
      return s.games * (0.6 + 0.35 * wr + 0.05 * avgKda)
    }

    const perPlayer: Record<string, Record<string, ChampStats>> = {}
    const overall: Record<string, ChampStats> = {}

    for (const match of teamMatches || []) {
      const ourTeam = (match.team_match_participants || []).filter(
        (p: any) => p.team_side === 'our' || !p.team_side,
      )
      for (const part of ourTeam) {
        const champ = part.champion_name
        if (!champ) continue
        const won = part.win === true || match.our_win === true
        const kda = typeof part.kda === 'number' ? part.kda : 0

        if (!overall[champ]) overall[champ] = { games: 0, wins: 0, kdaSum: 0 }
        overall[champ].games++
        overall[champ].kdaSum += kda
        if (won) overall[champ].wins++

        if (part.player_id) {
          if (!perPlayer[part.player_id]) perPlayer[part.player_id] = {}
          if (!perPlayer[part.player_id][champ]) perPlayer[part.player_id][champ] = { games: 0, wins: 0, kdaSum: 0 }
          perPlayer[part.player_id][champ].games++
          perPlayer[part.player_id][champ].kdaSum += kda
          if (won) perPlayer[part.player_id][champ].wins++
        }
      }
    }

    const toEntry = ([name, s]: [string, ChampStats]) => ({
      name,
      games: s.games,
      winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      avgKda: s.games > 0 ? Math.round((s.kdaSum / s.games) * 10) / 10 : 0,
      score: calcScore(s),
    })

    const top5Overall = Object.entries(overall)
      .map(toEntry)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const top3PerPlayer: Record<string, ReturnType<typeof toEntry>[]> = {}
    for (const [pid, champs] of Object.entries(perPlayer)) {
      top3PerPlayer[pid] = Object.entries(champs)
        .map(toEntry)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    }

    return { top5Overall, top3PerPlayer, hasData: Object.keys(overall).length > 0 }
  }, [teamMatches])

  const soloqStats = useMemo(() => {
    const synced = players.filter((p) => p.rank)
    const avgLP = synced.length ? Math.round(totalLP / synced.length) : 0
    const tierCounts: Record<string, number> = {}
    for (const p of synced) {
      const r = p.rank?.toLowerCase() || ''
      const tiers = ['challenger','grandmaster','master','diamond','emerald','platinum','gold','silver','bronze','iron']
      const tier = tiers.find((t) => r.includes(t)) || 'unknown'
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    }
    const dominantTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    return { synced: synced.length, total: players.length, avgLP, dominantTier }
  }, [players, totalLP])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSavePlayer = async (playerData: any) => {
    try {
      if (editingPlayer) await updatePlayer(editingPlayer.id, playerData)
      else await createPlayer(playerData)
      setShowPlayerModal(false)
      setEditingPlayer(null)
    } catch (e: any) {
      toastError(`Erreur: ${e.message}`)
    }
  }

  const handleInviteClick = async () => {
    setInviteLoading(true)
    setInviteLink(null)
    try {
      const link = await getInviteLink()
      setInviteLink(link)
    } catch {
      toastError('Impossible de générer le lien')
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Loading / no team ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-3xl font-bold mb-2">Créer votre équipe</h2>
          <p className="text-gray-400 mb-8">Commencez par donner un nom à votre équipe.</p>
          <TeamForm onSubmit={createTeam} />
        </motion.div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Logo + name */}
          <div className="flex items-center gap-5">
            {/* Logo circle */}
            <div className="relative shrink-0">
              <button
                type="button"
                disabled={!isTeamOwner || logoUploading}
                onClick={() => logoInputRef.current?.click()}
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${team.logo_url ? 'border-dark-border bg-white' : 'border-dashed border-dark-border bg-dark-bg/80'} ${isTeamOwner ? 'cursor-pointer hover:border-accent-blue/60' : 'cursor-default'}`}
                title={isTeamOwner ? 'Changer le logo' : ''}
              >
                {logoUploading ? (
                  <Loader2 className="w-7 h-7 text-accent-blue animate-spin" />
                ) : team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.team_name}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <Camera className="w-7 h-7 text-gray-500" />
                )}
              </button>
              {isTeamOwner && !logoUploading && (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center shadow-lg hover:bg-accent-blue/80 transition-colors"
                  title="Importer un logo"
                >
                  <Edit3 className="w-3 h-3 text-white" />
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
              />
            </div>

            {/* Team name + meta */}
            <div>
              <h1 className="font-display text-3xl font-bold text-white leading-tight">
                {team.team_name}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Créée le {new Date(team.created_at).toLocaleDateString('fr-FR')}
                {' · '}
                {players.length} joueur{players.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Invite button */}
          {isTeamOwner && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInviteClick}
                disabled={inviteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue hover:text-accent-blue transition-colors disabled:opacity-50 text-sm"
              >
                <UserPlus size={16} />
                {inviteLoading ? 'Génération…' : 'Inviter'}
              </button>
              {inviteLink && (
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 min-w-0 px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-xs text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteLink)
                      setInviteCopied(true)
                      toastSuccess('Lien copié !')
                      setTimeout(() => setInviteCopied(false), 2000)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue/20 border border-accent-blue rounded-lg text-accent-blue text-xs shrink-0"
                  >
                    {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                    {inviteCopied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stats strip (1 ligne) ── */}
        {teamStats && (
          <div className="mt-5 pt-4 border-t border-dark-border/40 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-400">
            <span>
              <span className="text-emerald-400 font-semibold">{teamStats.winrate}%</span>
              {' winrate — '}
              <span className="text-emerald-400">{teamStats.wins}V</span>
              {' / '}
              <span className="text-rose-400">{teamStats.losses}D</span>
              {' sur '}
              {teamStats.n} match{teamStats.n > 1 ? 's' : ''}
            </span>
            <span className="text-dark-border hidden sm:inline">·</span>
            <span>
              KDA moy. <span className="text-white font-semibold">{teamStats.kda}</span>
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Row 2 : LP Ranking + Activité SoloQ ─────────────────────────────── */}
      {players.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LP Ranking */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
                  Classement LP
                </h3>
              </div>
              {totalLP > 0 && (
                <span className="text-xs text-gray-500">
                  <span className="text-yellow-400 font-semibold">{totalLP.toLocaleString()}</span>
                  {' LP cumulés'}
                </span>
              )}
            </div>
            {/* ── Objectif LP ── */}
            {totalLP > 0 && (
              <div className="mb-5 pb-4 border-b border-dark-border/40">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-accent-blue" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Objectif
                    </span>
                  </div>
                  {isTeamOwner && (
                    editingGoal ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSaveGoal}
                          disabled={goalSaving}
                          className="flex items-center gap-1 px-2 py-1 bg-accent-blue/20 text-accent-blue border border-accent-blue/40 rounded-md text-xs hover:bg-accent-blue/30 transition-colors disabled:opacity-50"
                        >
                          {goalSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Sauver
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoal(false)}
                          className="p-1 text-gray-500 hover:text-white transition-colors rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startEditGoal}
                        className="p-1 text-gray-600 hover:text-gray-300 transition-colors rounded-md"
                        title="Modifier l'objectif"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>

                {editingGoal ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={goalLPInput}
                        onChange={(e) => setGoalLPInput(e.target.value)}
                        placeholder="4000"
                        min={0}
                        className="w-24 px-2.5 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:border-accent-blue focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">LP</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <input
                        type="date"
                        value={goalDeadlineInput}
                        onChange={(e) => setGoalDeadlineInput(e.target.value)}
                        className="px-2.5 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:border-accent-blue focus:outline-none"
                      />
                    </div>
                  </div>
                ) : team?.lp_goal ? (
                  (() => {
                    const pct = Math.min(Math.round((totalLP / team.lp_goal) * 100), 100)
                    const reached = totalLP >= team.lp_goal
                    const remaining = team.lp_goal - totalLP
                    const deadline = team.lp_goal_deadline
                      ? new Date(team.lp_goal_deadline + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : null
                    return reached ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold text-sm">
                            🎉 Objectif atteint !
                          </span>
                          <span className="text-xs text-gray-500">{team.lp_goal.toLocaleString()} LP ✓</span>
                        </div>
                        {isTeamOwner && (
                          <button
                            type="button"
                            onClick={startEditGoal}
                            className="text-xs text-accent-blue hover:underline"
                          >
                            Prochain objectif →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            <span className="text-yellow-400 font-semibold">{totalLP.toLocaleString()}</span>
                            {' LP actuels'}
                          </span>
                          <span className="text-gray-400">
                            {'Objectif '}
                            <span className="text-white font-semibold">{team.lp_goal.toLocaleString()}</span>
                            {' LP'}
                          </span>
                        </div>
                        <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent-blue to-violet-500 transition-all duration-700"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{pct}% — encore {remaining.toLocaleString()} LP</span>
                          {deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()
                ) : isTeamOwner ? (
                  <p className="text-xs text-gray-600">
                    Aucun objectif défini.{' '}
                    <button
                      type="button"
                      onClick={startEditGoal}
                      className="text-accent-blue hover:underline"
                    >
                      Définir un objectif
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-gray-600">Aucun objectif défini.</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {sortedPlayersByLP.map((p, idx) => {
                const lp = parseLP(p.rank)
                const sortVal = rankToSortValue(p.rank)
                const barPct = maxSortValue > 0 ? Math.round((sortVal / maxSortValue) * 100) : 0
                const rankLabel = stripLP(p.rank)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/team/joueurs/${p.id}`)}
                    className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="text-xs font-bold text-gray-600 w-4 shrink-0 text-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-white w-24 shrink-0 truncate">
                      {p.player_name}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-violet-500 transition-all duration-500"
                          style={{ width: `${Math.max(barPct, 3)}%` }}
                        />
                      </div>
                      <span className={`text-xs shrink-0 ${getRankColor(p.rank)}`}>
                        {rankLabel}
                      </span>
                      <span className="text-xs text-gray-600 shrink-0 w-12 text-right">
                        {lp > 0 ? `${lp} LP` : '—'}
                      </span>
                    </div>
                  </button>
                )
              })}
              {sortedPlayersByLP.every((p) => !p.rank) && (
                <p className="text-gray-600 text-sm">
                  Aucun rang synchronisé. Utilisez le bouton Sync sur la fiche joueur.
                </p>
              )}
            </div>
          </motion.div>

          {/* Activité SoloQ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
                  Activité SoloQ
                </h3>
                {Object.keys(weeklyGames).length > 0 && (
                  <span className="text-[10px] text-gray-600 bg-dark-bg px-1.5 py-0.5 rounded-md border border-dark-border/40">
                    7 jours
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={refreshWeeklyGames}
                disabled={weeklyLoading || !players.some((p) => p.pseudo)}
                title="Charger les games jouées cette semaine via Riot API"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 border border-dark-border/60 rounded-lg hover:border-accent-blue/50 hover:text-accent-blue transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${weeklyLoading ? 'animate-spin' : ''}`} />
                {weeklyLoading ? 'Chargement…' : 'Semaine'}
              </button>
            </div>

            {/* Per-player rows — triés par games/semaine si dispo, sinon par LP */}
            <div className="space-y-2 flex-1">
              {(() => {
                const hasWeekly = Object.keys(weeklyGames).length > 0
                const maxWeekly = hasWeekly
                  ? Math.max(...Object.values(weeklyGames).map((v) => v ?? 0), 1)
                  : 0
                const sorted = hasWeekly
                  ? [...sortedPlayersByLP].sort(
                      (a, b) => (weeklyGames[b.id] ?? -1) - (weeklyGames[a.id] ?? -1),
                    )
                  : sortedPlayersByLP
                return sorted.map((p) => {
                  const lp = parseLP(p.rank)
                  const rankLabel = stripLP(p.rank)
                  const pos = p.position?.toUpperCase()
                  const role = pos === 'BOT' ? 'ADC' : pos
                  const cfg = role ? ROLE_CONFIG[role] : null
                  const gw = weeklyGames[p.id]
                  const isTop = hasWeekly && gw != null && gw > 0 && gw === maxWeekly
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/team/joueurs/${p.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left hover:border-accent-blue/40 hover:bg-dark-bg ${
                        isTop ? 'bg-yellow-500/5 border-yellow-500/25' : 'bg-dark-bg/50 border-dark-border/40'
                      }`}
                    >
                      {/* Role badge — 3 lettres, largeur fixe */}
                      <span className={`text-[10px] font-bold uppercase shrink-0 w-10 text-center px-1 py-0.5 rounded border ${cfg ? `${cfg.text} border-current/20 bg-dark-bg` : 'text-gray-700 border-dark-border/30'}`}>
                        {role ?? '—'}
                      </span>
                      {/* Name + pseudo */}
                      <div className="flex-1 min-w-0 pl-1">
                        <p className="text-sm font-semibold text-white truncate leading-tight">
                          {p.player_name}
                          {isTop && <span className="ml-1 text-yellow-400">🔥</span>}
                        </p>
                        {p.pseudo && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">{p.pseudo}</p>
                        )}
                      </div>
                      {/* Games cette semaine — largeur fixe pour ne pas bouger */}
                      <div className="shrink-0 w-14 text-center">
                        {hasWeekly && p.pseudo ? (
                          <>
                            {gw == null ? (
                              <span className="text-gray-700 text-xs">—</span>
                            ) : (
                              <span className={`text-sm font-bold ${
                                gw >= 10 ? 'text-emerald-400'
                                : gw >= 5 ? 'text-yellow-400'
                                : gw >= 1 ? 'text-orange-400'
                                : 'text-gray-600'
                              }`}>
                                {gw}
                              </span>
                            )}
                            <p className="text-[10px] text-gray-700 leading-tight">games</p>
                          </>
                        ) : null}
                      </div>
                      {/* Rank — largeur fixe pour aligner toutes les lignes */}
                      <div className="shrink-0 w-28 text-right">
                        {p.rank ? (
                          <>
                            <p className={`text-xs font-semibold ${getRankColor(p.rank)}`}>
                              {rankLabel}
                            </p>
                            <p className="text-[11px] text-gray-600">{lp > 0 ? `${lp} LP` : ''}</p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-700">Non sync.</span>
                        )}
                      </div>
                    </button>
                  )
                })
              })()}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-dark-border/40 flex items-center justify-between text-xs text-gray-500">
              {Object.keys(weeklyGames).length > 0 ? (
                <span>
                  Total équipe :{' '}
                  <span className="text-white font-semibold">
                    {Object.values(weeklyGames).reduce((s, v) => s + (v ?? 0), 0)}
                  </span>
                  {' games cette semaine'}
                </span>
              ) : (
                <span className="text-gray-700">
                  Cliquez sur <span className="text-gray-500 font-medium">Semaine</span> pour l'implication
                </span>
              )}
              {soloqStats.synced > 0 && (
                <span>
                  <span className="text-white font-semibold">{soloqStats.synced}</span>
                  /{soloqStats.total} sync
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Row 3 : Forme récente + Top Champions ────────────────────────────── */}
      {players.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Forme récente */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-blue" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
                  Forme récente
                </h3>
              </div>
              {recentStreak && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    recentStreak.win
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  🔥 {recentStreak.count} {recentStreak.win ? 'victoires' : 'défaites'} d'affilée
                </span>
              )}
            </div>

            {recentMatches.length > 0 ? (
              <div className="space-y-4">
                {/* V/D pills */}
                <div className="flex gap-1.5 flex-wrap">
                  {recentMatches.map((m: any, i: number) => (
                    <div
                      key={m.id || i}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        m.our_win
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                      title={m.our_win ? 'Victoire' : 'Défaite'}
                    >
                      {m.our_win ? 'V' : 'D'}
                    </div>
                  ))}
                </div>

                {/* Last 5 matches detail */}
                <div className="space-y-1.5">
                  {recentMatches.slice(0, 5).map((m: any, i: number) => {
                    const our = (m.team_match_participants || []).filter(
                      (p: any) => p.team_side === 'our' || !p.team_side,
                    )
                    const duration = m.game_duration
                      ? `${Math.round(m.game_duration / 60)} min`
                      : ''
                    const date = m.created_at
                      ? new Date(m.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''
                    return (
                      <button
                        key={m.id || i}
                        type="button"
                        onClick={() => m.id && navigate(`/team/matchs/${m.id}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all hover:brightness-125 active:scale-[0.99] ${
                          m.our_win
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-rose-500/5 border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            m.our_win
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {m.our_win ? 'V' : 'D'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-1">
                          {our.slice(0, 5).map((p: any, pi: number) => (
                            <img
                              key={pi}
                              src={getChampionImage(p.champion_name)}
                              alt={p.champion_name}
                              title={p.champion_name}
                              className="w-9 h-9 rounded-lg border border-dark-border/60 object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-gray-500 text-xs shrink-0 text-right leading-tight">
                          {date && <span className="block">{date}</span>}
                          {duration && <span className="block text-gray-600">{duration}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">
                Aucun match enregistré. Ajoutez des parties depuis{' '}
                <strong className="text-gray-400">Matchs</strong>.
              </p>
            )}
          </motion.div>

          {/* Top Champions de l'équipe */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col gap-5"
          >
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
                Top Champions
              </h3>
              <span className="text-[10px] text-gray-600 bg-dark-bg px-1.5 py-0.5 rounded-md border border-dark-border/40">
                Games team
              </span>
            </div>

            {teamChampionStats.hasData ? (
              <>
                {/* ── Top 5 équipe ── */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-3">
                    Top 5 équipe — tous rôles
                  </p>
                  <div className="flex gap-2">
                    {teamChampionStats.top5Overall.map((ch, i) => (
                      <div key={ch.name} className="flex flex-col items-center gap-1 flex-1">
                        <div className="relative">
                          <img
                            src={getChampionImage(ch.name)}
                            alt={ch.name}
                            title={ch.name}
                            className={`w-14 h-14 rounded-xl object-cover border-2 ${
                              i === 0 ? 'border-yellow-400/60' : 'border-dark-border/50'
                            }`}
                          />
                          {i === 0 && (
                            <span className="absolute -top-1.5 -left-1.5 text-[10px]">👑</span>
                          )}
                          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white bg-dark-bg/90 px-1 rounded border border-dark-border/40">
                            {ch.games}
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold mt-1 ${
                          ch.winrate >= 60 ? 'text-emerald-400'
                          : ch.winrate >= 50 ? 'text-yellow-400'
                          : 'text-rose-400'
                        }`}>
                          {ch.winrate}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Top 3 par joueur ── */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-3">
                    Top 3 par joueur
                  </p>
                  <div className="space-y-2">
                    {players
                      .filter((p) => teamChampionStats.top3PerPlayer[p.id]?.length > 0)
                      .sort(
                        (a, b) =>
                          (teamChampionStats.top3PerPlayer[b.id]?.[0]?.games ?? 0) -
                          (teamChampionStats.top3PerPlayer[a.id]?.[0]?.games ?? 0),
                      )
                      .map((p) => {
                        const champs = teamChampionStats.top3PerPlayer[p.id] || []
                        return (
                          <div key={p.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium w-16 shrink-0 truncate">
                              {p.player_name}
                            </span>
                            <div className="flex gap-1.5 flex-1">
                              {champs.map((ch) => (
                                <div key={ch.name} className="flex items-center gap-1.5 bg-dark-bg rounded-lg px-2 py-1.5 border border-dark-border/40 flex-1 min-w-0">
                                  <img
                                    src={getChampionImage(ch.name)}
                                    alt={ch.name}
                                    title={`${ch.name} — ${ch.games} parties, ${ch.winrate}% WR`}
                                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-gray-300 leading-none truncate">
                                      {ch.name}
                                    </p>
                                    <p className={`text-[10px] font-semibold leading-none mt-0.5 ${
                                      ch.winrate >= 60 ? 'text-emerald-400'
                                      : ch.winrate >= 50 ? 'text-yellow-400'
                                      : 'text-rose-400'
                                    }`}>
                                      {ch.games} · {ch.winrate}%
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm">
                Aucune game enregistrée. Importez des matchs depuis{' '}
                <strong className="text-gray-400">Matchs</strong>.
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Roster ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-blue" />
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Roster</h3>
          </div>
          {isTeamOwner && (
            <button
              type="button"
              onClick={() => {
                setEditingPlayer(null)
                setShowPlayerModal(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors text-sm font-medium"
            >
              <Plus size={15} />
              Ajouter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ROSTER_ROLES.map((role) => {
            const rolePlayers = playersByRole[role] || []
            const cfg = ROLE_CONFIG[role]

            if (rolePlayers.length === 0) {
              return (
                <div
                  key={role}
                  className="rounded-xl border border-dashed border-dark-border/40 p-4 flex flex-col items-center justify-center min-h-[170px] text-center"
                >
                  <p className={`text-xs font-bold uppercase tracking-wider ${cfg.text} mb-1`}>
                    {cfg.label}
                  </p>
                  <p className="text-gray-700 text-xs">—</p>
                </div>
              )
            }

            return rolePlayers.map((p) => {
              // Champions
              let topChamps = p.top_champions
              if (typeof topChamps === 'string') {
                try { topChamps = JSON.parse(topChamps) } catch { topChamps = [] }
              }
              const validChamps: { name: string }[] = []
              for (const ch of Array.isArray(topChamps) ? topChamps : []) {
                const name = ch.name || ch
                if (name && name.length > 1 && name !== 'Pas de données') {
                  validChamps.push({ name })
                }
                if (validChamps.length >= 3) break
              }
              const bgChamp = validChamps[0]?.name

              return (
                <motion.button
                  key={p.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => navigate(`/team/joueurs/${p.id}`)}
                  className={`relative rounded-xl border border-dark-border bg-gradient-to-b ${cfg.gradient} bg-dark-bg/50 overflow-hidden cursor-pointer min-h-[170px] flex flex-col p-4 text-left transition-colors hover:border-accent-blue/50`}
                >
                  {/* Champion background blurred */}
                  {bgChamp && (
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                      <img
                        src={getChampionImage(bgChamp)}
                        alt=""
                        className="w-full h-full object-cover blur-[2px] scale-105"
                      />
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col h-full gap-1">
                    {/* Role badge */}
                    <span
                      className={`self-start text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-dark-bg/60 ${cfg.text} mb-1`}
                    >
                      {cfg.label}
                    </span>

                    {/* Player name */}
                    <p className="font-bold text-white text-sm truncate leading-tight">
                      {p.player_name}
                    </p>

                    {/* Pseudo */}
                    {p.pseudo && (
                      <p className="text-[11px] text-gray-500 truncate">{p.pseudo}</p>
                    )}

                    {/* Rank */}
                    {p.rank ? (
                      <p className={`text-xs truncate mt-0.5 ${getRankColor(p.rank)}`}>
                        {stripLP(p.rank)}
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5 text-gray-700">Non classé</p>
                    )}

                    {/* Champions */}
                    {validChamps.length > 0 && (
                      <div className="flex gap-1.5 mt-auto pt-3">
                        {validChamps.map((ch, ci) => (
                          <img
                            key={ci}
                            src={getChampionImage(ch.name)}
                            alt={ch.name}
                            className="w-8 h-8 rounded-md border border-dark-border/40 object-cover"
                            title={ch.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })
          })}
        </div>
      </motion.div>

      {/* ── Prochain entraînement / match planifié (placeholder) ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-card border border-dark-border/50 border-dashed rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-600 text-sm uppercase tracking-wider">
              Prochain entraînement / match planifié
            </h3>
          </div>
          <span className="text-xs text-gray-700 bg-dark-bg px-2.5 py-1 rounded-full border border-dark-border/40">
            Bientôt disponible
          </span>
        </div>
        <p className="text-gray-700 text-xs mt-3">
          Cette section affichera le prochain événement du planning une fois la fonctionnalité complétée.
        </p>
      </motion.div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showPlayerModal && (
        <PlayerModal
          player={editingPlayer}
          onSave={handleSavePlayer}
          onClose={() => {
            setShowPlayerModal(false)
            setEditingPlayer(null)
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer le joueur"
          message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete.player_name} ?`}
          onConfirm={async () => {
            await deletePlayer(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
