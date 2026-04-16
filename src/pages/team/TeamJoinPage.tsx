/**
 * Page d'invitation : rejoindre une équipe via le lien partagé
 * Étape 1 : confirmation  →  Étape 2 : choix du joueur / rôle
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserPlus, LogIn, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from './hooks/useTeam'
import {
  getTeamPreviewByToken,
  type TeamPreview,
} from '../../services/supabase/teamQueries'
import { getChampionImage } from '../../lib/championImages'

// ─── Positions ordre affichage ────────────────────────────────────────────────

const POSITION_ORDER = ['top', 'jungle', 'mid', 'adc', 'support']
const POS_NORM: Record<string, string> = { jng: 'jungle', jun: 'jungle', sup: 'support', bot: 'adc', bottom: 'adc', utility: 'support' }
const normPos = (p: string | null | undefined) => { const l = (p ?? '').toLowerCase(); return POS_NORM[l] ?? l }
const POSITION_ABBR: Record<string, string> = {
  top: 'TOP', jungle: 'JNG', mid: 'MID', adc: 'ADC', support: 'SUP',
}
const POSITION_COLOR: Record<string, string> = {
  top:     'from-red-500/20 to-transparent border-red-500/30 hover:border-red-400/60',
  jungle:  'from-green-500/20 to-transparent border-green-500/30 hover:border-green-400/60',
  mid:     'from-yellow-500/20 to-transparent border-yellow-500/30 hover:border-yellow-400/60',
  adc:     'from-blue-500/20 to-transparent border-blue-500/30 hover:border-blue-400/60',
  support: 'from-cyan-500/20 to-transparent border-cyan-500/30 hover:border-cyan-400/60',
}
const POSITION_EMOJI: Record<string, string> = {
  top: '🛡️', jungle: '🌲', mid: '⚡', adc: '🎯', support: '✨',
}

const STAFF_ROLES = [
  { id: 'coach',      label: 'Coach',      abbr: 'COACH',   emoji: '📋', description: 'Stratégie & développement',        color: 'from-violet-500/20 to-transparent border-violet-500/30 hover:border-violet-400/60' },
  { id: 'analyst',    label: 'Analyste',   abbr: 'ANALYST', emoji: '📊', description: 'Analyse matchs & VOD review',       color: 'from-indigo-500/20 to-transparent border-indigo-500/30 hover:border-indigo-400/60' },
  { id: 'manager',    label: 'Manager',    abbr: 'MNG',     emoji: '🏆', description: 'Gestion, planning & recrutement',   color: 'from-orange-500/20 to-transparent border-orange-500/30 hover:border-orange-400/60' },
  { id: 'spectateur', label: 'Spectateur', abbr: 'SPEC',    emoji: '👁️', description: 'Lecture seule — stats & matchs uniquement', color: 'from-gray-500/20 to-transparent border-gray-500/30 hover:border-gray-400/60' },
]

type Step = 'loading-preview' | 'confirm' | 'role' | 'joining' | 'success' | 'error'

// ─── Composant principal ───────────────────────────────────────────────────────

export const TeamJoinPage = () => {
  const { token: rawToken } = useParams()
  // Extraire l'UUID nu même si l'URL complète se retrouve dans le paramètre
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const token = rawToken ? (UUID_RE.exec(rawToken)?.[0] ?? rawToken) : undefined
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { joinTeamByToken } = useTeam()

  const [step, setStep]               = useState<Step>('loading-preview')
  const [errorMsg, setErrorMsg]       = useState('')
  const [preview, setPreview]         = useState<TeamPreview | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('')

  // Charge le preview dès que l'utilisateur est connu
  useEffect(() => {
    if (!token || !user) return
    setStep('loading-preview')
    getTeamPreviewByToken(token).then((data) => {
      setPreview(data)
      setStep(data ? 'confirm' : 'error')
      if (!data) setErrorMsg("Lien d'invitation invalide ou expiré.")
    })
  }, [token, user])

  const handleJoinAsPlayer = async (player: { id: string; player_name: string; position: string; top_champion?: string | null; taken: boolean }) => {
    if (!user || !token || !preview) return
    setSelectedLabel(player.player_name)
    setStep('joining')

    const result = await joinTeamByToken(token, 'player', player.position.toLowerCase(), player.id)
    if (!result.success) {
      setErrorMsg(result.error || 'Une erreur est survenue')
      setStep('error')
      return
    }
    setStep('success')
    setTimeout(() => navigate('/team/overview'), 1800)
  }

  const handleJoinAsStaff = async (role: string, label: string) => {
    if (!user || !token || !preview) return
    setSelectedLabel(label)
    setStep('joining')

    const result = await joinTeamByToken(token, role, null, null)
    if (!result.success) {
      setErrorMsg(result.error || 'Une erreur est survenue')
      setStep('error')
      return
    }
    setStep('success')
    setTimeout(() => navigate('/team/overview'), 1800)
  }

  // ── Auth loading ─────────────────────────────────────────────────────────────
  if (authLoading || (!user && step !== 'error')) {
    if (authLoading) return <Spinner />
  }

  if (!token) return <ErrorCard msg="Lien d'invitation invalide ou manquant." onBack={() => navigate('/team')} />

  // ── Non connecté ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-blue/20 flex items-center justify-center">
            <UserPlus className="text-accent-blue" size={32} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white mb-2">Rejoindre une équipe</h2>
            <p className="text-gray-400 text-sm">
              Connectez-vous pour accepter l'invitation.
            </p>
          </div>
          <button
            onClick={() => navigate(`/login?redirect=/team/join/${token}`)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            <LogIn size={20} />
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  // ── États intermédiaires ─────────────────────────────────────────────────────
  if (step === 'loading-preview') return <Spinner label="Chargement de l'invitation…" />

  if (step === 'joining') return <Spinner label={`Vous rejoignez ${preview?.team_name ?? "l'équipe"} en tant que ${selectedLabel}…`} />

  if (step === 'success') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Check className="text-green-400" size={40} />
          </div>
          <p className="text-white font-semibold text-lg">
            Bienvenue dans {preview?.team_name} !
          </p>
          <p className="text-gray-400 text-sm">
            Vous avez rejoint l'équipe en tant que <span className="text-white font-medium">{selectedLabel}</span>
          </p>
          <p className="text-gray-500 text-xs">Redirection en cours…</p>
        </motion.div>
      </div>
    )
  }

  if (step === 'error') {
    return <ErrorCard msg={errorMsg} onBack={() => { setStep('confirm'); setErrorMsg('') }} />
  }

  // ── Étape 1 : Confirmation ────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-dark-border rounded-xl p-8 text-center space-y-6"
        >
          {preview?.logo_url ? (
            <img
              src={preview.logo_url}
              alt={preview.team_name}
              className="w-20 h-20 mx-auto rounded-full object-contain p-1 bg-dark-bg border border-dark-border"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-accent-blue/20 flex items-center justify-center">
              <UserPlus className="text-accent-blue" size={32} />
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-bold text-white mb-2">
              {preview?.team_name ?? "Rejoindre l'équipe"}
            </h2>
            <p className="text-gray-400 text-sm">
              Vous avez été invité à rejoindre cette équipe. Choisissez votre rôle pour continuer.
            </p>
          </div>
          <button
            onClick={() => setStep('role')}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            <UserPlus size={20} />
            Choisir mon rôle
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Étape 2 : Choix du rôle / joueur ─────────────────────────────────────────
  const orderedPlayers = [...(preview?.players ?? [])].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(normPos(a.position))
    const bi = POSITION_ORDER.indexOf(normPos(b.position))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            {preview?.logo_url && (
              <img
                src={preview.logo_url}
                alt={preview.team_name}
                className="w-14 h-14 mx-auto mb-4 rounded-full object-contain p-1 bg-dark-bg border border-dark-border"
              />
            )}
            <h2 className="font-display text-2xl font-bold text-white mb-1">
              Qui êtes-vous ?
            </h2>
            <p className="text-gray-400 text-sm">
              Sélectionnez votre profil dans <span className="text-white">{preview?.team_name}</span>
            </p>
          </div>

          {/* Joueurs (5 slots) */}
          {orderedPlayers.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Joueurs</p>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {orderedPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    playerName={player.player_name}
                    position={player.position}
                    topChampion={player.top_champion}
                    taken={player.taken ?? false}
                    onSelect={() => handleJoinAsPlayer(player)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Staff */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Staff</p>
          <div className="grid grid-cols-3 gap-3">
            {STAFF_ROLES.map((s) => (
              <motion.button
                key={s.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleJoinAsStaff(s.id, s.label)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-b ${s.color} border transition-all duration-200 cursor-pointer text-center`}
              >
                <span className="text-3xl">{s.emoji}</span>
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{s.abbr}</span>
                <span className="font-semibold text-white text-sm">{s.label}</span>
                <span className="text-[11px] text-gray-500 leading-tight">{s.description}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Sous-composants ───────────────────────────────────────────────────────────

function PlayerCard({
  playerName,
  position,
  topChampion,
  taken = false,
  onSelect,
}: {
  playerName: string
  position: string
  topChampion?: string | null
  taken?: boolean
  onSelect: () => void
}) {
  const pos   = normPos(position)
  const color = POSITION_COLOR[pos] ?? 'from-gray-500/20 to-transparent border-gray-500/30 hover:border-gray-400/60'
  const emoji = POSITION_EMOJI[pos] ?? '🎮'
  const abbr  = POSITION_ABBR[pos] ?? position?.toUpperCase() ?? '?'
  const champImg = topChampion ? getChampionImage(topChampion) : null

  const handleClick = () => {
    if (taken) {
      const confirmed = window.confirm('⚠️ Attention ! Ce rôle est déjà pris. Vérifiez avant de continuer, sous risque de conflit.')
      if (!confirmed) return
    }
    onSelect()
  }

  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-b ${color} border transition-all duration-200 cursor-pointer text-center`}
    >
      {taken && (
        <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/80 text-white leading-none">
          Pris ⚠️
        </span>
      )}
      {champImg ? (
        <img
          src={champImg}
          alt={topChampion ?? ''}
          className="w-12 h-12 rounded-full object-cover border-2 border-dark-border/60"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <span className="text-2xl">{emoji}</span>
      )}
      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{abbr}</span>
      <span className="font-bold text-white text-sm leading-tight">{playerName}</span>
    </motion.button>
  )
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-accent-blue" size={40} />
      {label && <p className="text-gray-400 text-sm text-center max-w-xs">{label}</p>}
    </div>
  )
}

function ErrorCard({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center space-y-4">
        <p className="text-red-400">{msg}</p>
        <button onClick={onBack} className="text-accent-blue hover:underline text-sm">
          Réessayer
        </button>
      </div>
    </div>
  )
}
