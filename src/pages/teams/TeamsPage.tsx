/**
 * Page Équipes — liste des équipes, création, rejoindre via lien
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Link2, Check, X, Crown, Loader2, Swords, Trophy, Users, Gamepad2 } from 'lucide-react'

// ── Team type config ─────────────────────────────────────────────────────────

const TEAM_TYPES = [
  {
    id: 'scrim',
    label: 'Scrim',
    desc: 'Parties d\'entraînement en équipe',
    icon: Swords,
    color: 'text-accent-blue',
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/40',
    selectedBorder: 'border-accent-blue',
    selectedBg: 'bg-accent-blue/15',
  },
  {
    id: 'soloq',
    label: 'Solo Queue',
    desc: 'Suivi classé individuel',
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    selectedBorder: 'border-amber-400',
    selectedBg: 'bg-amber-500/15',
  },
  {
    id: 'flex',
    label: 'Flex',
    desc: 'File classée Flex 5v5',
    icon: Users,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    selectedBorder: 'border-emerald-400',
    selectedBg: 'bg-emerald-500/15',
  },
  {
    id: 'fun',
    label: 'Fun',
    desc: 'ARAM, normals, parties détente',
    icon: Gamepad2,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    selectedBorder: 'border-pink-400',
    selectedBg: 'bg-pink-500/15',
  },
] as const

type TeamTypeId = (typeof TEAM_TYPES)[number]['id']

const TEAM_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  scrim:  { label: 'Scrim',      color: 'text-accent-blue bg-accent-blue/10' },
  soloq:  { label: 'Solo Queue', color: 'text-amber-400 bg-amber-500/10' },
  flex:   { label: 'Flex',       color: 'text-emerald-400 bg-emerald-500/10' },
  fun:    { label: 'Fun',        color: 'text-pink-400 bg-pink-500/10' },
}
import { useTeam } from '../team/hooks/useTeam'
import { useAuth } from '../../contexts/AuthContext'
import { getOrCreateInviteToken } from '../../services/supabase/teamQueries'

const MAX_TEAMS = 8

const CARD_COLORS = [
  { gradient: 'from-blue-500/30 via-blue-600/15 to-transparent', accent: 'text-blue-300' },
  { gradient: 'from-violet-500/30 via-violet-600/15 to-transparent', accent: 'text-violet-300' },
  { gradient: 'from-emerald-500/30 via-emerald-600/15 to-transparent', accent: 'text-emerald-300' },
  { gradient: 'from-orange-500/30 via-orange-600/15 to-transparent', accent: 'text-orange-300' },
  { gradient: 'from-rose-500/30 via-rose-600/15 to-transparent', accent: 'text-rose-300' },
  { gradient: 'from-cyan-500/30 via-cyan-600/15 to-transparent', accent: 'text-cyan-300' },
  { gradient: 'from-amber-500/30 via-amber-600/15 to-transparent', accent: 'text-amber-300' },
  { gradient: 'from-indigo-500/30 via-indigo-600/15 to-transparent', accent: 'text-indigo-300' },
]

function getCardColor(id: string) {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CARD_COLORS[hash % CARD_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

function extractToken(input: string): string {
  const match = input.match(/\/team\/join\/([^/?#\s]+)/)
  return match ? match[1] : input.trim()
}

export const TeamsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { allTeams, team: activeTeam, loading, createNewTeam, joinTeamByToken, switchTeam } =
    useTeam()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [selectedType, setSelectedType] = useState<TeamTypeId>('scrim')
  const [inviteInput, setInviteInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null)

  const toggleCreate = () => {
    setShowCreateForm((v) => !v)
    setShowJoinForm(false)
    setError(null)
    setSelectedType('scrim')
  }

  const toggleJoin = () => {
    setShowJoinForm((v) => !v)
    setShowCreateForm(false)
    setError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const name = newTeamName.trim()
      await createNewTeam(name, selectedType)
      setNewTeamName('')
      setShowCreateForm(false)
      setSelectedType('scrim')
      setSuccess(`Équipe "${name}" créée !`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteInput.trim() || submitting) return
    const token = extractToken(inviteInput)
    setSubmitting(true)
    setError(null)
    try {
      const result = await joinTeamByToken(token)
      if (!result.success) {
        setError(result.error || 'Lien invalide ou expiré')
      } else {
        setInviteInput('')
        setShowJoinForm(false)
        setSuccess(`Vous avez rejoint "${result.teamName}" !`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la jonction')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCardClick = async (t: any) => {
    if (t.id === activeTeam?.id) {
      navigate('/team')
      return
    }
    setSwitchingTeamId(t.id)
    try {
      await switchTeam(t.id)
      navigate('/team')
    } finally {
      setSwitchingTeamId(null)
    }
  }

  const handleCopyInvite = async (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation()
    setError(null)
    try {
      const token = await getOrCreateInviteToken(teamId)
      if (!token) {
        setError('Impossible de générer le lien')
        return
      }
      const link = `${window.location.origin}/team/join/${token}`
      await navigator.clipboard.writeText(link)
      setSuccess('Lien copié !')
      setTimeout(() => setSuccess(null), 2000)
    } catch {
      setError('Impossible de copier le lien')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold mb-1">Équipes</h2>
          <p className="text-gray-400 text-sm">
            {allTeams.length === 0
              ? 'Aucune équipe'
              : `${allTeams.length} / ${MAX_TEAMS} équipe${allTeams.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={toggleJoin}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dark-border rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          <Link2 size={14} />
          Rejoindre une équipe
        </button>
      </div>

      {/* Formulaires inline */}
      {(showCreateForm || showJoinForm) && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-6">
          {showCreateForm && (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Sélecteur de type */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Type d'équipe</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEAM_TYPES.map((t) => {
                    const Icon = t.icon
                    const selected = selectedType === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedType(t.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                          selected
                            ? `${t.selectedBg} ${t.selectedBorder}`
                            : `${t.bg} ${t.border} hover:border-gray-500`
                        }`}
                      >
                        <Icon size={20} className={t.color} />
                        <span className={`text-xs font-semibold ${selected ? t.color : 'text-gray-400'}`}>
                          {t.label}
                        </span>
                        <span className="text-[10px] text-gray-600 text-center leading-tight">{t.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nom + boutons */}
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Nom de l'équipe"
                  maxLength={50}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
                />
                <button
                  type="submit"
                  disabled={submitting || !newTeamName.trim()}
                  className="px-4 py-2 text-sm bg-accent-blue rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {submitting ? '...' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setError(null) }}
                  className="px-3 py-2 text-gray-400 hover:text-white rounded-lg border border-dark-border transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </form>
          )}
          {showJoinForm && (
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Lien ou token d'invitation"
                className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
              />
              <button
                type="submit"
                disabled={submitting || !inviteInput.trim()}
                className="px-4 py-2 text-sm bg-accent-blue rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? '...' : 'Rejoindre'}
              </button>
              <button
                type="button"
                onClick={() => { setShowJoinForm(false); setError(null) }}
                className="px-3 py-2 text-gray-400 hover:text-white rounded-lg border border-dark-border transition-colors"
              >
                <X size={15} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center gap-2">
          <Check size={14} />
          {success}
        </div>
      )}

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTeams.map((t, i) => {
          const isActive = t.id === activeTeam?.id
          const isOwner = t.user_id === user?.id
          const color = getCardColor(t.id)
          const initials = getInitials(t.team_name)

          return (
            <div
              key={t.id}
              onClick={() => !switchingTeamId && handleCardClick(t)}
              className={`animate-scale-in group bg-dark-card rounded-2xl overflow-hidden border transition-[transform,box-shadow,border-color,opacity] duration-200 ${
                switchingTeamId === t.id ? 'cursor-wait opacity-60' : 'cursor-pointer'
              } ${
                isActive
                  ? 'border-accent-blue/50 shadow-[0_0_24px_rgba(59,130,246,0.1)]'
                  : 'border-dark-border hover:border-gray-600 hover:shadow-lg hover:-translate-y-0.5'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Zone logo / fond */}
              <div className="relative h-36 overflow-hidden">
                {/* Background : logo si dispo, sinon gradient */}
                {(t as any).logo_url ? (
                  <img
                    src={(t as any).logo_url}
                    alt={t.team_name}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                  />
                ) : null}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${color.gradient}`}
                />

                {/* Spinner switch */}
                {switchingTeamId === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-dark-bg/40 backdrop-blur-sm">
                    <Loader2 size={28} className="animate-spin text-accent-blue" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs bg-accent-blue text-white rounded-full font-medium">
                      Active
                    </span>
                  )}
                  {isOwner && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-black/40 text-yellow-400 rounded-full backdrop-blur-sm">
                      <Crown size={9} />
                      Owner
                    </span>
                  )}
                </div>

                {/* Bouton copier le lien (owner uniquement) */}
                {isOwner && (
                  <button
                    onClick={(e) => handleCopyInvite(e, t.id)}
                    title="Copier le lien d'invitation"
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/50 text-gray-400 hover:text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Link2 size={13} />
                  </button>
                )}

                {/* Initiales centrées (uniquement si pas de logo) */}
                {!(t as any).logo_url && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span
                      className={`font-display font-black tracking-tight select-none drop-shadow-lg ${color.accent}`}
                      style={{
                        fontSize:
                          initials.length === 1 ? '4rem' : initials.length === 2 ? '3.2rem' : '2.4rem',
                      }}
                    >
                      {initials}
                    </span>
                  </div>
                )}
              </div>

              {/* Nom + type */}
              <div className="px-4 py-3 text-center">
                <h3 className="font-semibold text-white text-sm truncate">{t.team_name}</h3>
                {(t as any).team_type && TEAM_TYPE_LABELS[(t as any).team_type] && (
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${TEAM_TYPE_LABELS[(t as any).team_type].color}`}>
                    {TEAM_TYPE_LABELS[(t as any).team_type].label}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Card "+" pour créer une nouvelle équipe */}
        {allTeams.length < MAX_TEAMS && (
          <div
            onClick={toggleCreate}
            className="animate-scale-in bg-dark-card border-2 border-dashed border-dark-border hover:border-gray-500 rounded-2xl overflow-hidden cursor-pointer transition-[transform,box-shadow,border-color,opacity] duration-200 hover:shadow-lg hover:-translate-y-0.5 group flex flex-col"
            style={{ animationDelay: `${allTeams.length * 50}ms` }}
          >
            {/* Zone du + */}
            <div className="flex-1 h-36 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-gray-600 group-hover:border-gray-400 flex items-center justify-center transition-colors">
                <Plus size={28} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
              </div>
            </div>

            {/* Label */}
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-gray-500 group-hover:text-gray-300 font-medium transition-colors">
                Nouvelle équipe
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
