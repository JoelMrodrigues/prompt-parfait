/**
 * Page de gestion des membres — owner uniquement
 * Affiche les 8 slots (5 joueurs + 3 staff) avec l'email de celui qui a rejoint
 * et permet de virer un membre.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserX, RefreshCw, ShieldAlert, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTeam } from '../hooks/useTeam'
import { getTeamMembersWithEmail, removeTeamMember, setCoOwner, type TeamMemberWithEmail } from '../../../services/supabase/teamQueries'
import { useToast } from '../../../contexts/ToastContext'

// ─── Config des slots ──────────────────────────────────────────────────────────

const PLAYER_SLOTS = [
  { position: 'top',     abbr: 'TOP', emoji: '🛡️' },
  { position: 'jungle',  abbr: 'JNG', emoji: '🌲' },
  { position: 'mid',     abbr: 'MID', emoji: '⚡'  },
  { position: 'adc',     abbr: 'ADC', emoji: '🎯' },
  { position: 'support', abbr: 'SUP', emoji: '✨' },
]

// Normalise les abréviations DB ('JNG', 'SUP'...) vers les valeurs longues
const POSITION_NORM: Record<string, string> = {
  jng: 'jungle', jun: 'jungle',
  sup: 'support', bot: 'adc', bottom: 'adc', utility: 'support',
}
const normalizePos = (p: string | null | undefined): string => {
  if (!p) return ''
  const l = p.toLowerCase()
  return POSITION_NORM[l] ?? l
}

const STAFF_SLOTS = [
  { role: 'coach',   label: 'Coach',    emoji: '📋' },
  { role: 'analyst', label: 'Analyste', emoji: '📊' },
  { role: 'manager', label: 'Manager',  emoji: '🏆' },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export const TeamMembersPage = () => {
  const { team, players, isTeamOwner, canManageTeam } = useTeam()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [members, setMembers] = useState<TeamMemberWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [kicking, setKicking] = useState<string | null>(null)
  const [settingCoOwner, setSettingCoOwner] = useState<string | null>(null)
  const [coOwnerModal, setCoOwnerModal] = useState<{ member: TeamMemberWithEmail; makeCoOwner: boolean; label: string } | null>(null)
  const [coOwnerConfirm, setCoOwnerConfirm] = useState('')
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!team?.id) return
    setLoading(true)
    const data = await getTeamMembersWithEmail(team.id)
    setMembers(data)
    setLoading(false)
  }, [team?.id])

  useEffect(() => {
    if (!isTeamOwner) { navigate('/team/overview'); return }
    load()
  }, [isTeamOwner, load, navigate])

  const handleKick = async (member: TeamMemberWithEmail, label: string) => {
    if (!team?.id || kicking) return
    if (!confirm(`Virer ${label} (${member.email}) de l'équipe ?`)) return
    setKicking(member.user_id)
    const ok = await removeTeamMember(team.id, member.user_id)
    setKicking(null)
    if (ok) {
      addToast(`${label} a été retiré de l'équipe.`, 'success')
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id))
    } else {
      addToast('Erreur lors de la suppression.', 'error')
    }
  }

  const openCoOwnerModal = (member: TeamMemberWithEmail, makeCoOwner: boolean, label: string) => {
    setCoOwnerConfirm('')
    setCoOwnerModal({ member, makeCoOwner, label })
    setTimeout(() => confirmInputRef.current?.focus(), 50)
  }

  const handleSetCoOwner = async () => {
    if (!team?.id || !coOwnerModal) return
    const { member, makeCoOwner, label } = coOwnerModal
    setCoOwnerModal(null)
    setCoOwnerConfirm('')
    setSettingCoOwner(member.user_id)
    const { error } = await setCoOwner(team.id, member.user_id, makeCoOwner)
    setSettingCoOwner(null)
    if (!error) {
      addToast(makeCoOwner ? `${label} est maintenant co-owner.` : `Co-owner révoqué pour ${label}.`, 'success')
      setMembers(prev => prev.map(m => m.user_id === member.user_id ? { ...m, role: makeCoOwner ? 'co_owner' : 'player' } : m))
    } else {
      addToast('Erreur.', 'error')
    }
  }

  // Trouver le membre associé à un joueur (par player_id ou par position+role=player)
  const memberForPlayer = (playerId: string, position: string) =>
    members.find(
      (m) => m.player_id === playerId || (m.role === 'player' && m.position === position)
    ) ?? null

  const memberForStaff = (role: string) =>
    members.find((m) => m.role === role) ?? null

  if (!isTeamOwner) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Membres de l'équipe</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {members.length} compte{members.length !== 1 ? 's' : ''} connecté{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-accent-blue" size={32} />
        </div>
      ) : (
        <>
          {/* Joueurs */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Joueurs</p>
            <div className="space-y-2">
              {PLAYER_SLOTS.map((slot) => {
                // Trouve le joueur titulaire à ce poste
                const player = players.find(
                  (p) => normalizePos(p.position) === slot.position && (p as any).player_type !== 'remplacant'
                ) ?? players.find((p) => normalizePos(p.position) === slot.position) ?? null

                const member = player
                  ? memberForPlayer(player.id, slot.position)
                  : members.find((m) => m.role === 'player' && m.position === slot.position) ?? null

                const displayName = (player as any)?.player_name || (player as any)?.pseudo || null

                return (
                  <MemberRow
                    key={slot.position}
                    emoji={slot.emoji}
                    abbr={slot.abbr}
                    playerName={displayName}
                    member={member}
                    kicking={kicking === member?.user_id}
                    onKick={() => member && handleKick(member, displayName ?? slot.abbr)}
                    canManageTeam={canManageTeam}
                    memberRole={member?.role}
                    onSetCoOwner={(makeCoOwner) => member && openCoOwnerModal(member, makeCoOwner, displayName ?? slot.abbr)}
                    settingCoOwner={settingCoOwner === member?.user_id}
                  />
                )
              })}
            </div>
          </section>

          {/* Staff */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Staff</p>
            <div className="space-y-2">
              {STAFF_SLOTS.map((slot) => {
                const member = memberForStaff(slot.role)
                return (
                  <MemberRow
                    key={slot.role}
                    emoji={slot.emoji}
                    abbr={slot.label}
                    playerName={null}
                    member={member}
                    kicking={kicking === member?.user_id}
                    onKick={() => member && handleKick(member, slot.label)}
                    canManageTeam={canManageTeam}
                    memberRole={member?.role}
                    onSetCoOwner={(makeCoOwner) => member && openCoOwnerModal(member, makeCoOwner, slot.label)}
                    settingCoOwner={settingCoOwner === member?.user_id}
                  />
                )
              })}
            </div>
          </section>

          {/* Comptes sans slot attribué (role='member', position=null) */}
          {(() => {
            const matchedUserIds = new Set([
              ...PLAYER_SLOTS.flatMap((slot) => {
                const player = players.find((p) => normalizePos(p.position) === slot.position) ?? null
                const m = player
                  ? members.find((m) => m.player_id === player.id || (m.role === 'player' && normalizePos(m.position) === slot.position))
                  : members.find((m) => m.role === 'player' && normalizePos(m.position) === slot.position)
                return m ? [m.user_id] : []
              }),
              ...STAFF_SLOTS.flatMap((slot) => {
                const m = members.find((m) => m.role === slot.role)
                return m ? [m.user_id] : []
              }),
            ])
            const unmatched = members.filter((m) => !matchedUserIds.has(m.user_id))
            if (!unmatched.length) return null
            return (
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Non attribués</p>
                <div className="space-y-2">
                  {unmatched.map((m) => (
                    <MemberRow
                      key={m.user_id}
                      emoji="❓"
                      abbr={m.role}
                      playerName={null}
                      member={m}
                      kicking={kicking === m.user_id}
                      onKick={() => handleKick(m, m.email)}
                      canManageTeam={canManageTeam}
                      memberRole={m.role}
                      onSetCoOwner={(makeCoOwner) => openCoOwnerModal(m, makeCoOwner, m.email)}
                      settingCoOwner={settingCoOwner === m.user_id}
                    />
                  ))}
                </div>
              </section>
            )
          })()}

          {members.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              Aucun membre n'a encore rejoint l'équipe via le lien d'invitation.
            </div>
          )}
        </>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-card border border-dark-border/60 text-sm text-gray-500">
        <ShieldAlert size={16} className="shrink-0 mt-0.5 text-yellow-500/70" />
        <p>
          Seuls les comptes ayant rejoint via le lien d'invitation apparaissent ici.
          Vous (owner) n'êtes pas affiché dans cette liste.
        </p>
      </div>

      {/* Modal confirmation co-owner */}
      {coOwnerModal && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md space-y-5"
          >
            {/* Icon + titre */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-3xl">
                👑
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {coOwnerModal.makeCoOwner ? 'Désigner co-owner' : 'Révoquer co-owner'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {coOwnerModal.makeCoOwner
                    ? <>Vous êtes sur le point de donner les droits co-owner à <span className="text-white font-medium">{coOwnerModal.label}</span> ({coOwnerModal.member.email}).<br/>Cette personne pourra gérer l'équipe comme vous.</>
                    : <>Révoquer les droits co-owner de <span className="text-white font-medium">{coOwnerModal.label}</span> ({coOwnerModal.member.email}).</>
                  }
                </p>
              </div>
            </div>

            {/* Champ de confirmation */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">
                Tapez <span className="font-mono font-bold text-yellow-400">autoriser</span> pour confirmer
              </p>
              <input
                ref={confirmInputRef}
                type="text"
                value={coOwnerConfirm}
                onChange={(e) => setCoOwnerConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && coOwnerConfirm === 'autoriser') handleSetCoOwner() }}
                placeholder="autoriser"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 text-center font-mono"
                autoComplete="off"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setCoOwnerModal(null); setCoOwnerConfirm('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleSetCoOwner}
                disabled={coOwnerConfirm !== 'autoriser'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── Ligne de membre ───────────────────────────────────────────────────────────

function MemberRow({
  emoji,
  abbr,
  playerName,
  member,
  kicking,
  onKick,
  canManageTeam,
  memberRole,
  onSetCoOwner,
  settingCoOwner,
}: {
  emoji: string
  abbr: string
  playerName: string | null
  member: TeamMemberWithEmail | null
  kicking: boolean
  onKick: () => void
  canManageTeam?: boolean
  memberRole?: string
  onSetCoOwner?: (makeCoOwner: boolean) => void
  settingCoOwner?: boolean
}) {
  const hasEmail = !!member?.email

  return (
    <motion.div
      layout
      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
        hasEmail
          ? 'bg-dark-card border-dark-border'
          : 'bg-dark-bg/40 border-dark-border/40'
      }`}
    >
      {/* Slot info */}
      <span className="text-xl w-7 text-center shrink-0">{emoji}</span>
      <div className="w-14 shrink-0">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{abbr}</span>
      </div>

      {/* Pseudo joueur */}
      <div className="w-28 shrink-0">
        {playerName ? (
          <span className="text-sm font-semibold text-white">{playerName}</span>
        ) : (
          <span className="text-sm text-gray-600 italic">—</span>
        )}
      </div>

      {/* Email */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {hasEmail ? (
          <>
            <Mail size={13} className="text-gray-500 shrink-0" />
            <span className="text-sm text-gray-300 truncate">{member!.email}</span>
          </>
        ) : (
          <span className="text-xs text-gray-600 italic">Pas encore rejoint</span>
        )}
      </div>

      {/* Bouton co-owner */}
      <AnimatePresence>
        {hasEmail && canManageTeam && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onSetCoOwner?.(memberRole !== 'co_owner')}
            disabled={settingCoOwner}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-50 ${
              memberRole === 'co_owner'
                ? 'text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/10'
                : 'text-gray-400 border-gray-600/40 hover:bg-gray-500/10 hover:text-yellow-300'
            }`}
            title={memberRole === 'co_owner' ? 'Révoquer co-owner' : 'Désigner co-owner'}
          >
            {settingCoOwner ? <Loader2 size={13} className="animate-spin" /> : '👑'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bouton virer */}
      <AnimatePresence>
        {hasEmail && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onKick}
            disabled={kicking}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/60 transition-colors disabled:opacity-50"
            title="Retirer ce membre"
          >
            {kicking ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <UserX size={13} />
            )}
            Virer
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
