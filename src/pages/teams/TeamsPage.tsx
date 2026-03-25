/**
 * TeamsPage — gestion des équipes (créer, rejoindre, supprimer, switcher)
 */
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Plus, Link as LinkIcon, X, Trash2,
  Camera, Swords, Trophy, Users, Gamepad2, Crown, UserCheck,
} from 'lucide-react'
import { useTeam } from '../team/hooks/useTeam'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Team } from '../../contexts/TeamContext'

const MAX_TEAMS = 8

const TEAM_TYPES = [
  { id: 'scrim',  label: 'Scrims',  icon: Swords,   color: 'text-accent-blue', selBorder: 'border-accent-blue', selBg: 'bg-accent-blue/15' },
  { id: 'flex',   label: 'Flex',    icon: Users,    color: 'text-emerald-400', selBorder: 'border-emerald-400', selBg: 'bg-emerald-500/15' },
  { id: 'soloq',  label: 'Solo Q',  icon: Trophy,   color: 'text-amber-400',   selBorder: 'border-amber-400',   selBg: 'bg-amber-500/15' },
  { id: 'fun',    label: 'Fun',     icon: Gamepad2, color: 'text-pink-400',    selBorder: 'border-pink-400',    selBg: 'bg-pink-500/15' },
] as const

// ── Page ─────────────────────────────────────────────────────────────────────

