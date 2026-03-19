import { Link } from 'react-router-dom'
import { Swords, Trophy } from 'lucide-react'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'

const ROLE_SORT_KEY: Record<string, number> = {
  TOP: 0, JNG: 1, JUNGLE: 1, MID: 2, ADC: 3, BOT: 3, SUP: 4, SUPPORT: 4,
}

function sortByRole(participants: any[]) {
  return [...participants].sort((a, b) => {
    const rA = (a.role || '').toUpperCase().replace(/\s/g, '')
    const rB = (b.role || '').toUpperCase().replace(/\s/g, '')
    return (ROLE_SORT_KEY[rA] ?? 99) - (ROLE_SORT_KEY[rB] ?? 99)
  })
}

export function ChampionStrip({ participants, side }: { participants: any[]; side: 'blue' | 'red' }) {
  const sorted = sortByRole(participants)
  const sideColor = side === 'blue' ? 'text-blue-400' : 'text-red-400'
  const sideLabel = side === 'blue' ? 'Blue' : 'Red'
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={`text-xs font-semibold w-8 shrink-0 ${sideColor}`}>{sideLabel}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {sorted.map((p, i) => (
          <img
            key={p.id ?? i}
            src={getChampionImage(p.champion_name)}
            alt={getChampionDisplayName(p.champion_name) || p.champion_name}
            className="w-7 h-7 rounded-lg object-cover border border-dark-border"
          />
        ))}
      </div>
    </div>
  )
}

export function TypeBadge({ type }: { type?: string | null }) {
  if (!type || type === 'scrim') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
        <Swords size={10} />
        Scrim
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
      <Trophy size={10} />
      Tournoi
    </span>
  )
}

interface MatchRowProps {
  match: any
  compact?: boolean
}

export function MatchRow({ match: m, compact = false }: MatchRowProps) {
  const allParticipants = m.team_match_participants || []
  const ourTeam = allParticipants.filter((p: any) => p.team_side === 'our' || !p.team_side)
  const enemyTeam = allParticipants.filter((p: any) => p.team_side === 'enemy')
  const isOurBlue = m.our_team_id === 100
  const blueSide = isOurBlue ? ourTeam : enemyTeam
  const redSide = isOurBlue ? enemyTeam : ourTeam
  const durationMin = m.game_duration ? Math.round(m.game_duration / 60) : null
  const dateStr = m.game_creation
    ? new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <Link
      to={`/team/matchs/${m.id}`}
      className="block bg-dark-card border border-dark-border rounded-xl p-3.5 hover:border-accent-blue/40 hover:bg-dark-card/80 transition-[border-color,background-color] group"
    >
      {/* Ligne du haut : résultat + infos */}
      <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
        <div className={`flex items-center justify-center w-18 h-8 px-3 rounded-lg font-bold text-xs ${
          m.our_win
            ? 'bg-green-500/15 text-green-400 border border-green-500/25'
            : 'bg-red-500/15 text-red-400 border border-red-500/25'
        }`}>
          {m.our_win ? 'Victoire' : 'Défaite'}
        </div>

        {!compact && <TypeBadge type={m.match_type} />}

        {durationMin != null && (
          <span className="text-xs text-gray-400">{durationMin} min</span>
        )}

        {m.our_team_id != null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            m.our_team_id === 100
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-red-400 bg-red-500/10'
          }`}>
            {m.our_team_id === 100 ? 'Blue' : 'Red'}
          </span>
        )}

        {dateStr && (
          <span className="ml-auto text-xs text-gray-500">{dateStr}</span>
        )}
      </div>

      {/* Champions */}
      <div className="flex flex-col gap-1.5">
        <ChampionStrip participants={blueSide} side="blue" />
        <ChampionStrip participants={redSide} side="red" />
      </div>
    </Link>
  )
}
