/**
 * Page Matchs - Liste des parties avec filtre Scrim / Tournament
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, FileJson, Swords, Trophy, LayoutList } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'

const ROLE_SORT_KEY: Record<string, number> = {
  TOP: 0, JNG: 1, JUNGLE: 1, MID: 2, ADC: 3, BOT: 3, SUP: 4, SUPPORT: 4,
}

type MatchType = 'all' | 'scrim' | 'tournament'

const TYPE_FILTERS: { id: MatchType; label: string; Icon: React.ElementType }[] = [
  { id: 'all',        label: 'Tous',        Icon: LayoutList },
  { id: 'scrim',      label: 'Scrims',      Icon: Swords     },
  { id: 'tournament', label: 'Tournois',    Icon: Trophy     },
]

function sortByRole(participants: any[]) {
  return [...participants].sort((a, b) => {
    const rA = (a.role || '').toUpperCase().replace(/\s/g, '')
    const rB = (b.role || '').toUpperCase().replace(/\s/g, '')
    return (ROLE_SORT_KEY[rA] ?? 99) - (ROLE_SORT_KEY[rB] ?? 99)
  })
}

function ChampionStrip({ participants, side }: { participants: any[]; side: 'blue' | 'red' }) {
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
            className="w-8 h-8 rounded-lg object-cover border border-dark-border"
          />
        ))}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type?: string | null }) {
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

export const MatchsPage = () => {
  const { team } = useTeam()
  const { matches, loading, refetch } = useTeamMatches(team?.id)
  const [filter, setFilter] = useState<MatchType>('all')

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  const filtered = matches.filter((m) => {
    if (filter === 'all') return true
    const t = m.match_type || 'scrim'
    return t === filter
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {team.logo_url && (
            <img
              src={team.logo_url}
              alt={team.name}
              className="w-12 h-12 rounded-xl object-cover border border-dark-border"
            />
          )}
          <div>
            <h2 className="font-display text-2xl font-bold">Matchs</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {matches.length} partie{matches.length !== 1 ? 's' : ''} importée{matches.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtre type */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {TYPE_FILTERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === id
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 bg-dark-bg border border-dark-border rounded-xl hover:border-accent-blue/50 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
          <FileJson size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-300 font-medium mb-1">
            {matches.length === 0 ? 'Aucune partie importée' : 'Aucune partie dans cette catégorie'}
          </p>
          <p className="text-gray-500 text-sm">
            {matches.length === 0
              ? 'Importez vos parties depuis Import dans le menu.'
              : 'Essayez un autre filtre.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const allParticipants = m.team_match_participants || []
            const ourTeam = allParticipants.filter((p) => p.team_side === 'our' || !p.team_side)
            const enemyTeam = allParticipants.filter((p) => p.team_side === 'enemy')
            const isOurBlue = m.our_team_id === 100
            const blueSide = isOurBlue ? ourTeam : enemyTeam
            const redSide = isOurBlue ? enemyTeam : ourTeam
            const durationMin = m.game_duration ? Math.round(m.game_duration / 60) : null
            const dateStr = m.game_creation
              ? new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              : null

            return (
              <Link
                key={m.id}
                to={`/team/matchs/${m.id}`}
                className="block bg-dark-card border border-dark-border rounded-2xl p-4 hover:border-accent-blue/40 hover:bg-dark-card/80 transition-all group"
              >
                {/* Ligne du haut : résultat + infos + date */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {/* Résultat */}
                  <div className={`flex items-center justify-center w-20 h-9 rounded-xl font-bold text-sm ${
                    m.our_win
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'bg-red-500/15 text-red-400 border border-red-500/25'
                  }`}>
                    {m.our_win ? 'Victoire' : 'Défaite'}
                  </div>

                  {/* Type */}
                  <TypeBadge type={m.match_type} />

                  {/* Durée */}
                  {durationMin != null && (
                    <span className="text-sm text-gray-400">{durationMin} min</span>
                  )}

                  {/* Side */}
                  {m.our_team_id != null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.our_team_id === 100
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-red-400 bg-red-500/10'
                    }`}>
                      {m.our_team_id === 100 ? 'Blue side' : 'Red side'}
                    </span>
                  )}

                  {/* Date */}
                  {dateStr && (
                    <span className="ml-auto text-xs text-gray-500">{dateStr}</span>
                  )}
                </div>

                {/* Champions */}
                <div className="flex flex-col gap-2">
                  <ChampionStrip participants={blueSide} side="blue" />
                  <ChampionStrip participants={redSide} side="red" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
