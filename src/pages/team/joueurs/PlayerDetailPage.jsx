/**
 * Page détail d'un joueur - Stats solo q, pool champions, liens
 * Sidebar interne: Général, Solo Q, Team, Best Champs, Tableau Solo Q/Team, Points forts/faibles
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { usePlayerSync } from '../hooks/usePlayerSync'
import { getChampionImage, getBigChampionImage } from '../../../lib/championImages'
import { TIER_KEYS } from '../champion-pool/constants/tiers'
import { TierTable } from '../champion-pool/components/TierTable'
import { PlayerDetailSidebar } from './components/PlayerDetailSidebar'
import { usePlayerTeamStats } from '../hooks/usePlayerTeamStats'
import { useState } from 'react'

const ROLE_LABELS = {
  TOP: 'Top',
  JNG: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUP: 'Support',
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

export const PlayerDetailPage = () => {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { players = [], updatePlayer, refetch } = useTeam()
  const { syncExistingPlayer } = usePlayerSync()
  const { stats: teamStats, loading: teamStatsLoading } = usePlayerTeamStats(playerId)
  const [syncing, setSyncing] = useState(false)
  const [selectedSection, setSelectedSection] = useState('general')

  const player = players.find((p) => p.id === playerId)

  const generateDpmLink = (pseudo) => {
    if (!pseudo) return ''
    const formatted = pseudo.replace(/#/g, '-')
    return `https://dpm.lol/${encodeURIComponent(formatted)}?queue=solo`
  }

  const handleSync = async () => {
    if (!player?.pseudo) return
    setSyncing(true)
    try {
      const updateData = await syncExistingPlayer(player)
      if (updateData && Object.keys(updateData).length > 0) {
        await updatePlayer(player.id, updateData)
        await refetch()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Joueur introuvable</p>
        <button
          onClick={() => navigate('/team/joueurs')}
          className="text-accent-blue hover:underline"
        >
          Retour aux joueurs
        </button>
      </div>
    )
  }

  const roleLabel = ROLE_LABELS[player.position] || player.position
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null

  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try {
      topChampions = JSON.parse(topChampions)
    } catch {
      topChampions = []
    }
  }
  if (!Array.isArray(topChampions)) topChampions = []

  const mostPlayedChamp = topChampions[0]
  const mostPlayedName = mostPlayedChamp ? (mostPlayedChamp.name || mostPlayedChamp) : null
  const bigChampBg = mostPlayedName ? getBigChampionImage(mostPlayedName) : null

  const tiersRaw = (player.champion_pools || []).reduce((acc, cp) => {
    const tier = cp.tier || 'A'
    if (TIER_KEYS.includes(tier)) {
      if (!acc[tier]) acc[tier] = []
      acc[tier].push({ id: cp.champion_id, name: cp.champion_id })
    }
    return acc
  }, {})
  const tiersForTable = Object.fromEntries(TIER_KEYS.map((k) => [k, tiersRaw[k] || []]))

  const renderSection = () => {
    switch (selectedSection) {
      case 'general':
        return (
          <section className="space-y-6">
            <div
              className={`relative rounded-xl p-6 overflow-hidden ${bigChampBg ? '' : `bg-gradient-to-r ${getRankColor(player.rank)}`}`}
              style={bigChampBg ? {
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.4) 100%), url(${bigChampBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
              } : undefined}
            >
              <div className="relative z-10">
                <h1 className="font-display text-2xl font-bold text-white mb-1">
                  {player.player_name || 'Joueur'}
                </h1>
              <p className="text-white/90 mb-3">{player.pseudo || '—'}</p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                  {roleLabel}
                </span>
                {player.rank && (
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                    {player.rank}
                  </span>
                )}
              </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.opgg_link && (
                <a
                  href={player.opgg_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={16} />
                  OP.gg
                </a>
              )}
              {dpmLink && (
                <>
                  <a
                    href={dpmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    dpm.lol
                  </a>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 py-2 bg-accent-blue/20 border border-accent-blue rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                </>
              )}
              {player.lolpro_link && (
                <a
                  href={player.lolpro_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={16} />
                  Lol Pro
                </a>
              )}
            </div>
          </section>
        )
      case 'soloq':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Solo Q — Champions les plus joués
            </h2>
            {topChampions.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {topChampions.slice(0, 5).map((champ, idx) => {
                  const name = champ.name || champ
                  if (!name || typeof name !== 'string') return null
                  return (
                    <div key={idx} className="flex flex-col items-center" title={name}>
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-dark-border">
                        <img src={getChampionImage(name)} alt={name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-gray-400 mt-1 truncate max-w-[60px]">{name}</span>
                      {(champ.games || champ.winrate) && (
                        <span className="text-xs text-gray-500">
                          {champ.games && `${champ.games} pts`}
                          {champ.games && champ.winrate && ' · '}
                          {champ.winrate && `${champ.winrate}%`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune donnée. Cliquez sur Sync.</p>
            )}
          </section>
        )
      case 'team':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Stats en équipe
            </h2>
            {teamStatsLoading ? (
              <p className="text-gray-500 text-sm">Chargement...</p>
            ) : teamStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-dark-border">
                      <th className="py-2 pr-4">Champion</th>
                      <th className="py-2 pr-4">K/D/A</th>
                      <th className="py-2 pr-4">KDA</th>
                      <th className="py-2 pr-4">DMG</th>
                      <th className="py-2 pr-4">Gold</th>
                      <th className="py-2 pr-4">CS</th>
                      <th className="py-2 pr-4">Vision</th>
                      <th className="py-2">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map((s, i) => {
                      const m = s.team_matches
                      return (
                        <tr key={s.id || i} className="border-b border-dark-border/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={getChampionImage(s.champion_name)}
                                alt={s.champion_name}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span>{s.champion_name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{s.kills}/{s.deaths}/{s.assists}</td>
                          <td className="py-3 pr-4">{s.kda ?? '—'}</td>
                          <td className="py-3 pr-4">{s.total_damage_dealt_to_champions?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 pr-4">{s.gold_earned?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 pr-4">{s.cs ?? '—'}</td>
                          <td className="py-3 pr-4">{s.vision_score ?? '—'}</td>
                          <td className="py-3">
                            <span className={m?.our_win ? 'text-green-400' : 'text-red-400'}>
                              {m?.our_win ? 'Victoire' : 'Défaite'}
                            </span>
                            {m?.game_duration && (
                              <span className="text-gray-500 ml-1">({Math.round(m.game_duration / 60)} min)</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-dark-card border border-dark-border rounded-lg p-6">
                <p className="text-gray-500 text-sm">
                  Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.
                </p>
              </div>
            )}
          </section>
        )
      case 'pool-champ':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Pool Champ
            </h2>
            <TierTable
              tiers={tiersForTable}
              activeTier={null}
            />
            {TIER_KEYS.every((k) => !(tiersForTable[k] || []).length) && (
              <p className="text-gray-500 text-sm mt-4">
                Aucun champion dans le pool. Rendez-vous dans Pool de Champions pour en ajouter.
              </p>
            )}
          </section>
        )
      case 'points-forts':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Points forts détaillés
            </h2>
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <p className="text-gray-500 text-sm">Points forts du joueur — à venir.</p>
            </div>
          </section>
        )
      case 'points-faibles':
        return (
          <section>
            <h2 className="font-display text-lg font-semibold text-white mb-4">
              Points faibles détaillés
            </h2>
            <div className="bg-dark-card border border-dark-border rounded-lg p-6">
              <p className="text-gray-500 text-sm">Points faibles du joueur — à venir.</p>
            </div>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex w-full -ml-6 -mr-6">
      {/* Sidebar interne à gauche */}
      <PlayerDetailSidebar
        selectedSection={selectedSection}
        onSelect={setSelectedSection}
      />

      {/* Zone contenu */}
      <div className="flex-1 min-w-0 pl-6 pr-6 overflow-auto">
        <button
          onClick={() => navigate('/team/joueurs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Retour aux joueurs
        </button>

        {renderSection()}
      </div>
    </div>
  )
}
