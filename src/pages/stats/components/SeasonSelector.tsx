// Années disponibles dans l'ordre décroissant (S16 = 2026, S15 = 2025, ...)
const SEASONS = ['S16', 'S15', 'S14', 'S13', 'S12', 'S11', 'S10']

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
