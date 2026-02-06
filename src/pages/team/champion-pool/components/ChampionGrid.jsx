/**
 * Grille de champions - draggable et cliquable (si colonne sélectionnée)
 */
import { getChampionImage } from '../../../../lib/championImages'

export const ChampionGrid = ({
  champions = [],
  activeTier,
  onAddChampion,
  championIdsInTiers = [],
}) => {
  const handleDragStart = (e, champ) => {
    e.dataTransfer.setData('application/json', JSON.stringify(champ))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (champ) => {
    if (activeTier && onAddChampion) {
      onAddChampion(champ, activeTier)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {champions.map((champ) => {
        const isInTier = championIdsInTiers.includes(champ.id)
        const isClickable = activeTier && !isInTier

        return (
          <button
            key={champ.id}
            type="button"
            className={`w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0 transition-colors ${
              isInTier
                ? 'border-dark-border/50 opacity-50 cursor-not-allowed'
                : isClickable
                  ? 'border-dark-border hover:border-accent-blue cursor-pointer'
                  : 'border-dark-border hover:border-accent-blue/50 cursor-grab'
            }`}
            title={
              isInTier
                ? `${champ.name} (déjà dans le tier)`
                : isClickable
                  ? `Cliquer pour ajouter à ${activeTier}`
                  : `${champ.name} - glisser vers une colonne`
            }
            draggable={!isInTier}
            onDragStart={(e) => !isInTier && handleDragStart(e, champ)}
            onClick={() => handleClick(champ)}
            disabled={isInTier}
          >
            <img
              src={getChampionImage(champ.name)}
              alt={champ.name}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              onError={(e) => {
                e.target.src = '/resources/champions/icons/default.jpg'
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
