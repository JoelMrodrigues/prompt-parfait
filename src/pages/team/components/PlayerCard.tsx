import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { getChampionImage } from '../../../lib/championImages'
import { useState } from 'react'

const ROLE_COLORS = {
  TOP: 'from-blue-500 to-blue-700',
  JNG: 'from-green-500 to-green-700',
  MID: 'from-yellow-500 to-yellow-700',
  BOT: 'from-red-500 to-red-700',
  SUP: 'from-purple-500 to-purple-700',
}

const ROLE_LABELS = {
  TOP: 'TOP',
  JNG: 'JUNGLE',
  MID: 'MID',
  BOT: 'ADC',
  SUP: 'SUPPORT',
}

function getRankColor(rank) {
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

export const PlayerCard = ({ player, onEdit, onDelete, onSyncOpgg, onClick }: { player: any; onEdit: any; onDelete: any; onSyncOpgg?: any; onClick?: any }) => {
  const [syncing, setSyncing] = useState(false)
  const navigate = useNavigate()

  const handleCardClick = () => {
    if (onClick) onClick(player)
    else navigate(`/team/joueurs/${player.id}`)
  }

  const roleLabel = ROLE_LABELS[player.position] || player.position
  const cardColor = player.rank
    ? getRankColor(player.rank)
    : ROLE_COLORS[player.position] || 'from-gray-500 to-gray-700'

  const dpmLink = player.pseudo
    ? `https://dpm.lol/${encodeURIComponent(player.pseudo.replace(/#/g, '-'))}?queue=solo`
    : null

  const handleSync = async () => {
    if (!onSyncOpgg) return
    setSyncing(true)
    try {
      await onSyncOpgg(player)
    } finally {
      setSyncing(false)
    }
  }

  const EXCLUDED_WORDS = [
    'Tierlist',
    'Leaderboards',
    'Esports',
    'Games',
    'Winrate',
    'KDA',
    'Damage',
    'Gold',
    'CS',
    'Vision',
    'Wards',
    'Objectives',
    'Not found',
    'Rewind',
    'Next',
    'Previous',
    'Home',
    'Menu',
    'Search',
    'Filter',
    'Settings',
    'Profile',
    'Stats',
    'Matches',
    'Build',
    'Runes',
    'Items',
    'Performance',
    'Champion',
    'Parties',
    'WR',
    'All',
    'Tous',
    'View',
    'More',
    'See',
    'Show',
    'Hide',
    'Toggle',
    'Click',
    'Button',
    'Link',
  ]

  const isValidChamp = (name) => {
    if (!name || !name.trim() || name === 'Pas de données' || name.length <= 1) return false
    const nameLower = name.toLowerCase()
    return !EXCLUDED_WORDS.some(
      (w) => nameLower === w.toLowerCase() || nameLower.includes(w.toLowerCase())
    )
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
    .filter((ch) => isValidChamp(ch.name || ch))
    .map((ch) => ({ name: ch.name || ch, winrate: ch.winrate, games: ch.games }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="bg-dark-card border border-dark-border rounded-lg overflow-hidden hover:border-accent-blue/50 transition-all cursor-pointer"
    >
      <div className={`p-5 bg-gradient-to-r ${cardColor} relative`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-white mb-1">{player.player_name || 'Joueur'}</h3>
            <p className="text-sm text-white/90 font-medium">{player.pseudo || 'Pseudo'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(player)
              }}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Modifier"
            >
              <Edit2 size={16} className="text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(player.id)
              }}
              className="p-2 bg-white/20 rounded-lg hover:bg-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-semibold text-white">{roleLabel}</span>
          </div>
          {player.rank && (
            <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="text-xs font-medium text-white">{player.rank}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4 flex-nowrap">
          {player.opgg_link && (
            <a
              href={player.opgg_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">OP.gg</span>
            </a>
          )}
          {dpmLink && (
            <a
              href={dpmLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">dpm.lol</span>
            </a>
          )}
          {player.lolpro_link && (
            <a
              href={player.lolpro_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">Lol Pro</span>
            </a>
          )}
          {player.pseudo && onSyncOpgg && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSync()
              }}
              disabled={syncing}
              className="p-2 bg-accent-blue/20 border border-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors disabled:opacity-50 shrink-0"
              title="Synchroniser"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {validChampions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide text-center">
              Top 5 Champions
            </h4>
            <div className="flex gap-2 justify-center flex-wrap">
              {validChampions.map((champion, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center flex-shrink-0"
                  title={champion.name}
                >
                  {champion.games != null && (
                    <div className="text-xs text-gray-400 mb-1">
                      {champion.games} {champion.games === 1 ? 'partie' : 'parties'}
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-dark-border">
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
                    <div className="text-xs text-gray-400 mt-1">{champion.winrate}%</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
