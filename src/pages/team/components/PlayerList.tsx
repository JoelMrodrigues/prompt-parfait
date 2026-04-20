/**
 * Liste des joueurs de l'équipe — grille par rôle (titulaires) + section Remplaçants (subs)
 */
import { useMemo } from 'react'
import { PlayerCard } from './PlayerCard'
import { ROSTER_ROLES, ROLE_LABELS } from '../constants/roles'
import { Users, Plus, BarChart3 } from 'lucide-react'

function normalizeRole(position: string | null | undefined): string {
  const r = (position || '').toUpperCase()
  return r === 'BOT' ? 'ADC' : r
}

export const PlayerList = ({
  players,
  onEdit,
  onDelete,
  onAdd,
  isFlexTeam,
}: {
  players: any[]
  onEdit: (p: any) => void
  onDelete: (p: any) => void
  onAdd?: () => void
  isFlexTeam?: boolean
}) => {
  const starters = useMemo(() => players.filter((p) => p.player_type !== 'sub'), [players])
  const subs = useMemo(() => players.filter((p) => p.player_type === 'sub'), [players])

  const startersByRole = useMemo(() => {
    const map: Record<string, any[]> = { TOP: [], JNG: [], MID: [], ADC: [], SUP: [], FLEX: [] }
    starters.forEach((p) => {
      const role = normalizeRole(p.position)
      if (role === 'FLEX') map['FLEX'].push(p)
      else if (map[role]) map[role].push(p)
      else map['FLEX'].push(p)
    })
    return map
  }, [starters])

  // Colonnes à afficher :
  // 1. Rôles standard avec au moins un joueur (dans l'ordre TOP→JNG→MID→ADC→SUP)
  // 2. Une colonne individuelle par joueur FLEX
  const starterCols = useMemo(() => {
    const cols: Array<{ key: string; label: string; players: any[] }> = []
    ROSTER_ROLES.forEach((role) => {
      if (startersByRole[role].length > 0) {
        cols.push({ key: role, label: ROLE_LABELS[role] || role, players: startersByRole[role] })
      }
    })
    startersByRole['FLEX'].forEach((player, i) => {
      cols.push({ key: `FLEX_${i}`, label: 'Flex', players: [player] })
    })
    return cols
  }, [startersByRole])

  // Classes Tailwind littérales pour que le JIT ne les purge pas
  const LG_COLS = ['lg:grid-cols-1', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5', 'lg:grid-cols-6']
  const lgColsClass = LG_COLS[Math.min(starterCols.length, 6)] ?? 'lg:grid-cols-5'


  if (players.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border border-dashed rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-5">
          <Users className="w-8 h-8 text-accent-blue/60" />
        </div>
        <h3 className="text-white font-semibold mb-2">Aucun joueur dans l'équipe</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
          Ajoutez vos joueurs pour suivre leur rang, leurs champions et leur forme en temps réel.
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} />
            Ajouter un joueur
          </button>
        )}
        <div className="mt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto text-left">
          {[
            { icon: Users, text: 'Rang Riot' },
            { icon: BarChart3, text: 'Stats Solo Q' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
              <Icon size={13} />
              {text}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Titulaires — grille : rôles remplis + une colonne par joueur FLEX */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${lgColsClass} gap-5`}>
        {starterCols.map((col) => (
          <div key={col.key}>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {col.label}
            </h4>
            <div className="space-y-4">
              {col.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onEdit={() => onEdit(player)}
                  onDelete={() => onDelete(player)}
                  isFlexTeam={isFlexTeam}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Remplaçants — section séparée si des subs existent */}
      {subs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-dark-border" />
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
              Remplaçants · {subs.length}
            </h4>
            <div className="h-px flex-1 bg-dark-border" />
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            {subs.map((player) => (
              <div key={player.id} className="w-full sm:w-72">
                <PlayerCard
                  player={player}
                  onEdit={() => onEdit(player)}
                  onDelete={() => onDelete(player)}
                  isFlexTeam={isFlexTeam}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
