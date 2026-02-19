/**
 * Carte Mood des joueurs (Team Games) — 5 dernières parties team, W/L + KDA.
 * Mood basé sur le KDA moyen (tranches <= 1, <= 2, ... <= 10).
 */
import { Users } from 'lucide-react'
import { ROSTER_ROLES } from '../../constants/roles'
import type { MoodRow } from './MoodSoloQCard'

/** Mood Team : label + emoji selon KDA moyen (tranches). Emoji à la fin du texte. */
function getTeamMoodByKda(kda: number): { label: string; emoji: string } | null {
  if (Number.isNaN(kda) || kda < 0) return null
  if (kda <= 1) return { label: 'Cadavre', emoji: '💀' }
  if (kda <= 2) return { label: 'BOT', emoji: '🤖' }
  if (kda <= 3) return { label: 'Endormis', emoji: '🛏️' }
  if (kda <= 4) return { label: 'Humain', emoji: '👤' }
  if (kda <= 5) return { label: 'Cool', emoji: '😎' }
  if (kda <= 6) return { label: 'King', emoji: '👑' }
  if (kda <= 7) return { label: 'Divin', emoji: '😇' }
  if (kda <= 8) return { label: 'LFL Ready', emoji: '🔥' }
  if (kda <= 9) return { label: 'LEC Ready', emoji: '🧯' }
  return { label: 'LCK Ready', emoji: '🇨🇳' }
}

function sortPlayersByRole(players: any[]) {
  return [...players].sort((a, b) => {
    const ra = ROSTER_ROLES.indexOf(
      (a.position || '').toUpperCase() === 'BOT' ? 'ADC' : (a.position || '').toUpperCase()
    )
    const rb = ROSTER_ROLES.indexOf(
      (b.position || '').toUpperCase() === 'BOT' ? 'ADC' : (b.position || '').toUpperCase()
    )
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
  })
}

export const MoodTeamCard = ({
  players,
  mood,
}: {
  players: any[]
  mood: Record<string, MoodRow>
}) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-accent-blue" />
        <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
          Mood des joueurs (Team Games)
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">5 dernières parties team — W/L + KDA</p>
      <div className="space-y-3">
        {sortPlayersByRole(players).map((p) => {
          const m = mood[p.id]
          const count = m?.count ?? 0
          const wins = m?.wins ?? 0
          const losses = m?.losses ?? 0
          const kdaNum = parseFloat(m?.kda ?? '')
          const teamMood = count > 0 && !Number.isNaN(kdaNum) ? getTeamMoodByKda(kdaNum) : null
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 py-2 px-3 rounded-xl bg-dark-bg/50 border border-dark-border/40"
            >
              <span className="text-sm font-medium text-white w-24 shrink-0 truncate">
                {p.player_name}
              </span>
              <div className="flex gap-1 shrink-0">
                {count === 0 ? (
                  <span className="text-xs text-gray-600">—</span>
                ) : (
                  Array.from({ length: count }, (_, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                        i < wins
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {i < wins ? 'V' : 'D'}
                    </span>
                  ))
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {count > 0 ? `${wins}V ${losses}D` : '—'} · KDA {m?.kda ?? '—'}
              </span>
              {teamMood && (
                <span className="ml-auto shrink-0 text-xs font-semibold text-white/90">
                  {teamMood.label} {teamMood.emoji}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