export const TeamsPage = () => {
  const navigate                = useNavigate()
  const { user }                = useAuth()
  const {
    allTeams, team: activeTeam, loading,
    switchTeam, createNewTeam, joinTeamByToken, deleteTeam, updateTeam,
  } = useTeam()

  const [switchingId, setSwitchingId]   = useState<string | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [showJoin, setShowJoin]         = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)

  const busy = !!switchingId

  const handleClickTeam = async (t: Team) => {
    if (busy) return
    if (t.id === activeTeam?.id) { navigate('/team'); return }
    setSwitchingId(t.id)
    try { await switchTeam(t.id); navigate('/team') }
    catch (err) { console.error(err) }
    finally { setSwitchingId(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={24} className="animate-spin text-accent-blue" />
      </div>
    )
  }

  const ownedTeams  = allTeams.filter(t => t.user_id === user?.id)
  const joinedTeams = allTeams.filter(t => t.user_id !== user?.id)

  return (
    <div className="max-w-3xl mx-auto pt-8 px-4 pb-16">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-white">Équipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{allTeams.length} / {MAX_TEAMS} équipes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            <LinkIcon size={14} />
            Rejoindre
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={14} />
            Créer
          </button>
        </div>
      </div>

      {/* ── Mes équipes ── */}
      {ownedTeams.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Mes équipes <span className="ml-1">{ownedTeams.length}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ownedTeams.map(t => (
              <TeamCard
                key={t.id}
                team={t}
                isActive={t.id === activeTeam?.id}
                isSwitching={switchingId === t.id}
                disabled={busy}
                canDelete
                onClick={() => handleClickTeam(t)}
                onDelete={() => setTeamToDelete(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Équipes rejointes ── */}
      {joinedTeams.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Équipes rejointes <span className="ml-1">{joinedTeams.length}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {joinedTeams.map(t => (
              <TeamCard
                key={t.id}
                team={t}
                isActive={t.id === activeTeam?.id}
                isSwitching={switchingId === t.id}
                disabled={busy}
                canDelete={false}
                onClick={() => handleClickTeam(t)}
                onDelete={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createNewTeam}
          onUpdateTeam={updateTeam}
        />
      )}
      {showJoin && (
        <JoinModal
          onClose={() => setShowJoin(false)}
          onJoin={joinTeamByToken}
        />
      )}
      {teamToDelete && (
        <DeleteModal
          team={teamToDelete}
          onClose={() => setTeamToDelete(null)}
          onDelete={deleteTeam}
        />
      )}
    </div>
  )
}

// ── TeamCard ─────────────────────────────────────────────────────────────────

function TeamCard({
  team, isActive, isSwitching, disabled, canDelete, onClick, onDelete,
}: {
  team: Team
  isActive: boolean
  isSwitching: boolean
  disabled: boolean
  canDelete: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const typeInfo = TEAM_TYPES.find(t => t.id === team.team_type)

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-2xl overflow-hidden h-36 border-2 transition-all duration-200 group ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      } ${isActive
        ? 'border-accent-blue shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_0_30px_rgba(99,102,241,0.35)]'
        : 'border-dark-border hover:-translate-y-1 hover:border-white/40 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_40px_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.7)]'
      } ${isSwitching ? 'opacity-50' : ''}`}
    >
      {/* Fond de base */}
      <div className="absolute inset-0 bg-dark-card" />

      {/* Logo en fond à droite */}
      {team.logo_url && (
        <>
          <img
            src={team.logo_url}
            alt=""
            aria-hidden
            className="absolute right-3 top-1/2 -translate-y-1/2 w-16 h-16 object-contain opacity-80 group-hover:opacity-95 transition-opacity"
          />
          {/* Gradient gauche pour lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-r from-dark-card from-50% to-transparent" />
        </>
      )}

      {/* Contenu */}
      <div className="relative z-10 flex flex-col justify-between h-full p-4">

        {/* Top — nom + delete */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="font-bold text-white text-sm leading-tight pr-2 truncate">{team.team_name}</p>
            {/* Badges owner / membre + membres */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {canDelete ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-full">
                  <Crown size={9} />Owner
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-500/10 border border-gray-500/20 px-1.5 py-0.5 rounded-full">
                  <UserCheck size={9} />Membre
                </span>
              )}
              {team.member_count != null && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Users size={9} />
                  {team.member_count}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isSwitching && <Loader2 size={13} className="animate-spin text-accent-blue" />}
            {canDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-black/30 transition-colors"
                title="Supprimer l'équipe"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom — type + badge active */}
        <div className="flex items-center justify-between">
          {typeInfo ? (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${typeInfo.color}`}>
              <typeInfo.icon size={11} />
              {typeInfo.label}
            </span>
          ) : (
            <span className="text-[11px] text-gray-500">{team.team_type ?? '—'}</span>
          )}
          {isActive && (
            <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/15 border border-accent-blue/30 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>

      </div>
    </div>
  )
}

// ── CreateModal ───────────────────────────────────────────────────────────────

function CreateModal({
  onClose,
  onCreate,
  onUpdateTeam,
}: {
  onClose: () => void
  onCreate: (name: string, type: string) => Promise<Team>
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<Team>
}) {
  const logoInputRef              = useRef<HTMLInputElement>(null)
  const [name, setName]           = useState('')
  const [teamType, setTeamType]   = useState<string>('scrim')
  const [logoFile, setLogoFile]   = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const newTeam = await onCreate(name.trim(), teamType)

      // Upload logo si sélectionné
      if (logoFile && supabase) {
        const ext  = logoFile.name.split('.').pop() || 'jpg'
        const path = `${newTeam.id}/logo.${ext}`
        const buf  = await logoFile.arrayBuffer()
        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(path, buf, { upsert: true, contentType: logoFile.type })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(path)
          await onUpdateTeam(newTeam.id, { logo_url: urlData.publicUrl })
        }
      }

      onClose()
    } catch (err) {
      setError('Erreur lors de la création.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Nouvelle équipe</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors hover:border-accent-blue/60 ${
                logoPreview ? 'border-dark-border bg-white' : 'border-dark-border bg-dark-bg'
              }`}
            >
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                : <Camera size={20} className="text-gray-500" />
              }
            </button>
            <p className="text-xs text-gray-500">Logo (optionnel)</p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* Nom */}
          <input
            autoFocus
            type="text"
            placeholder="Nom de l'équipe"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />

          {/* Type */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Type d'équipe</p>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_TYPES.map(({ id, label, icon: Icon, color, selBorder, selBg }) => {
                const selected = teamType === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTeamType(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      selected
                        ? `${selBorder} ${selBg} ${color} font-medium`
                        : 'border-dark-border text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium disabled:opacity-50 hover:bg-accent-blue/90 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Créer
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// ── DeleteModal ───────────────────────────────────────────────────────────────

function DeleteModal({
  team,
  onClose,
  onDelete,
}: {
  team: Team
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}) {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const match = confirm === team.team_name

  const handleDelete = async () => {
    if (!match) return
    setLoading(true)
    setError('')
    try {
      await onDelete(team.id)
      onClose()
    } catch (err) {
      setError('Erreur lors de la suppression.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Trash2 size={16} className="text-red-400" />
            Supprimer l'équipe
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-1">
          Cette action est <span className="text-red-400 font-medium">irréversible</span>. Pour confirmer, saisissez le nom de l'équipe :
        </p>
        <p className="text-sm font-semibold text-white mb-4 px-3 py-2 bg-dark-bg rounded-lg border border-dark-border">
          {team.team_name}
        </p>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Nom de l'équipe"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleDelete}
            disabled={loading || !match}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-600 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── JoinModal ─────────────────────────────────────────────────────────────────

function JoinModal({
  onClose,
  onJoin,
}: {
  onClose: () => void
  onJoin: (token: string) => Promise<{ success: boolean; error?: string; teamName?: string }>
}) {
  const [token, setToken]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await onJoin(token.trim())
      if (res.success) {
        onClose()
      } else {
        setError(res.error ?? 'Lien invalide ou expiré.')
      }
    } catch (err) {
      setError('Erreur lors de la tentative.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Rejoindre une équipe</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Lien ou token d'invitation"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium disabled:opacity-50 hover:bg-accent-blue/90 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
            Rejoindre
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
