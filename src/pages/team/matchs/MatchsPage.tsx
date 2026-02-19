/**
 * Page Matchs - Liste des parties (cliquables pour détail)
 * Source centralisée des données matchs pour les autres pages équipe
 */
import { Link } from 'react-router-dom'
import { RefreshCw, FileJson } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'

// Ordre d'affichage: Top, Jungle, Mid, ADC, Support (gauche → droite)
const ROLE_SORT_KEY = { TOP: 0, JNG: 1, JUNGLE: 1, MID: 2, ADC: 3, BOT: 3, SUP: 4, SUPPORT: 4 }

function sortByRole(participants) {
  return [...participants].sort((a, b) => {
    const rA = (a.role || '').toUpperCase().replace(/\s/g, '')
    const rB = (b.role || '').toUpperCase().replace(/\s/g, '')
    const idxA = ROLE_SORT_KEY[rA] ?? 99
    const idxB = ROLE_SORT_KEY[rB] ?? 99
    return idxA - idxB
  })
}

function ChampionRow({ participants, sideLabel, sideColor }) {
  const sorted = sortByRole(participants)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-xs font-medium w-14 shrink-0 ${sideColor}`}>{sideLabel}</span>
      <div className="flex flex-wrap items-center gap-2">
        {sorted.map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg rounded-lg">
            <img
              src={getChampionImage(p.champion_name)}
              alt={getChampionDisplayName(p.champion_name) || p.champion_name}
              className="w-7 h-7 rounded object-cover"
            />
            <span className="text-sm">
              {getChampionDisplayName(p.champion_name) || p.champion_name}
            </span>
            <span className="text-xs text-gray-500">
              {p.kills}/{p.deaths}/{p.assists}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const MatchsPage = () => {
  const { team } = useTeam()
  const { matches, loading, refetch } = useTeamMatches(team?.id)

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold mb-1">Matchs</h2>
          <p className="text-gray-400">
            Gérez vos parties. Les données sont utilisées pour les stats joueurs et Pool Champ.
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <FileJson size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 mb-2">Aucun match pour le moment</p>
          <p className="text-gray-500 text-sm">
            Importez des parties depuis <strong>Import</strong> dans le menu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const allParticipants = m.team_match_participants || []
            const ourTeam = allParticipants.filter((p) => p.team_side === 'our' || !p.team_side)
            const enemyTeam = allParticipants.filter((p) => p.team_side === 'enemy')
            // our_team_id 100 = blue, 200 = red → blue en haut, red en bas
            const isOurBlue = m.our_team_id === 100
            const blueSide = isOurBlue ? ourTeam : enemyTeam
            const redSide = isOurBlue ? enemyTeam : ourTeam

            return (
              <Link
                key={m.id}
                to={`/team/matchs/${m.id}`}
                className="block w-full text-left bg-dark-card border border-dark-border rounded-lg p-4 hover:border-accent-blue/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-500">#{m.game_id}</span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        m.our_win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {m.our_win ? 'Victoire' : 'Défaite'}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {m.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}
                    </span>
                  </div>
                  {m.game_creation && (
                    <span className="text-xs text-gray-600">
                      {new Date(m.game_creation).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <ChampionRow participants={blueSide} sideLabel="Blue" sideColor="text-blue-400" />
                  <ChampionRow participants={redSide} sideLabel="Red" sideColor="text-red-400" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
