import { getAvailableSeasons } from '../../lib/googleDriveLoader'

const SEASONS = getAvailableSeasons() // Chargé dynamiquement

export const SeasonSelector = ({ selected, onChange }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {SEASONS.map((season) => (
        <button
          key={season}
          onClick={() => onChange(season)}
          className={`px-4 py-2 rounded-lg transition-all ${
            selected === season
              ? 'bg-accent-blue text-white'
              : 'bg-dark-card border border-dark-border hover:border-gray-600'
          }`}
        >
          {season}
        </button>
      ))}
    </div>
  )
}
