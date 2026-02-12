import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import { getChampionImage } from '../../lib/championImages'
import { useState } from 'react'

const ROLE_COLORS = {
  'TOP': 'from-blue-500 to-blue-700',
  'JNG': 'from-green-500 to-green-700',
  'MID': 'from-yellow-500 to-yellow-700',
  'BOT': 'from-red-500 to-red-700',
  'SUP': 'from-purple-500 to-purple-700',
}

const ROLE_LABELS = {
  'TOP': 'TOP',
  'JNG': 'JUNGLE',
  'MID': 'MID',
  'BOT': 'ADC',
  'SUP': 'SUPPORT',
}

/**
 * Retourne la couleur de fond selon le rang
 */
function getRankColor(rank) {
  if (!rank) return 'from-gray-500 to-gray-700'
  
  const rankLower = rank.toLowerCase()
  
  // Challenger - Bleu et jaune (dégradé)
  if (rankLower.includes('challenger')) {
    return 'from-yellow-400 via-blue-500 to-yellow-400'
  }
  
  // Grandmaster - Orange
  if (rankLower.includes('grandmaster')) {
    return 'from-orange-500 to-orange-700'
  }
  
  // Master - Violet
  if (rankLower.includes('master')) {
    return 'from-purple-500 to-purple-700'
  }
  
  // Diamond - Bleu
  if (rankLower.includes('diamond')) {
    return 'from-blue-500 to-blue-700'
  }
  
  // Emerald - Vert émeraude
  if (rankLower.includes('emerald')) {
    return 'from-emerald-500 to-emerald-700'
  }
  
  // Platinum - Gris bleuté
  if (rankLower.includes('platinum')) {
    return 'from-cyan-500 to-cyan-700'
  }
  
  // Gold - Jaune/Or
  if (rankLower.includes('gold')) {
    return 'from-yellow-500 to-yellow-700'
  }
  
  // Silver - Gris
  if (rankLower.includes('silver')) {
    return 'from-gray-400 to-gray-600'
  }
  
  // Bronze - Orange/Bronze
  if (rankLower.includes('bronze')) {
    return 'from-orange-600 to-orange-800'
  }
  
  // Iron - Gris foncé
  if (rankLower.includes('iron')) {
    return 'from-gray-600 to-gray-800'
  }
  
  // Par défaut
  return 'from-gray-500 to-gray-700'
}

