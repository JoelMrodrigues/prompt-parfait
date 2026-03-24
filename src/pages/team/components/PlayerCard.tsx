/**
 * Carte joueur — liste Joueurs (liens OP.gg / dpm / Sync dans la fiche détail uniquement)
 */
import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2 } from 'lucide-react'
import { getChampionImage } from '../../../lib/championImages'
import { ROLE_LABELS } from '../constants/roles'
import { getRankImage } from '../joueurs/utils/playerDetailHelpers'

const EXCLUDED_CHAMP_WORDS = [
  'Tierlist', 'Leaderboards', 'Esports', 'Games', 'Winrate', 'KDA', 'Damage', 'Gold', 'CS',
  'Vision', 'Wards', 'Objectives', 'Not found', 'Rewind', 'Next', 'Previous', 'Home', 'Menu',
  'Search', 'Filter', 'Settings', 'Profile', 'Stats', 'Matches', 'Build', 'Runes', 'Items',
  'Performance', 'Champion', 'Parties', 'WR', 'All', 'Tous', 'View', 'More', 'See', 'Show', 'Hide',
  'Toggle', 'Click', 'Button', 'Link',
]

function isValidChamp(name: string | null | undefined): boolean {
  if (!name || !name.trim() || name === 'Pas de données' || name.length <= 1) return false
  const lower = name.toLowerCase()
  return !EXCLUDED_CHAMP_WORDS.some((w) => lower === w.toLowerCase() || lower.includes(w.toLowerCase()))
}

function formatRankDisplay(rank: string | null | undefined): string {
  if (!rank) return ''
  return rank.replace(/grandmaster/i, 'GM').replace(/challenger/i, 'Chal')
}

/** Couleur du winrate % : Violet fluo 90–100%, Vert 60–80%, Orange 40–50%, Rouge sanguin 0–30% */
function getWinrateColor(wr: number): string {
  if (wr >= 90) return 'text-violet-300' // violet légèrement fluo
  if (wr >= 60) return 'text-green-400'
  if (wr >= 40) return 'text-orange-400'
  return 'text-red-700' // rouge sanguin
}

export const PlayerCard = memo(({
  player,
  onEdit,
  onDelete,
  onClick,
}: {
  player: any
  onEdit: (p: any) => void
  onDelete: (p: any) => void
  onClick?: (p: any) => void
}) => {
  const navigate = useNavigate()
  const role = (player.position || '').toUpperCase() === 'BOT' ? 'ADC' : (player.position || '').toUpperCase()
  const roleLabel = ROLE_LABELS[role] || player.position || '—'
  const rankImage = getRankImage(player.rank)

  const handleCardClick = () => {
    if (onClick) onClick(player)
    else navigate(`/team/joueurs/${player.id}`)
  }

  const validChampions = useMemo(() => {
    let topChampions = player.top_champions
    if (typeof topChampions === 'string') {
      try {
        topChampions = JSON.parse(topChampions)
      } catch {
        topChampions = []
      }
    }
    return (Array.isArray(topChampions) ? topChampions : [])
      .slice(0, 5)
      .filter((ch: any) => isValidChamp(ch.name || ch))
      .map((ch: any) => ({ name: ch.name || ch, winrate: ch.winrate, games: ch.games }))
  }, [player.top_champions])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-accent-blue/50 transition-all cursor-pointer flex flex-col h-[240px]"
    >
      {/* Header — hauteur fixe pour que toutes les cards soient identiques */}
      <div className="bg-off-white dark:bg-black relative overflow-hidden h-[112px] shrink-0">
        {/* Image rang — ancrée en bas à droite, sous les boutons */}
        {rankImage && (
          <img
            src={rankImage}
            alt=""
            aria-hidden
            className="absolute bottom-0 right-2 w-20 h-20 object-contain pointer-events-none select-none"
          />
        )}
        {/* Boutons — top right */}
        <div className="absolute top-2 right-2 flex gap-1.5 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(player) }}
            className="p-1.5 bg-black/10 dark:bg-off-white/20 rounded-lg hover:bg-black/20 dark:hover:bg-off-white/30 transition-colors"
            title="Modifier"
            aria-label="Modifier le joueur"
          >
            <Edit2 size={14} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(player) }}
            className="p-1.5 bg-black/10 dark:bg-off-white/20 rounded-lg hover:bg-red-500/80 transition-colors"
            title="Supprimer"
            aria-label="Supprimer le joueur"
          >
            <Trash2 size={14} className="text-white" />
          </button>
        </div>
        {/* Texte — centré verticalement, padding droit pour laisser place à l'image */}
        <div className="h-full flex flex-col justify-center pl-5 pr-28 relative z-10">
          <h3 className="font-bold text-lg text-white truncate leading-tight">{player.player_name || 'Joueur'}</h3>
          <p className="text-sm text-white/60 truncate leading-tight">{player.pseudo || '—'}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-semibold text-white bg-black/10 dark:bg-off-white/20">
              {roleLabel}
            </span>
            {player.player_type === 'sub' && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold text-white/70 bg-black/5 dark:bg-off-white/10 border border-black/10 dark:border-off-white/20">
                SUB
              </span>
            )}
            {player.rank && (
              <span className="px-2 py-0.5 rounded text-xs font-medium text-white bg-black/10 dark:bg-off-white/10 truncate max-w-[110px]">
                {formatRankDisplay(player.rank)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body — champions collés tout en bas */}
      <div className="flex-1 flex flex-col">
        <div className="mt-auto px-4 pb-3 pt-2">
          {validChampions.length > 0 ? (
            <>
              <h4 className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider text-center">
                Top 5 Champions
              </h4>
              <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                {validChampions.map((champion: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center min-w-0 w-full" title={champion.name}>
                    {champion.games != null && (
                      <span className="text-[12px] text-white font-medium leading-none">{champion.games}</span>
                    )}
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-dark-border shrink-0">
                      <img
                        src={getChampionImage(champion.name)}
                        alt={champion.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                    {champion.winrate != null && (
                      <span className={`text-[12px] font-medium leading-none ${getWinrateColor(Number(champion.winrate))}`}>
                        {champion.winrate}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-600 text-xs text-center">Sync en fiche pour les champions</p>
          )}
        </div>
      </div>
    </motion.div>
  )
})
