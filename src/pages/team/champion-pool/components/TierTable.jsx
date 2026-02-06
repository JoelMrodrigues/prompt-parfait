/**
 * Tableau S A B C - colonnes droppables et sélectionnables
 * Drag & drop + mode clic (colonne sélectionnée puis clic sur champion)
 */
import { getChampionImage } from '../../../../lib/championImages'
import { TIER_KEYS } from '../constants/tiers'
import { X } from 'lucide-react'

export const TierTable = ({
  tiers = { S: [], A: [], B: [], C: [] },
  activeTier,
  onColumnSelect,
  onDrop,
  onRemove,
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

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
      <table className="w-full table-fixed">
        <thead className="sticky top-0 bg-dark-bg/95 z-10">
          <tr className="border-b border-dark-border">
            {TIER_KEYS.map((tier) => (
              <th
                key={tier}
                className={`px-4 py-3 text-center text-sm font-semibold w-[25%] cursor-pointer transition-colors ${
                  activeTier === tier
                    ? 'bg-accent-blue/20 text-accent-blue border-b-2 border-accent-blue'
                    : 'text-gray-300 hover:bg-dark-bg/80'
                }`}
                onClick={() => onColumnSelect?.(tier)}
                title={activeTier === tier ? 'Cliquez sur un champion pour l\'ajouter' : 'Sélectionner cette colonne'}
              >
                {tier}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {TIER_KEYS.map((tier) => (
              <td
                key={tier}
                className={`px-4 py-6 align-top border-r border-dark-border/50 min-h-[320px] last:border-r-0 ${
                  activeTier === tier ? 'ring-2 ring-inset ring-accent-blue/50' : ''
                }`}
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
                        className="w-14 h-14 rounded-lg overflow-hidden border border-dark-border hover:border-accent-blue/50 cursor-grab active:cursor-grabbing"
                        title={`${champ.name} - glisser pour déplacer`}
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
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Retirer"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