export const PlayerCard = ({ player, onEdit, onDelete, onSyncOpgg, onClick }) => {
  const [syncing, setSyncing] = useState(false)
  const navigate = useNavigate()

  const handleCardClick = () => {
    if (onClick) {
      onClick(player)
    } else {
      navigate(`/team/joueurs/${player.id}`)
    }
  }
  const roleLabel = ROLE_LABELS[player.position] || player.position
  
  // Utiliser la couleur du rang si disponible, sinon la couleur du rôle
  const cardColor = player.rank ? getRankColor(player.rank) : (ROLE_COLORS[player.position] || 'from-gray-500 to-gray-700')
  
  // Générer le lien dpm.lol depuis le pseudo
  const generateDpmLink = (pseudo) => {
    if (!pseudo) return null
    // Format: https://dpm.lol/{pseudo}?queue=solo
    // Convertir # en - et encoder les espaces
    const formattedPseudo = pseudo.replace(/#/g, '-')
    return `https://dpm.lol/${encodeURIComponent(formattedPseudo)}?queue=solo`
  }
  
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null
  
  const handleSync = async () => {
    if (!onSyncOpgg) return
    setSyncing(true)
    try {
      await onSyncOpgg(player)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="bg-dark-card border border-dark-border rounded-lg overflow-hidden hover:border-accent-blue/50 transition-all cursor-pointer"
    >
      {/* Header avec gradient selon le rang ou le rôle */}
      <div className={`p-5 bg-gradient-to-r ${cardColor} relative`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-white mb-1">{player.player_name || 'Joueur'}</h3>
            <p className="text-sm text-white/90 font-medium">{player.pseudo || 'Pseudo'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(player) }}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Modifier"
            >
              <Edit2 size={16} className="text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(player.id) }}
              className="p-2 bg-white/20 rounded-lg hover:bg-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Rôle et Rang */}
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

      {/* Contenu */}
      <div className="p-5">
        {/* Liens OP.gg, dpm.lol et Lol Pro */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {player.opgg_link && (
            <a
              href={player.opgg_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-[100px] px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              <span>OP.gg</span>
            </a>
          )}
          {dpmLink && (
            <a
              href={dpmLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-[100px] px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              <span>dpm.lol</span>
            </a>
          )}
          {player.lolpro_link && (
            <a
              href={player.lolpro_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-[100px] px-3 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              <span>Lol Pro</span>
            </a>
          )}
          {player.pseudo && onSyncOpgg && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSync() }}
              disabled={syncing}
              className="px-3 py-2 bg-accent-blue/20 border border-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Synchroniser les données"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {/* Top 5 Champions */}
        {(() => {
          // Parser top_champions si c'est une string JSON
          let topChampions = player.top_champions
          if (typeof topChampions === 'string') {
            try {
              topChampions = JSON.parse(topChampions)
            } catch (e) {
              console.error('Erreur parsing top_champions:', e)
              topChampions = null
            }
          }
          
          if (!topChampions || !Array.isArray(topChampions) || topChampions.length === 0) {
            return null
          }
          
          return (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase">Top 5 Champions</h4>
              <div className="grid grid-cols-5 gap-2">
                {topChampions.slice(0, 5)
                  .filter(champion => {
                    const name = champion.name || champion
                    // Liste des mots à exclure (pas des champions)
                    const excludedWords = [
                      'Tierlist', 'Leaderboards', 'Esports', 'Games', 'Winrate', 'KDA',
                      'Damage', 'Gold', 'CS', 'Vision', 'Wards', 'Objectives', 'Not found',
                      'Rewind', 'Next', 'Previous', 'Home', 'Menu', 'Search', 'Filter',
                      'Settings', 'Profile', 'Stats', 'Matches', 'Build', 'Runes', 'Items',
                      'Performance', 'Champion', 'Parties', 'WR', 'All', 'Tous', 'View',
                      'More', 'See', 'Show', 'Hide', 'Toggle', 'Click', 'Button', 'Link'
                    ]
                    const nameLower = name?.toLowerCase() || ''
                    const isExcluded = excludedWords.some(word => nameLower === word.toLowerCase() || nameLower.includes(word.toLowerCase()))
                    return name && name.trim() && name !== 'Pas de données' && name.length > 1 && !isExcluded
                  })
                  .map((champion, idx) => {
                  const championName = champion.name || champion
                  const winrate = champion.winrate
                  
                  // Double vérification avant affichage
                  const excludedWords = [
                    'Tierlist', 'Leaderboards', 'Esports', 'Games', 'Winrate', 'KDA',
                    'Damage', 'Gold', 'CS', 'Vision', 'Wards', 'Objectives', 'Not found',
                    'Rewind', 'Next', 'Previous', 'Home', 'Menu', 'Search', 'Filter',
                    'Settings', 'Profile', 'Stats', 'Matches', 'Build', 'Runes', 'Items',
                    'Performance', 'Champion', 'Parties', 'WR', 'All', 'Tous', 'View',
                    'More', 'See', 'Show', 'Hide', 'Toggle', 'Click', 'Button', 'Link'
                  ]
                  const nameLower = championName?.toLowerCase() || ''
                  const isExcluded = excludedWords.some(word => 
                    nameLower === word.toLowerCase() || 
                    nameLower.includes(word.toLowerCase())
                  )
                  
                  if (!championName || championName === 'Pas de données' || isExcluded) return null
                  
                  return (
                    <div
                      key={idx}
                      className="flex flex-col"
                      title={championName}
                    >
                      {/* Nombre de parties jouées AU-DESSUS de l'image */}
                      {champion.games && (
                        <div className="text-xs text-center text-gray-400 mb-1">
                          {champion.games} {champion.games === 1 ? 'partie' : 'parties'}
                        </div>
                      )}
                      
                      {/* Image du champion */}
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-dark-border mb-1">
                        <img
                          src={getChampionImage(championName)}
                          alt={championName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Erreur chargement image pour', championName)
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                      
                      {/* Winrate EN DESSOUS de l'image */}
                      {winrate && (
                        <div className="text-xs text-center text-gray-400">
                          {winrate}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </motion.div>
  )
}
