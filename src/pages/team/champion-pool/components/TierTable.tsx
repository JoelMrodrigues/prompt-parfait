/**
 * Tableau S A B C - colonnes droppables et sélectionnables
 * Drag & drop + mode clic (colonne sélectionnée puis clic sur champion)
 */
import { getChampionImage } from '../../../../lib/championImages'
import { TIER_KEYS, FIXED_TIER } from '../constants/tiers'
import { X, Dumbbell } from 'lucide-react'

export const TierTable = ({
  tiers = {},
  activeTier,
  onColumnSelect,
  onDrop,
  onRemove,
  columnLabels = {},
}: {
  tiers?: Record<string, any[]>
  activeTier?: any
  onColumnSelect?: any
  onDrop?: any
  onRemove?: any
  columnLabels?: Record<string, string>
}) => {
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, tier) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (data) {
      try {
        const champ = JSON.parse(data)
        onDrop?.(champ, tier)
      } catch (_) {}
    }
  }

  const tierStyle: Record<string, { header: string; bar: string; ring: string; hoverBorder: string }> = {
    Training: { header: 'text-emerald-400', bar: 'bg-emerald-500', ring: 'ring-emerald-500/40', hoverBorder: 'group-hover:border-emerald-500/60' },
    S:        { header: 'text-amber-400',   bar: 'bg-amber-500',   ring: 'ring-amber-500/40',  hoverBorder: 'group-hover:border-amber-500/60'   },
    A:        { header: 'text-violet-400',  bar: 'bg-violet-500',  ring: 'ring-violet-500/40', hoverBorder: 'group-hover:border-violet-500/60'  },
    B:        { header: 'text-blue-400',    bar: 'bg-blue-500',    ring: 'ring-blue-500/40',   hoverBorder: 'group-hover:border-blue-500/60'    },
    C:        { header: 'text-gray-400',    bar: 'bg-gray-500',    ring: 'ring-gray-500/40',   hoverBorder: 'group-hover:border-gray-500/60'    },
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      <table className="w-full table-fixed">
        <thead className="sticky top-0 bg-dark-bg/98 z-10 backdrop-blur-sm">
          <tr>
            {TIER_KEYS.map((tier) => {
              const isFixed = tier === FIXED_TIER
              const label = isFixed ? tier : (columnLabels[tier] || tier)
              const style = tierStyle[tier] ?? tierStyle['C']
              const isActive = activeTier === tier
              return (
                <th
                  key={tier}
                  className={`px-3 py-3 text-center text-xs font-bold cursor-pointer transition-all select-none
                    ${isActive ? `bg-dark-border/40` : 'hover:bg-dark-border/20'}`}
                  style={{ width: `${100 / TIER_KEYS.length}%` }}
                  onClick={() => onColumnSelect?.(tier)}
                  title={isFixed ? 'Champions à travailler (colonne fixe)' : isActive ? "Cliquez sur un champion pour l'ajouter" : 'Sélectionner cette colonne'}
                >
                  <span className={`flex items-center justify-center gap-1.5 ${style.header}`}>
                    {isFixed && <Dumbbell size={12} />}
                    {label}
                  </span>
                  {/* colored bottom bar */}
                  <div className={`mt-1.5 mx-auto h-0.5 rounded-full transition-all duration-300 ${style.bar} ${isActive ? 'w-full opacity-100' : 'w-4 opacity-40'}`} />
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          <tr className="divide-x divide-dark-border/40">
            {TIER_KEYS.map((tier) => {
              const style = tierStyle[tier] ?? tierStyle['C']
              const isActive = activeTier === tier
              return (
                <td
                  key={tier}
                  className={`px-3 py-5 align-top min-h-[160px] transition-colors duration-200
                    ${isActive ? `ring-2 ring-inset ${style.ring} bg-dark-border/10` : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, tier)}
                >
                  <div className="flex flex-wrap gap-2">
                    {(tiers[tier] || []).map((champ) => (
                      <div
                        key={champ.id}
                        className="relative group"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(champ))
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                      >
                        <div
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-colors
                            border-dark-border ${style.hoverBorder}`}
                          title={champ.name}
                        >
                          <img
                            src={getChampionImage(champ.name)}
                            alt={champ.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemove?.(champ, tier)
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Retirer"
                        >
                          <X size={11} className="!text-white" />
                        </button>
                      </div>
                    ))}
                    {(tiers[tier] || []).length === 0 && (
                      <div className="w-full h-24 flex items-center justify-center">
                        <span className="text-[11px] text-gray-700">Glisser ici</span>
                      </div>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
