/**
 * Carte Mood des joueurs (Solo Q) — 5 dernières parties, W/L + KDA
 */
import { Swords } from 'lucide-react'
import { ROSTER_ROLES } from '../../constants/roles'

export type MoodRow = { wins: number; losses: number; kda: string; count: number }

/** Mood (Solo Q ou Team) : label + emoji selon W/L sur 5 games (emoji à la fin du texte). Exporté pour réutilisation dans MoodTeamCard. */
export function getMoodForFiveGames(wins: number, losses: number): { label: string; emoji: string } | null {
  if (wins + losses !== 5) return null
  if (wins === 0 && losses === 5) return { label: 'BOUFFON !', emoji: '🤡' }
  if (wins === 1 && losses === 4) return { label: 'Glacial', emoji: '❄️' }
  if (wins === 2 && losses === 3) return { label: 'Bof', emoji: '🖕' }
  if (wins === 3 && losses === 2) return { label: 'Dans le Bon', emoji: '👍' }
  if (wins === 4 && losses === 1) return { label: 'Tigre', emoji: '🐯' }
  if (wins === 5 && losses === 0) return { label: 'GOAT !', emoji: '🐐' }
  return null
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

export const MoodSoloQCard = ({
  players,
  mood,
  title,
}: {
  players: any[]
  mood: Record<string, MoodRow>
  title?: string
}) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="w-4 h-4 text-yellow-400" />
        <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
          {title ?? 'Mood des joueurs (Solo Q)'}
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">5 dernières parties — W/L + KDA</p>
      <div className="space-y-3">
        {sortPlayersByRole(players).map((p) => {
          const m = mood[p.id]
          const count = m?.count ?? 0
          const wins = m?.wins ?? 0
          const losses = m?.losses ?? 0
          const soloqMood = getMoodForFiveGames(wins, losses)
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 px-3 rounded-xl bg-dark-bg/50 border border-dark-border/40"
            >
              <span className="text-sm font-medium text-white w-20 shrink-0 truncate">
                {p.player_name}
              </span>
              <div className="flex gap-1 shrink-0">
                {count === 0 ? (
                  <span className="text-xs text-gray-600">—</span>
                ) : (
                  Array.from({ length: count }, (_, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${
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
                {count > 0 ? `${wins}V ${losses}D` : '—'} · {m?.kda ?? '—'}
              </span>
              {soloqMood && (
                <span className="ml-auto shrink-0 text-xs font-semibold text-white/90">
                  {soloqMood.label} {soloqMood.emoji}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
