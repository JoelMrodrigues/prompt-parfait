/**
 * Carte joueur — liste Joueurs (liens OP.gg / dpm / Sync dans la fiche détail uniquement)
 */
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2 } from 'lucide-react'
import { getChampionImage } from '../../../lib/championImages'
import { ROLE_CONFIG, ROLE_LABELS } from '../constants/roles'

function getRankColor(rank: string | null | undefined): string {
  if (!rank) return 'from-gray-500 to-gray-700'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'from-yellow-400 via-blue-500 to-yellow-400'
  if (r.includes('grandmaster')) return 'from-orange-500 to-orange-700'
  if (r.includes('master')) return 'from-purple-500 to-purple-700'
  if (r.includes('diamond')) return 'from-blue-500 to-blue-700'
  if (r.includes('emerald')) return 'from-emerald-500 to-emerald-700'
  if (r.includes('platinum')) return 'from-cyan-500 to-cyan-700'
  if (r.includes('gold')) return 'from-yellow-500 to-yellow-700'
  if (r.includes('silver')) return 'from-gray-400 to-gray-600'
  if (r.includes('bronze')) return 'from-orange-600 to-orange-800'
  if (r.includes('iron')) return 'from-gray-600 to-gray-800'
  return 'from-gray-500 to-gray-700'
}

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

/** Couleur du winrate % : Violet fluo 90–100%, Vert 60–80%, Orange 40–50%, Rouge sanguin 0–30% */
function getWinrateColor(wr: number): string {
  if (wr >= 90) return 'text-violet-300' // violet légèrement fluo
  if (wr >= 60) return 'text-green-400'
  if (wr >= 40) return 'text-orange-400'
  return 'text-red-700' // rouge sanguin
}

export const PlayerCard = ({
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
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG['TOP']
  const roleLabel = ROLE_LABELS[role] || player.position || '—'
  const cardColor = player.rank ? getRankColor(player.rank) : cfg.gradient.replace('/20', '/40')

  const handleCardClick = () => {
    if (onClick) onClick(player)
    else navigate(`/team/joueurs/${player.id}`)
  }

  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try {
      topChampions = JSON.parse(topChampions)
    } catch {
      topChampions = []
    }
  }
  const validChampions = (Array.isArray(topChampions) ? topChampions : [])
    .slice(0, 5)
    .filter((ch: any) => isValidChamp(ch.name || ch))
    .map((ch: any) => ({ name: ch.name || ch, winrate: ch.winrate, games: ch.games }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-accent-blue/50 transition-all cursor-pointer min-h-[200px]"
    >
      <div className={`p-5 bg-gradient-to-r ${cardColor} relative`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-white truncate">{player.player_name || 'Joueur'}</h3>
            <p className="text-sm text-white/90 truncate">{player.pseudo || '—'}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(player)
              }}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Modifier"
            >
              <Edit2 size={14} className="text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(player)
              }}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-red-500/80 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="px-2 py-0.5 rounded text-xs font-semibold text-white bg-white/20">
            {roleLabel}
          </span>
          {player.rank && (
            <span className="px-2 py-0.5 rounded text-xs font-medium text-white bg-white/20 truncate max-w-[140px]">
              {player.rank}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {validChampions.length > 0 ? (
          <div>
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
          </div>
        ) : (
          <p className="text-gray-600 text-xs text-center py-2">Sync en fiche pour les champions</p>
        )}
      </div>
    </motion.div>
  )
}
