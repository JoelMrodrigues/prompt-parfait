/**
 * Page détail joueur — 4 cartes : Général | Solo Q | Team | Pool Champ
 * Toute la logique est dans usePlayerDetail.
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ExternalLink,
  User,
  Swords,
  Users,
  Trophy,
  BarChart3,
  Sparkles,
  History,
  ChevronDown,
  TrendingUp,
  X,
  Table2,
  LayoutList,
  Target,
  Wrench,
  Flame,
} from 'lucide-react'
import {
  getChampionImage,
  getBigChampionImage,
  getChampionDisplayName,
} from '../../../lib/championImages'
import { TIER_KEYS } from '../champion-pool/constants/tiers'
import { TierTable } from '../champion-pool/components/TierTable'
import { PlayerTeamStatsSection } from './components/PlayerTeamStatsSection'
import { PlayerTimelineAdvantageSection } from './components/PlayerTimelineAdvantageSection'
import { LpCurveChart } from './charts/LpCurveChart'
import { CoachCard } from './components/CoachCard'
import { usePlayerDetail } from './hooks/usePlayerDetail'
import { getRankColor, generateDpmLink, ROLE_LABELS } from './utils/playerDetailHelpers'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC, PAGE_SIZE } from '../../../lib/constants'

const MAIN_CARDS = [
  { id: 'general', label: 'Général', icon: User },
  { id: 'soloq', label: 'Solo Q', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'pool-champ', label: 'Pool Champ', icon: Trophy },
  { id: 'coach', label: 'Coach', icon: Target },
]

const SOLOQ_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
  { id: 'build', label: 'Build', icon: Wrench },
  { id: 'runes', label: 'Runes', icon: Flame },
]

const RUNE_TREE_NAMES: Record<number, string> = {
  8000: 'Précision', 8100: 'Domination', 8200: 'Sorcellerie', 8300: 'Inspiration', 8400: 'Résolution',
}

const TEAM_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
  { id: 'allstats', label: 'All Stats', icon: Table2 },
]

export const PlayerDetailPage = () => {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const d = usePlayerDetail(playerId)

  if (!d.player) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Joueur introuvable</p>
        <button onClick={() => navigate('/team/joueurs')} className="text-accent-blue hover:underline">
          Retour aux joueurs
        </button>
      </div>
    )
  }

  const { player } = d
  const roleLabel = ROLE_LABELS[player.position] || player.position
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null

  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try { topChampions = JSON.parse(topChampions) } catch { topChampions = [] }
  }
  if (!Array.isArray(topChampions)) topChampions = []
  const mostPlayedChamp = topChampions[0]
  const mostPlayedName = mostPlayedChamp ? mostPlayedChamp.name || mostPlayedChamp : null
  const bigChampBg = mostPlayedName ? getBigChampionImage(mostPlayedName) : null

  const tiersRaw = (player.champion_pools || []).reduce((acc: any, cp: any) => {
    const tier = cp.tier || 'A'
    if (TIER_KEYS.includes(tier)) {
      if (!acc[tier]) acc[tier] = []
      acc[tier].push({ id: cp.champion_id, name: cp.champion_id })
    }
    return acc
  }, {})
  const tiersForTable = Object.fromEntries(TIER_KEYS.map((k) => [k, tiersRaw[k] || []])) as { S: any[]; A: any[]; B: any[]; C: any[] }

  return (
    <div className="space-y-8">
      {/* Header : retour + sélecteur compte */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/team/joueurs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Retour aux joueurs
        </button>
        <div className="flex gap-2">
          {[
            { idx: 1, label: player.pseudo || 'Compte 1' },
            { idx: 2, label: player.secondary_account || 'Compte 2' },
          ].map(({ idx, label }) => (
            <button
              key={idx}
              type="button"
              onClick={() => d.setSelectedSoloqAccount(idx)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors truncate max-w-[180px] ${
                d.selectedSoloqAccount === idx
                  ? 'bg-accent-blue text-white border border-accent-blue'
                  : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
              }`}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bloc identité */}
      <div
        className={`relative rounded-2xl overflow-hidden ${bigChampBg ? '' : `bg-gradient-to-r ${getRankColor(player.rank)}`}`}
        style={
          bigChampBg
            ? {
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%), url(${bigChampBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
              }
            : undefined
        }
      >
        <div className="relative z-10 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              <img
                src={mostPlayedName ? getChampionImage(mostPlayedName) : 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aatrox.png'}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-off-white/20 shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-off-white">
                  {player.player_name || 'Joueur'}
                </h1>
                <p className="text-off-white/80 mt-1">{player.pseudo || '—'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-off-white/20 rounded-lg text-sm font-medium text-off-white">{roleLabel}</span>
                  {player.rank && (
                    <span className="px-3 py-1 bg-off-white/20 rounded-lg text-sm font-medium text-off-white">{player.rank}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.opgg_link && (
                <a href={player.opgg_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> OP.gg
                </a>
              )}
              {dpmLink && (
                <a href={dpmLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> dpm.lol
                </a>
              )}
              {player.lolpro_link && (
                <a href={player.lolpro_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> Lol Pro
                </a>
              )}
            </div>
          </div>
          {player.rank_updated_at != null && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-off-white/10">
              <span className="text-sm text-off-white/80">
                Dernière MAJ rang :{' '}
                {new Date(player.rank_updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5 cartes principales — une seule ligne */}
      <div className="grid grid-cols-5 gap-3">
        {MAIN_CARDS.map((card) => {
          const Icon = card.icon
          const isActive = d.selectedCard === card.id
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => d.setSelectedCard(card.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors text-left ${
                isActive
                  ? 'border-accent-blue bg-accent-blue/10 shadow-lg shadow-accent-blue/20'
                  : 'border-dark-border bg-dark-card/50 hover:border-dark-border/80 hover:bg-dark-card/70'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${isActive ? 'bg-accent-blue/20' : 'bg-dark-bg/50'}`}>
                <Icon size={22} className={isActive ? 'text-accent-blue' : 'text-gray-400'} />
              </div>
              <span className={`font-display font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {card.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sous-menu Solo Q */}
      {d.selectedCard === 'soloq' && (
        <div className="flex flex-wrap gap-2">
          {SOLOQ_SUB.map((sub) => {
            const SubIcon = sub.icon
            const isActive = d.selectedSoloqSub === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => d.setSelectedSoloqSub(sub.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-blue text-white' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
                }`}
              >
                <SubIcon size={16} />
                {sub.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Sous-menu Team */}
      {d.selectedCard === 'team' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TEAM_SUB.map((sub) => {
              const SubIcon = sub.icon
              const isActive = d.selectedTeamSub === sub.id
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => d.setSelectedTeamSub(sub.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-accent-blue text-white' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  <SubIcon size={16} />
                  {sub.label}
                </button>
              )
            })}
          </div>
          {/* Filtre type de match */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {([
              { id: 'all' as const,        label: 'Tous',     Icon: LayoutList },
              { id: 'scrim' as const,      label: 'Scrims',   Icon: Swords     },
              { id: 'tournament' as const, label: 'Tournois', Icon: Trophy     },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => d.setTeamMatchTypeFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  d.teamMatchTypeFilter === id
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de contenu */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/30 p-6 min-h-[200px]">

        {/* ── Général ── */}
        {d.selectedCard === 'general' && (
          <GeneralTab d={d} player={player} />
        )}

        {/* ── Solo Q ── */}
        {d.selectedCard === 'soloq' && (
          <>
            {d.selectedSoloqSub === 'statistiques' && (
              <div className="space-y-4">
                {/* Sync discret */}
                {d.activeSoloqPseudo?.trim() && (
                  <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-dark-border/50">
                    {d.countInDb != null && (
                      <span className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-300">{d.countInDb}</span> parties enregistrées
                        {d.toLoad != null && d.toLoad > 0 && (
                          <span className="text-amber-400 ml-1">· {d.toLoad} à charger</span>
                        )}
                      </span>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={d.handleRefreshTotal}
                        disabled={d.refreshTotalLoading}
                        className="px-3 py-1.5 rounded-lg bg-dark-bg/60 border border-dark-border text-gray-400 text-xs font-medium disabled:opacity-50 hover:text-white transition-colors"
                      >
                        {d.refreshTotalLoading ? 'Calcul…' : 'Actualiser total'}
                      </button>
                      <button
                        type="button"
                        onClick={d.handleLoadAllFromRiot}
                        disabled={d.loadAllFromRiotLoading || (d.rateLimitSeconds != null && d.rateLimitSeconds > 0)}
                        className="px-3 py-1.5 rounded-lg bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-medium disabled:opacity-50 hover:bg-accent-blue/20 transition-colors"
                      >
                        {d.loadAllFromRiotLoading ? 'Chargement…' : d.rateLimitSeconds != null && d.rateLimitSeconds > 0 ? `Attendre ${d.rateLimitSeconds}s` : 'Sync Riot'}
                      </button>
                    </div>
                  </div>
                )}
                <SoloqStatistiquesSection d={d} player={player} />
              </div>
            )}

            {d.selectedSoloqSub === 'champions' && (
              <div className="space-y-6">
                {d.soloqTopChampionsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : d.soloqTopChampionsFromDb.length > 0 ? (
                  <>
                    <div>
                      <p className="text-center text-white font-display font-semibold text-base mb-4">Top 5 des champions les plus joués</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {d.soloqTopChampionsFromDb.map((champ: any, idx: number) => {
                          const name = champ.name
                          if (!name) return null
                          return (
                            <button
                              type="button"
                              key={`${name}-${idx}`}
                              onClick={() => d.openChampionModal(champ)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-dark-bg/60 border border-dark-border hover:border-accent-blue/50 transition-colors text-left w-full max-w-[280px]"
                            >
                              <img src={getChampionImage(name)} alt={name} className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-white truncate">{getChampionDisplayName(name) || name}</p>
                                <p className="text-sm text-gray-400">
                                  {champ.games} partie{champ.games > 1 ? 's' : ''} ·{' '}
                                  <span className={champ.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{champ.winrate}%</span>
                                </p>
                              </div>
                              <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {d.allChampionsFromDb.length > 5 && (
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-3">Tous les champions</p>
                        <div className="rounded-xl border border-dark-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-dark-bg/80 text-gray-400 text-left">
                                <th className="px-4 py-3 font-medium">Champion</th>
                                <th className="px-4 py-3 font-medium text-center">Parties</th>
                                <th className="px-4 py-3 font-medium text-center">Winrate</th>
                                <th className="px-4 py-3 font-medium text-center">KDA</th>
                                <th className="px-4 py-3 text-center">Moy.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.allChampionsFromDb.map((champ: any, idx: number) => {
                                const wr = champ.winrate ?? 0
                                return (
                                  <tr key={`${champ.name}-${idx}`} className="border-t border-dark-border/50 cursor-pointer hover:bg-dark-bg/40" onClick={() => d.openChampionModal(champ)}>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <img src={getChampionImage(champ.name)} alt={champ.name} className="w-8 h-8 rounded object-cover border border-dark-border shrink-0" />
                                        <span className="font-medium text-white">{getChampionDisplayName(champ.name) || champ.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 text-center text-gray-300">{champ.games}</td>
                                    <td className="px-2 py-3 text-center">
                                      <span className={wr >= 50 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{wr}%</span>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                      <span className={champ.kdaRatio >= 3 ? 'text-emerald-400' : champ.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}>{champ.kdaRatio}</span>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                      <span className="font-mono text-gray-300">{champ.avgK}/{champ.avgD}/{champ.avgA}</span>
                                    </td>
                                    <td className="px-2 py-3"><ChevronDown className="w-4 h-4 text-gray-500" /></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm py-4">Aucune partie enregistrée. Chargez les parties dans Import.</p>
                )}
              </div>
            )}

            {d.selectedSoloqSub === 'historiques' && (
              <div>
                {(d.totalFromRiot != null || d.countInDb != null) && (
                  <p className="text-gray-400 text-sm mb-3">
                    {d.totalFromRiot != null && <span><span className="font-semibold text-white">{d.totalFromRiot}</span> parties au total</span>}
                    {d.totalFromRiot != null && d.countInDb != null && ' · '}
                    {d.countInDb != null && <span><span className="font-semibold text-white">{d.countInDb}</span> en base</span>}
                  </p>
                )}
                {d.matchHistoryLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : d.matchHistory.length > 0 ? (
                  <div className="space-y-2">
                    {d.matchHistory
                      .filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
                      .map((m, i) => {
                        const isRemake = (m.gameDuration ?? 0) < REMAKE_THRESHOLD_SEC
                        return (
                          <Link
                            key={m.matchId || i}
                            to={m.matchId ? `/team/joueurs/${playerId}/soloq/${m.matchId}` : '#'}
                            className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-bg/70 transition-colors text-left"
                          >
                            <img src={getChampionImage(m.championName)} alt={m.championName} className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{getChampionDisplayName(m.championName) || m.championName}</p>
                              <p className="text-xs text-gray-500">
                                {m.gameCreation ? new Date(m.gameCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                              </p>
                            </div>
                            <div className="text-center shrink-0">
                              <p className="text-sm font-mono text-white">{m.kills}/{m.deaths}/{m.assists}</p>
                              <p className="text-xs text-gray-500">K/D/A</p>
                            </div>
                            {isRemake ? (
                              <span className="px-3 py-1 rounded-lg text-sm font-semibold shrink-0 bg-gray-500/20 text-gray-400 border border-gray-500/40">Remake</span>
                            ) : (
                              <span className={`px-3 py-1 rounded-lg text-sm font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                                {m.win ? 'Victoire' : 'Défaite'}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune partie enregistrée. Chargez les parties dans Import.</p>
                )}
                {d.matchHistory.length > 0 && d.matchHistoryHasMore && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => d.loadMatchHistoryFromSupabase(d.matchHistory.length, PAGE_SIZE, true)}
                      disabled={d.matchHistoryLoadMoreLoading}
                      className="px-4 py-2.5 rounded-xl bg-dark-border/80 hover:bg-dark-border text-white text-sm font-medium disabled:opacity-50"
                    >
                      {d.matchHistoryLoadMoreLoading ? 'Chargement…' : 'Charger plus (20 parties)'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Build ── */}
            {d.selectedSoloqSub === 'build' && (
              <SoloqBuildSection lpGraphMatches={d.lpGraphMatches} loading={d.lpGraphLoading} />
            )}

            {/* ── Runes ── */}
            {d.selectedSoloqSub === 'runes' && (
              <SoloqRunesSection lpGraphMatches={d.lpGraphMatches} loading={d.lpGraphLoading} runesCache={d.allRunesCache} />
            )}
          </>
        )}

        {/* ── Team ── */}
        {d.selectedCard === 'team' && (
          <>
            {d.selectedTeamSub === 'statistiques' && (
              <div className="space-y-6">
                <div className="flex gap-2 border-b border-dark-border pb-4">
                  {([{ id: 'general', label: 'Général', icon: BarChart3 }, { id: 'timeline', label: 'Timeline', icon: TrendingUp }] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => d.setTeamStatsSubSub(id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        d.teamStatsSubSub === id
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {d.teamStatsSubSub === 'general' && (
                  <PlayerTeamStatsSection playerId={playerId} mode="stats" matchesWithJson={d.allTeamMatches} />
                )}
                {d.teamStatsSubSub === 'timeline' && (
                  <PlayerTimelineAdvantageSection
                    playerId={playerId!}
                    matches={d.allTeamMatches}
                    timelines={d.allTeamTimelines}
                  />
                )}
              </div>
            )}

            {d.selectedTeamSub === 'champions' && (
              <div>
                {d.teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : d.championStatsFromTeam.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune donnée. Ajoutez des parties depuis Matchs.</p>
                ) : (
                  <div className="space-y-2">
                    {d.championStatsFromTeam.map((c) => {
                      const isOpen = d.expandedTeamChampion === c.name
                      return (
                        <div key={c.name} className="rounded-xl border border-dark-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => d.setExpandedTeamChampion(isOpen ? null : c.name)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center gap-3 p-4 bg-dark-bg/50 hover:bg-dark-bg/80 transition-colors text-left"
                          >
                            <img src={getChampionImage(c.name)} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white">{getChampionDisplayName(c.name) || c.name}</p>
                              <p className="text-sm text-gray-400">
                                {c.games} partie{c.games > 1 ? 's' : ''} ·{' '}
                                <span className={c.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{c.winrate}%</span>
                                {' · '}KDA{' '}
                                <span className={c.kdaRatio >= 3 ? 'text-emerald-400' : c.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}>{c.kdaRatio}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0 text-sm text-gray-400 hidden sm:block">
                              <p className="font-mono">{c.avgK}/{c.avgD}/{c.avgA}</p>
                              <p className="text-xs text-gray-500">Moy. K/D/A</p>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="border-t border-dark-border">
                              <div className="grid grid-cols-3 gap-px bg-dark-border">
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">Winrate</p>
                                  <p className={`font-semibold ${c.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{c.winrate}%</p>
                                </div>
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">KDA ratio</p>
                                  <p className={`font-semibold ${c.kdaRatio >= 3 ? 'text-emerald-400' : c.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}`}>{c.kdaRatio}</p>
                                </div>
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">Moy. K/D/A</p>
                                  <p className="font-mono text-white text-sm">{c.avgK}/{c.avgD}/{c.avgA}</p>
                                </div>
                              </div>
                              <div className="divide-y divide-dark-border/50">
                                {c.matchEntries.map((s: any, i: number) => {
                                  const m = s.team_matches
                                  return (
                                    <Link
                                      key={s.id || i}
                                      to={`/team/matchs/${s.match_id}`}
                                      state={{ fromPlayer: playerId }}
                                      className="flex items-center gap-3 px-4 py-3 hover:bg-dark-bg/60 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300">
                                          {m?.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {m?.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}
                                        </p>
                                      </div>
                                      <p className="font-mono text-sm text-white shrink-0">{s.kills}/{s.deaths}/{s.assists}</p>
                                      <span className={`px-2 py-1 rounded text-xs font-semibold shrink-0 ${m?.our_win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {m?.our_win ? 'V' : 'D'}
                                      </span>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {d.selectedTeamSub === 'historiques' && (
              <div>
                {d.teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement...</p>
                ) : d.filteredTeamStats.length > 0 ? (
                  <div className="space-y-3">
                    {d.filteredTeamStats.map((s: any, i: number) => {
                      const m = s.team_matches
                      return (
                        <Link
                          key={s.id || i}
                          to={`/team/matchs/${s.match_id}`}
                          state={{ fromPlayer: playerId }}
                          className="block flex flex-wrap items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors"
                        >
                          <img src={getChampionImage(s.champion_name)} alt={s.champion_name} className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{getChampionDisplayName(s.champion_name) || s.champion_name}</p>
                            <p className="text-sm text-gray-500">{m?.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}</p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="text-center"><p className="text-gray-500 text-xs">K/D/A</p><p className="font-mono text-white">{s.kills}/{s.deaths}/{s.assists}</p></div>
                            <div className="text-center"><p className="text-gray-500 text-xs">KDA</p><p className="text-white">{s.kda ?? '—'}</p></div>
                            <div className="text-center hidden sm:block"><p className="text-gray-500 text-xs">DMG</p><p className="text-white">{s.total_damage_dealt_to_champions?.toLocaleString() ?? '—'}</p></div>
                            <div className="text-center hidden sm:block"><p className="text-gray-500 text-xs">Gold</p><p className="text-amber-400">{s.gold_earned?.toLocaleString() ?? '—'}</p></div>
                            <div className="text-center"><p className="text-gray-500 text-xs">Vision</p><p className="text-violet-400">{s.vision_score ?? '—'}</p></div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${m?.our_win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                            {m?.our_win ? 'Victoire' : 'Défaite'}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-8 text-center">
                    <p className="text-gray-500 text-sm">Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.</p>
                  </div>
                )}
              </div>
            )}

            {d.selectedTeamSub === 'allstats' && (
              <AllStatsSection
                selectedMatchId={d.selectedAllStatsMatchId}
                setSelectedMatchId={d.setSelectedAllStatsMatchId}
                allTeamMatches={d.allTeamMatches}
                allRunesCache={d.allRunesCache}
                playerId={playerId}
              />
            )}
          </>
        )}

        {/* ── Pool Champ ── */}
        {d.selectedCard === 'pool-champ' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Pool et tier list pour <span className="text-white font-medium">{roleLabel}</span>. Classez vos champions par niveau de priorité (S, A, B, C).
            </p>
            <TierTable tiers={tiersForTable} activeTier={null} />
            {TIER_KEYS.every((k) => !(tiersForTable[k] || []).length) && (
              <p className="text-gray-500 text-sm mt-4">Aucun champion dans le pool. Rendez-vous dans Pool de Champions pour en ajouter.</p>
            )}
          </div>
        )}

        {/* ── Coach ── */}
        {d.selectedCard === 'coach' && (
          <CoachCard playerId={playerId!} />
        )}

        {/* Modal Champion (matchups solo Q) */}
        {d.championModalChampion && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70" onClick={d.closeChampionModal}>
            <div className="bg-dark-card border border-dark-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <img src={getChampionImage(d.championModalChampion)} alt={d.championModalChampion} className="w-10 h-10 rounded-lg object-cover border border-dark-border" />
                  <h3 className="text-lg font-semibold text-white">{getChampionDisplayName(d.championModalChampion) || d.championModalChampion} — Parties</h3>
                </div>
                <button type="button" onClick={d.closeChampionModal} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {d.championModalMatchesLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : d.championModalMatches.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Aucune partie.</p>
                ) : (
                  <div className="space-y-2">
                    {d.championModalMatches.map((m: any, i: number) => (
                      <div key={m.matchId || i} className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">
                            {m.gameCreation ? new Date(m.gameCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                          </p>
                          {m.opponentChampionName && (
                            <p className="text-xs text-gray-400 mt-0.5">vs {getChampionDisplayName(m.opponentChampionName) || m.opponentChampionName}</p>
                          )}
                        </div>
                        <p className="text-sm font-mono text-white shrink-0">{m.kills}/{m.deaths}/{m.assists}</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {m.win ? 'V' : 'D'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  )
}

// ─── AllStats section (extraite du render principal pour lisibilité) ────────────
function AllStatsSection({
  selectedMatchId,
  setSelectedMatchId,
  allTeamMatches,
  allRunesCache,
  playerId,
}: {
  selectedMatchId: string | null
  setSelectedMatchId: (id: string | null) => void
  allTeamMatches: any[]
  allRunesCache: Array<{ id: number; name: string; icon: string }>
  playerId: string | undefined
}) {
  if (selectedMatchId) {
    const m = (allTeamMatches || []).find((x: any) => x.id === selectedMatchId)
    const json = m?.match_json

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedMatchId(null)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          Retour à la liste des matchs
        </button>
        <p className="text-gray-500 text-xs mt-1">
          Runes = keystone + 3 de la branche principale + 2 secondaires. Si tout affiche « — », ré-importez le match avec le <strong>JSON Riot complet</strong>.
        </p>
        {!m ? (
          <p className="text-gray-500 text-sm">Match introuvable.</p>
        ) : !json || (!json.participants?.length && !json.info?.participants?.length) ? (
          <div className="rounded-xl border border-dark-border bg-dark-card/50 p-6 text-center">
            <p className="text-gray-500 text-sm">Données complètes non disponibles pour ce match (import ancien).</p>
            <p className="text-gray-500 text-xs mt-1">Ré-importez le match depuis Import pour enregistrer toutes les stats.</p>
          </div>
        ) : (
          <AllStatsTable json={json} allRunesCache={allRunesCache} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-sm">Choisissez un match pour afficher les 10 joueurs et toutes les statistiques.</p>
      {!allTeamMatches?.length ? (
        <div className="rounded-xl border border-dark-border bg-dark-card/50 p-6 text-center">
          <p className="text-gray-500 text-sm">Aucun match. Importez des parties depuis Matchs / Import.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(allTeamMatches || []).map((m: any) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMatchId(m.id)}
              className="w-full text-left flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">#{m.game_id}</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${m.our_win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {m.our_win ? 'Victoire' : 'Défaite'}
                </span>
                <span className="text-gray-500 text-sm">{m.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}</span>
              </div>
              {m.game_creation && (
                <span className="text-xs text-gray-500">
                  {new Date(m.game_creation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AllStatsTable({
  json,
  allRunesCache,
}: {
  json: any
  allRunesCache: Array<{ id: number; name: string; icon: string }>
}) {
  const participants = json.info?.participants ?? json.participants ?? []
  const identities = json.participantIdentities ?? json.info?.participantIdentities ?? []

  const getPseudo = (participantId: number) => {
    const id = identities.find((i: any) => (i.participantId ?? i.participant_id) === participantId)
    const p = id?.player ?? id?.riotId
    if (!p) return `Joueur ${participantId}`
    const name = p.gameName ?? p.game_name ?? p.summonerName ?? ''
    const tag = p.tagLine ?? p.tag_line ?? ''
    return tag ? `${name}#${tag}` : name || `Joueur ${participantId}`
  }

  const sorted = [...participants].sort((a: any, b: any) => {
    const tA = a.teamId ?? a.team_id ?? 0
    const tB = b.teamId ?? b.team_id ?? 0
    if (tA !== tB) return tA - tB
    return (a.participantId ?? a.participant_id ?? 0) - (b.participantId ?? b.participant_id ?? 0)
  })

  const ignoredExact = new Set([
    'causedEarlySurrender', 'combatPlayerScore', 'earlySurrenderAccomplice',
    'gameEndedInSurrender', 'gameEndedInEarlySurrender', 'neutralMinionsKilledEnemyJungle',
    'neutralMinionsKilledTeamJungle', 'objectivePlayerScore', 'playerSubteamId',
    'sightWardsBoughtInGame', 'subteamPlacement', 'teamEarlySurrendered',
    'totalPlayerScore', 'totalScoreRank', 'unrealKills',
  ].map((k) => k.toLowerCase()))

  const allKeys = new Set<string>()
  sorted.forEach((p: any) => {
    const s = p.stats ?? p
    if (s && typeof s === 'object') Object.keys(s).forEach((k) => allKeys.add(k))
  })
  const statKeys = Array.from(allKeys)
    .filter((k) => {
      const kl = k.toLowerCase()
      if (ignoredExact.has(kl)) return false
      if (kl.startsWith('playeraugment') || kl.startsWith('playerscore')) return false
      return true
    })
    .sort()

  const getStat = (p: any, key: string) => {
    const s = p.stats ?? p
    if (!s || typeof s !== 'object') return '—'
    const k = Object.keys(s).find((x) => x.toLowerCase() === key.toLowerCase())
    const v = k ? s[k] : s[key]
    if (v === undefined || v === null) return '—'
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
    return String(v)
  }

  const getRuneIds = (p: any): number[] => {
    const ids: number[] = []
    const add = (v: any) => { if (v != null && v !== '' && !Number.isNaN(Number(v))) ids.push(Number(v)) }
    const perks = p.perks ?? p.perk
    if (perks?.styles?.length) {
      perks.styles.forEach((style: any) => {
        const list = style.selections ?? style.picks ?? []
        list.forEach((sel: any) => add(sel.perk ?? sel.perkId ?? sel.runeId))
      })
      if (ids.length > 0) return ids
    }
    for (let i = 0; i <= 7; i++) {
      add(p[`perk${i}`] ?? p[`perk_${i}`] ?? p.stats?.[`perk${i}`])
    }
    return ids
  }

  const DD_IMG = 'https://ddragon.leagueoflegends.com/cdn/img'

  return (
    <div className="overflow-x-auto rounded-xl border border-dark-border bg-dark-bg/50">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="p-3 text-gray-400 font-medium text-sm sticky left-0 bg-dark-bg/90 z-10 min-w-[120px]">Stat</th>
            {sorted.map((p: any, i: number) => {
              const pid = p.participantId ?? p.participant_id ?? i + 1
              return (
                <th key={pid} className="p-3 text-gray-300 font-medium text-sm whitespace-nowrap max-w-[140px] truncate" title={getPseudo(pid)}>
                  {getPseudo(pid)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-dark-border/50 hover:bg-dark-card/30">
            <td className="p-3 text-gray-400 text-sm font-medium sticky left-0 bg-dark-bg/80 z-10">Runes</td>
            {sorted.map((p: any, i: number) => {
              const ids = getRuneIds(p)
              return (
                <td key={i} className="p-2 text-white text-sm align-top">
                  <div className="flex flex-wrap gap-0.5 items-center">
                    {ids.map((id) => {
                      const r = allRunesCache.find((x) => x.id === id)
                      if (!r) return <span key={id} className="text-gray-500 text-xs" title={String(id)}>{id}</span>
                      return <img key={id} src={`${DD_IMG}/${r.icon}`} alt={r.name} title={r.name} className="w-6 h-6 rounded object-contain" />
                    })}
                    {ids.length === 0 && <span className="text-gray-500 text-xs">—</span>}
                  </div>
                </td>
              )
            })}
          </tr>
          {statKeys.map((key) => (
            <tr key={key} className="border-b border-dark-border/50 hover:bg-dark-card/30">
              <td className="p-3 text-gray-400 text-sm font-medium sticky left-0 bg-dark-bg/80 z-10">{key}</td>
              {sorted.map((p: any, i: number) => (
                <td key={i} className="p-3 text-white text-sm">{getStat(p, key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── SoloqBuildSection ───────────────────────────────────────────────────────

const DD_ITEM = (id: number) => `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${id}.png`

function SoloqBuildSection({ lpGraphMatches, loading }: { lpGraphMatches: any[]; loading: boolean }) {
  const realGames = lpGraphMatches.filter((m) => (m.game_duration ?? 0) >= 180)

  const champBuilds = new Map<string, { games: number; wins: number; buildCounts: Map<string, number> }>()
  for (const m of realGames) {
    const champ = m.champion_name
    if (!champ) continue
    const items = ((m.items as number[] | null) || []).filter((id) => id > 0).slice(0, 6)
    const entry = champBuilds.get(champ) ?? { games: 0, wins: 0, buildCounts: new Map() }
    entry.games++
    if (m.win) entry.wins++
    if (items.length > 0) {
      const sig = items.join(',')
      entry.buildCounts.set(sig, (entry.buildCounts.get(sig) ?? 0) + 1)
    }
    champBuilds.set(champ, entry)
  }

  const topBuilds = Array.from(champBuilds.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8)
    .map(([name, v]) => {
      const mostFreq = [...v.buildCounts.entries()].sort((a, b) => b[1] - a[1])[0]
      const items = mostFreq ? mostFreq[0].split(',').map(Number) : []
      const wr = Math.round((v.wins / v.games) * 100)
      return { name, games: v.games, wr, items }
    })

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Chargement…</p>
  if (topBuilds.length === 0)
    return <p className="text-gray-500 text-sm py-6 text-center">Aucune donnée de build disponible. Importez des parties avec le backend Riot.</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Build le plus fréquent par champion</p>
      {topBuilds.map((c) => (
        <div key={c.name} className="flex items-center gap-3 bg-dark-bg/40 rounded-xl border border-dark-border/60 px-4 py-2.5">
          <img
            src={getChampionImage(c.name)}
            alt={c.name}
            className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="w-28 shrink-0">
            <p className="text-sm font-medium text-white truncate">{c.name}</p>
            <p className="text-xs text-gray-500">{c.games}G · <span className={c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{c.wr}%</span></p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {c.items.length > 0 ? c.items.map((id, i) => (
              <img
                key={i}
                src={DD_ITEM(id)}
                alt={String(id)}
                title={String(id)}
                className="w-8 h-8 rounded-lg border border-dark-border object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )) : (
              <span className="text-xs text-gray-600 italic">Build non disponible</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── SoloqRunesSection ───────────────────────────────────────────────────────

function SoloqRunesSection({
  lpGraphMatches,
  loading,
  runesCache,
}: {
  lpGraphMatches: any[]
  loading: boolean
  runesCache: Array<{ id: number; name: string; icon: string }>
}) {
  const DD_RUNE = (icon: string) => `https://ddragon.leagueoflegends.com/cdn/img/${icon}`
  const realGames = lpGraphMatches.filter((m) => (m.game_duration ?? 0) >= 180 && m.runes?.styles?.length)

  const champRunes = new Map<string, { games: number; wins: number; ks: Map<number, number>; secondary: Map<number, number> }>()
  for (const m of realGames) {
    const champ = m.champion_name
    if (!champ) continue
    const perks = m.runes
    const primary = perks.styles?.find((s: any) => s.description === 'primaryStyle')
    const sub = perks.styles?.find((s: any) => s.description === 'subStyle')
    const keystoneId: number | undefined = primary?.selections?.[0]?.perk
    const secondaryId: number | undefined = sub?.style
    if (!keystoneId) continue
    const entry = champRunes.get(champ) ?? { games: 0, wins: 0, ks: new Map(), secondary: new Map() }
    entry.games++
    if (m.win) entry.wins++
    entry.ks.set(keystoneId, (entry.ks.get(keystoneId) ?? 0) + 1)
    if (secondaryId) entry.secondary.set(secondaryId, (entry.secondary.get(secondaryId) ?? 0) + 1)
    champRunes.set(champ, entry)
  }

  const topChamps = Array.from(champRunes.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 8)
    .map(([name, v]) => {
      const topKs = [...v.ks.entries()].sort((a, b) => b[1] - a[1])[0]
      const topSec = [...v.secondary.entries()].sort((a, b) => b[1] - a[1])[0]
      const keystoneId = topKs?.[0]
      const secondaryId = topSec?.[0]
      const keystoneData = keystoneId != null ? runesCache.find((r) => r.id === keystoneId) : undefined
      const wr = Math.round((v.wins / v.games) * 100)
      return { name, games: v.games, wr, keystoneId, keystoneData, secondaryId }
    })

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Chargement…</p>
  if (topChamps.length === 0)
    return <p className="text-gray-500 text-sm py-6 text-center">Aucune donnée de runes disponible. Importez des parties avec le backend Riot.</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Runes les plus fréquentes par champion</p>
      {topChamps.map((c) => (
        <div key={c.name} className="flex items-center gap-3 bg-dark-bg/40 rounded-xl border border-dark-border/60 px-4 py-2.5">
          <img
            src={getChampionImage(c.name)}
            alt={c.name}
            className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="w-28 shrink-0">
            <p className="text-sm font-medium text-white truncate">{c.name}</p>
            <p className="text-xs text-gray-500">{c.games}G · <span className={c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{c.wr}%</span></p>
          </div>
          <div className="flex items-center gap-3">
            {c.keystoneData?.icon ? (
              <div className="flex items-center gap-1.5">
                <img
                  src={DD_RUNE(c.keystoneData.icon)}
                  alt={c.keystoneData.name}
                  title={c.keystoneData.name}
                  className="w-9 h-9 rounded-full border border-dark-border object-cover bg-dark-bg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-xs text-gray-300">{c.keystoneData.name}</span>
              </div>
            ) : c.keystoneId != null ? (
              <span className="text-xs text-gray-500">#{c.keystoneId}</span>
            ) : null}
            {c.secondaryId != null && (
              <span className="text-xs text-gray-500 bg-dark-card border border-dark-border px-2 py-0.5 rounded-lg">
                {RUNE_TREE_NAMES[c.secondaryId] ?? `#${c.secondaryId}`}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── GeneralTab ──────────────────────────────────────────────────────────────

function GeneralTab({ d, player }: { d: any; player: any }) {
  const realGames = (d.lpGraphMatches as any[]).filter(
    (m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC
  )
  const wins = realGames.filter((m: any) => m.win).length
  const wr = realGames.length > 0 ? Math.round((wins / realGames.length) * 100) : null

  const sorted = [...realGames].sort((a: any, b: any) => (a.game_creation ?? 0) - (b.game_creation ?? 0))

  // WR début vs fin (2 moitiés)
  const half = Math.max(1, Math.floor(sorted.length / 2))
  const firstHalf = sorted.slice(0, half)
  const lastHalf = sorted.slice(-half)
  const wrFirst = firstHalf.length > 0 ? Math.round((firstHalf.filter((m: any) => m.win).length / firstHalf.length) * 100) : null
  const wrLast = lastHalf.length > 0 ? Math.round((lastHalf.filter((m: any) => m.win).length / lastHalf.length) * 100) : null

  // Stats moyennes (uniquement si les champs sont peuplés, i.e. importés avec les nouvelles données)
  const withDmg = realGames.filter((m: any) => m.total_damage != null)
  const withCs = realGames.filter((m: any) => m.cs != null && m.game_duration > 0)
  const withVision = realGames.filter((m: any) => m.vision_score != null)

  const avgDmg = withDmg.length > 0
    ? Math.round(withDmg.reduce((s: number, m: any) => s + m.total_damage, 0) / withDmg.length)
    : null
  const avgCsPMin = withCs.length > 0
    ? (withCs.reduce((s: number, m: any) => s + m.cs / (m.game_duration / 60), 0) / withCs.length).toFixed(1)
    : null
  const avgVision = withVision.length > 0
    ? Math.round(withVision.reduce((s: number, m: any) => s + m.vision_score, 0) / withVision.length)
    : null

  const totalK = realGames.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
  const totalD = realGames.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
  const totalA = realGames.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
  const avgKda = realGames.length > 0
    ? (totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : (totalK + totalA).toFixed(2))
    : null

  // Peak LP & delta
  const peakLp = d.lpCurvePoints.length > 0
    ? Math.max(...d.lpCurvePoints.map((p: any) => p.lp))
    : null
  const lpDelta = d.lpCurvePoints.length >= 2
    ? d.lpCurvePoints[d.lpCurvePoints.length - 1].lp - d.lpCurvePoints[0].lp
    : null

  const lpDateRange = d.lpCurvePoints.length >= 2
    ? `${d.lpCurvePoints[0].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} → ${d.lpCurvePoints[d.lpCurvePoints.length - 1].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
    : 'Saison en cours'

  // ─── 4 mini-cards ───────────────────────────────────────────
  // SoloQ last 5
  const mood = player?.soloq_mood_last_5
  const sq5Wins = mood?.wins ?? 0
  const sq5Losses = mood?.losses ?? 0
  const sq5Total = sq5Wins + sq5Losses

  // Team last 5
  const last5Team = (d.filteredTeamStats || []).slice(0, 5)
  const t5Wins = last5Team.filter((s: any) => s.win || s.team_matches?.our_win).length
  const t5Losses = last5Team.length - t5Wins

  // Pool Champ — top S/A tier icons
  const poolFlat: any[] = player?.champion_pools
    ? (Object.entries(player.champion_pools as Record<string, any[]>)
        .filter(([tier]) => ['S', 'A', 'B'].includes(tier))
        .flatMap(([, champs]) => champs))
    : []
  const poolCount = player?.champion_pools
    ? Object.values(player.champion_pools as Record<string, any[]>).flat().length
    : null
  const poolPreview = poolFlat.slice(0, 5)

  // Last 5 SoloQ — champion icons from recent matches
  const last5SoloQ = sorted.slice(-5).reverse()

  // Win streak color bars
  const last10 = sorted.slice(-10)

  // Top 5 champions from match history
  const champMap = new Map<string, { games: number; wins: number }>()
  for (const m of realGames) {
    const name = m.champion_name || m.champion
    if (!name) continue
    const c = champMap.get(name) ?? { games: 0, wins: 0 }
    c.games++
    if (m.win) c.wins++
    champMap.set(name, c)
  }
  const topChampsData = Array.from(champMap.entries())
    .map(([name, c]) => ({ name, ...c, wr: Math.round((c.wins / c.games) * 100) }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)

  return (
    <div className="space-y-5">
      {/* ── Bloc SoloQ ── */}
      <div className="rounded-2xl border border-dark-border bg-dark-bg/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border/60">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-accent-blue" />
            <span className="font-semibold text-white text-sm">Solo Q · Saison en cours</span>
          </div>
          {player.rank && (
            <span className="text-xs font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2.5 py-1 rounded-full">
              {player.rank}
            </span>
          )}
        </div>

        {d.lpGraphLoading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Chargement…</div>
        ) : realGames.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Aucune partie Solo Q enregistrée.</div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Stats key row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Parties</p>
                <p className="text-xl font-bold text-white">{realGames.length}</p>
              </div>
              <div className={`bg-dark-card border rounded-xl p-3 text-center ${wr != null && wr >= 50 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Winrate</p>
                <p className={`text-xl font-bold ${wr != null && wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr ?? '—'}%</p>
                {wr != null && <p className="text-[10px] text-gray-500 mt-0.5">{wins}V · {realGames.length - wins}D</p>}
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">KDA moy.</p>
                <p className="text-xl font-bold text-white">{avgKda ?? '—'}</p>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Dernières 5</p>
                {sq5Total > 0 ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-emerald-400 font-bold text-base">{sq5Wins}W</span>
                    <span className="text-gray-600 text-sm">–</span>
                    <span className="text-rose-400 font-bold text-base">{sq5Losses}L</span>
                  </div>
                ) : <p className="text-xl font-bold text-gray-600">—</p>}
              </div>
            </div>

            {/* Extra stats (si data) */}
            {(avgDmg != null || avgCsPMin != null || avgVision != null || peakLp != null) && (
              <div className="flex flex-wrap gap-2">
                {peakLp != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Peak</span>
                    <span className="text-xs font-semibold text-white">{peakLp} LP</span>
                  </div>
                )}
                {lpDelta != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Δ LP</span>
                    <span className={`text-xs font-semibold ${lpDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{lpDelta >= 0 ? '+' : ''}{lpDelta}</span>
                  </div>
                )}
                {avgCsPMin != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">CS/min</span>
                    <span className="text-xs font-semibold text-white">{avgCsPMin}</span>
                  </div>
                )}
                {avgDmg != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">DMG/game</span>
                    <span className="text-xs font-semibold text-white">{avgDmg.toLocaleString('fr-FR')}</span>
                  </div>
                )}
                {avgVision != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Vision</span>
                    <span className="text-xs font-semibold text-white">{avgVision}</span>
                  </div>
                )}
              </div>
            )}

            {/* WR trend (1ère vs 2ème moitié) */}
            {wrFirst != null && wrLast != null && sorted.length >= 4 && (
              <div className="flex items-center gap-3 bg-dark-card/40 border border-dark-border rounded-xl px-3 py-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">Progression</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-sm font-bold ${wrFirst >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wrFirst}%</span>
                  <span className="text-gray-600 text-xs">→</span>
                  <span className={`text-sm font-bold ${wrLast >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wrLast}%</span>
                  {wrLast > wrFirst
                    ? <span className="text-xs text-emerald-400 ml-1">↑ +{wrLast - wrFirst}%</span>
                    : wrLast < wrFirst
                      ? <span className="text-xs text-rose-400 ml-1">↓ {wrLast - wrFirst}%</span>
                      : null}
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">1ère vs 2ème moitié</span>
              </div>
            )}

            {/* LP Chart compact */}
            {d.lpCurvePoints.length >= 2 && (
              <div className="rounded-xl bg-dark-card/50 border border-dark-border p-3" style={{ height: '130px' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Courbe LP</span>
                  <span className="text-[10px] text-gray-600">{lpDateRange}</span>
                </div>
                <div style={{ height: '100px' }}>
                  <LpCurveChart points={d.lpCurvePoints} />
                </div>
              </div>
            )}

            {/* Top champions SoloQ */}
            {topChampsData.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Champions joués (SoloQ)</p>
                {topChampsData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <img
                      src={getChampionImage(c.name)}
                      alt={c.name}
                      className="w-6 h-6 rounded object-cover border border-dark-border shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-xs text-gray-300 w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.wr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${c.wr}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold w-10 text-right ${c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{c.wr}%</span>
                    <span className="text-xs text-gray-600 w-8 text-right">{c.games}G</span>
                  </div>
                ))}
              </div>
            )}

            {/* Last 10 games streak */}
            {last10.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">10 der.</span>
                <div className="flex gap-1">
                  {last10.map((m: any, i: number) => (
                    <div
                      key={i}
                      title={m.win ? 'Victoire' : 'Défaite'}
                      className={`w-6 h-2 rounded-full ${m.win ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bloc Team + Pool + Coach + Dernières games ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Team dernières 5 */}
        <div className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Team · 5 der.</span>
          </div>
          {last5Team.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">{t5Wins}V</span>
                <span className="text-gray-600">–</span>
                <span className="text-2xl font-bold text-rose-400">{t5Losses}D</span>
              </div>
              <div className="flex gap-1 mt-1">
                {last5Team.map((s: any, i: number) => {
                  const win = s.win || s.team_matches?.our_win
                  return <div key={i} className={`flex-1 h-1.5 rounded-full ${win ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucune partie équipe</p>
          )}
        </div>

        {/* Pool Champ */}
        <button
          type="button"
          onClick={() => d.setSelectedCard('pool-champ')}
          className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4 text-left hover:border-amber-400/40 hover:bg-amber-400/5 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Pool Champ</span>
            </div>
            {poolCount != null && poolCount > 0 && (
              <span className="text-xs text-gray-500">{poolCount} champs →</span>
            )}
          </div>
          {poolPreview.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {poolPreview.map((cp: any, i: number) => {
                const name = cp.champion_id || cp.name || cp
                return (
                  <img
                    key={i}
                    src={getChampionImage(name)}
                    alt={name}
                    title={name}
                    className="w-9 h-9 rounded-lg object-cover border border-dark-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )
              })}
              {poolFlat.length > 5 && (
                <div className="w-9 h-9 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-xs text-gray-500">
                  +{poolFlat.length - 5}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun champion</p>
          )}
        </button>

        {/* Coach */}
        <button
          type="button"
          onClick={() => d.setSelectedCard('coach')}
          className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4 text-left hover:border-accent-blue/40 hover:bg-accent-blue/5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-accent-blue group-hover:bg-accent-blue transition-colors" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Coach</span>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-accent-blue transition-colors">
            Voir les notes du coach →
          </p>
        </button>
      </div>

      {/* ── Dernières 5 games SoloQ ── */}
      {last5SoloQ.length > 0 && (
        <div className="rounded-2xl border border-dark-border bg-dark-bg/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-dark-border/60">
            <div className="w-1.5 h-4 rounded-full bg-accent-blue" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Dernières games SoloQ</span>
          </div>
          <div className="divide-y divide-dark-border/40">
            {last5SoloQ.map((m: any, i: number) => {
              const champName = m.champion_name || m.champion || null
              const kills = m.kills ?? 0
              const deaths = m.deaths ?? 0
              const assists = m.assists ?? 0
              const kdaStr = deaths > 0
                ? ((kills + assists) / deaths).toFixed(1)
                : (kills + assists).toFixed(1)
              const duration = m.game_duration
                ? `${Math.floor(m.game_duration / 60)}m`
                : null
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${m.win ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                  <div className={`w-1 h-8 rounded-full shrink-0 ${m.win ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {champName ? (
                    <img
                      src={getChampionImage(champName)}
                      alt={champName}
                      className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-dark-card border border-dark-border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{champName || '—'}</p>
                    <p className="text-xs text-gray-500">
                      {kills}/{deaths}/{assists}
                      {duration && <span className="ml-2">{duration}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${m.win ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {m.win ? 'Victoire' : 'Défaite'}
                    </p>
                    <p className={`text-xs ${parseFloat(kdaStr) >= 3 ? 'text-emerald-400' : parseFloat(kdaStr) >= 2 ? 'text-gray-300' : 'text-rose-300'}`}>
                      {kdaStr} KDA
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SoloqStatistiquesSection ─────────────────────────────────────────────────

const ROLE_ORDER_STATS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
const ROLE_DISPLAY_STATS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
}

function parseTierFromRank(rank: string | null | undefined): string {
  if (!rank) return ''
  for (const t of ['Challenger', 'Grandmaster', 'Master', 'Diamond', 'Emerald', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron']) {
    if (rank.toLowerCase().includes(t.toLowerCase())) return t
  }
  return ''
}

function rankCardColors(rank: string | null | undefined): string {
  const t = parseTierFromRank(rank).toLowerCase()
  if (t === 'challenger') return 'border-yellow-400/40 bg-yellow-400/5 text-yellow-300'
  if (t === 'grandmaster') return 'border-red-400/40 bg-red-400/5 text-red-400'
  if (t === 'master') return 'border-purple-400/40 bg-purple-400/5 text-purple-300'
  if (t === 'diamond') return 'border-blue-400/40 bg-blue-400/5 text-blue-300'
  if (t === 'emerald') return 'border-emerald-400/40 bg-emerald-400/5 text-emerald-300'
  if (t === 'platinum') return 'border-cyan-400/40 bg-cyan-400/5 text-cyan-300'
  if (t === 'gold') return 'border-amber-400/40 bg-amber-400/5 text-amber-300'
  if (t === 'silver') return 'border-gray-400/40 bg-gray-400/5 text-gray-300'
  if (t === 'bronze') return 'border-orange-500/40 bg-orange-500/5 text-orange-400'
  if (t === 'iron') return 'border-gray-600/40 bg-gray-600/5 text-gray-400'
  return 'border-dark-border bg-dark-bg/50 text-gray-300'
}

function StatBox({
  label,
  value,
  sub,
  valueColor = 'text-white',
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SoloqStatistiquesSection({ d, player }: { d: any; player: any }) {
  const [roleFilter, setRoleFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')

  const lpGraphMatches: any[] = d.lpGraphMatches ?? []

  // Annotate with role + side from match_json
  const gamesWithMeta = lpGraphMatches.map((m: any) => {
    const json = m.match_json as any
    return {
      ...m,
      role: json?.teamPosition ?? null,
      side: json?.teamId === 100 ? 'blue' : json?.teamId === 200 ? 'red' : null,
    }
  })

  const hasRoleData = gamesWithMeta.some((g) => g.role != null)
  const hasSideData = gamesWithMeta.some((g) => g.side != null)
  const availableRoles = ROLE_ORDER_STATS.filter((r) => gamesWithMeta.some((g) => g.role === r))

  // Filtered games
  const filtered = gamesWithMeta.filter((g) => {
    if (roleFilter !== 'all' && g.role !== roleFilter) return false
    if (sideFilter !== 'all' && g.side !== sideFilter) return false
    return true
  })

  const total = filtered.length
  const wins = filtered.filter((g) => g.win).length
  const losses = total - wins
  const wr = total > 0 ? Math.round((wins / total) * 100) : null

  const totalK = filtered.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
  const totalD = filtered.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
  const totalA = filtered.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
  const avgKda = total > 0
    ? (totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : (totalK + totalA).toFixed(2))
    : null
  const avgK = total > 0 ? (totalK / total).toFixed(1) : null
  const avgD = total > 0 ? (totalD / total).toFixed(1) : null
  const avgA = total > 0 ? (totalA / total).toFixed(1) : null

  const withDmg = filtered.filter((m: any) => m.total_damage != null)
  const withCs = filtered.filter((m: any) => m.cs != null && m.game_duration > 0)
  const withVision = filtered.filter((m: any) => m.vision_score != null)
  const withGold = filtered.filter((m: any) => m.gold_earned != null)

  const avgDmg = withDmg.length > 0 ? Math.round(withDmg.reduce((s: number, m: any) => s + m.total_damage, 0) / withDmg.length) : null
  const avgCsPMin = withCs.length > 0
    ? (withCs.reduce((s: number, m: any) => s + m.cs / (m.game_duration / 60), 0) / withCs.length).toFixed(1)
    : null
  const avgVision = withVision.length > 0 ? Math.round(withVision.reduce((s: number, m: any) => s + m.vision_score, 0) / withVision.length) : null
  const avgGold = withGold.length > 0 ? Math.round(withGold.reduce((s: number, m: any) => s + m.gold_earned, 0) / withGold.length) : null

  // Side breakdown (always on full unfiltered)
  const blueGames = gamesWithMeta.filter((g) => g.side === 'blue')
  const redGames = gamesWithMeta.filter((g) => g.side === 'red')
  const blueWins = blueGames.filter((g) => g.win).length
  const redWins = redGames.filter((g) => g.win).length
  const blueWR = blueGames.length > 0 ? Math.round((blueWins / blueGames.length) * 100) : null
  const redWR = redGames.length > 0 ? Math.round((redWins / redGames.length) * 100) : null

  // Role breakdown (always on full unfiltered)
  const roleBreakdown = ROLE_ORDER_STATS
    .map((role) => {
      const games = gamesWithMeta.filter((g) => g.role === role)
      if (games.length === 0) return null
      const w = games.filter((g) => g.win).length
      const totalK2 = games.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
      const totalD2 = games.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
      const totalA2 = games.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
      const kda = totalD2 > 0 ? ((totalK2 + totalA2) / totalD2).toFixed(2) : (totalK2 + totalA2).toFixed(2)
      return { role, games: games.length, wins: w, wr: Math.round((w / games.length) * 100), kda }
    })
    .filter(Boolean) as Array<{ role: string; games: number; wins: number; wr: number; kda: string }>

  // Rank cards
  const peakLp = d.lpCurvePoints.length > 0
    ? Math.max(...d.lpCurvePoints.map((p: any) => p.lp))
    : null
  const lpDelta = d.lpCurvePoints.length >= 2
    ? d.lpCurvePoints[d.lpCurvePoints.length - 1].lp - d.lpCurvePoints[0].lp
    : null
  const tierColors = rankCardColors(player.rank)

  return (
    <div className="space-y-6">
      {/* ── 3 Rank Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Rang actuel */}
        <div className={`rounded-xl border p-5 space-y-2 ${tierColors}`}>
          <p className="text-xs uppercase tracking-wider opacity-60">Rang actuel</p>
          {player.rank ? (
            <>
              <p className="text-2xl font-bold leading-tight">{player.rank}</p>
              <p className="text-xs opacity-50">{parseTierFromRank(player.rank) || 'Solo/Duo'}</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Non classé</p>
          )}
        </div>

        {/* Peak LP S16 */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-2">
          <p className="text-xs text-purple-300/60 uppercase tracking-wider">Peak LP — S16</p>
          {peakLp != null ? (
            <>
              <p className="text-2xl font-bold text-purple-300 leading-tight">{peakLp} LP</p>
              <p className="text-xs text-purple-300/40">{parseTierFromRank(player.rank) || 'Master+'}</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">—</p>
          )}
        </div>

        {/* Saison S16 */}
        <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-5 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Saison S16</p>
          <p className="text-2xl font-bold text-white leading-tight">{lpGraphMatches.length} parties</p>
          <div className="flex items-center gap-3 flex-wrap">
            {wr != null && (
              <span className={`text-sm font-semibold ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {wr}% WR
              </span>
            )}
            {lpDelta != null && (
              <span className={`text-xs font-medium ${lpDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {lpDelta >= 0 ? '+' : ''}{lpDelta} LP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading / empty state ─────────────────────────────────────── */}
      {d.lpGraphLoading && (
        <p className="text-gray-500 text-sm">Chargement des statistiques…</p>
      )}
      {!d.lpGraphLoading && lpGraphMatches.length === 0 && (
        <p className="text-gray-500 text-sm">
          Chargez des parties dans l&apos;onglet <strong>Import</strong> pour voir les statistiques.
        </p>
      )}

      {!d.lpGraphLoading && lpGraphMatches.length > 0 && (
        <>
          {/* ── Filtres ─────────────────────────────────────────────── */}
          {(hasRoleData || hasSideData) && (
            <div className="flex flex-wrap gap-5 items-start">
              {hasRoleData && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 shrink-0">Rôle :</span>
                  {(['all', ...availableRoles] as string[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        roleFilter === r
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {r === 'all' ? 'Tous' : ROLE_DISPLAY_STATS[r] ?? r}
                    </button>
                  ))}
                </div>
              )}
              {hasSideData && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 shrink-0">Side :</span>
                  {([['all', 'Tous'], ['blue', 'Blue'], ['red', 'Red']] as [string, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSideFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        sideFilter === val
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Statistiques principales ─────────────────────────────── */}
          <div className="space-y-3">
            {/* Rang 1 : Vue d'ensemble */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Parties" value={String(total)} sub={`${wins}V · ${losses}D`} />
              <StatBox
                label="Winrate"
                value={wr != null ? `${wr}%` : '—'}
                valueColor={wr != null ? (wr >= 50 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400'}
              />
              <StatBox
                label="KDA moyen"
                value={avgKda ?? '—'}
                sub={avgK && avgD && avgA ? `${avgK} / ${avgD} / ${avgA}` : undefined}
                valueColor={avgKda && parseFloat(avgKda) >= 3 ? 'text-emerald-400' : avgKda && parseFloat(avgKda) >= 2 ? 'text-white' : 'text-rose-300'}
              />
              <StatBox label="Kills / Morts / Assists" value={avgK && avgD && avgA ? `${avgK} / ${avgD} / ${avgA}` : '—'} sub="Moyenne par partie" />
            </div>

            {/* Rang 2 : Perf stats (seulement si données disponibles) */}
            {(avgDmg != null || avgCsPMin != null || avgVision != null || avgGold != null) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {avgDmg != null && (
                  <StatBox label="DMG/partie" value={avgDmg.toLocaleString('fr-FR')} />
                )}
                {avgCsPMin != null && (
                  <StatBox label="CS/min" value={avgCsPMin} />
                )}
                {avgVision != null && (
                  <StatBox label="Vision moy." value={String(avgVision)} />
                )}
                {avgGold != null && (
                  <StatBox label="Or/partie" value={`${(avgGold / 1000).toFixed(1)}k`} />
                )}
              </div>
            )}
          </div>

          {/* ── Winrate par côté ─────────────────────────────────────── */}
          {hasSideData && (blueWR != null || redWR != null) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winrate par côté</h4>
              <div className="grid grid-cols-2 gap-3">
                {blueWR != null && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm text-gray-300 font-medium">Blue Side</span>
                    </div>
                    <p className={`text-2xl font-bold ${blueWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{blueWR}%</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">{blueWins}V / {blueGames.length - blueWins}D · {blueGames.length} parties</p>
                    <div className="h-1.5 rounded-full bg-dark-border overflow-hidden">
                      <div className={`h-full rounded-full transition-colors ${blueWR >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${blueWR}%` }} />
                    </div>
                  </div>
                )}
                {redWR != null && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <span className="text-sm text-gray-300 font-medium">Red Side</span>
                    </div>
                    <p className={`text-2xl font-bold ${redWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{redWR}%</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">{redWins}V / {redGames.length - redWins}D · {redGames.length} parties</p>
                    <div className="h-1.5 rounded-full bg-dark-border overflow-hidden">
                      <div className={`h-full rounded-full transition-colors ${redWR >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${redWR}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Winrate par rôle ─────────────────────────────────────── */}
          {roleBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winrate par rôle</h4>
              <div className="rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-bg/80 text-gray-400 text-left">
                      <th className="px-4 py-2.5 font-medium">Rôle</th>
                      <th className="px-4 py-2.5 font-medium text-center">Parties</th>
                      <th className="px-4 py-2.5 font-medium text-center">Winrate</th>
                      <th className="px-4 py-2.5 font-medium text-center">KDA</th>
                      <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleBreakdown.map(({ role, games, wins: w, wr: roleWr, kda }) => (
                      <tr key={role} className="border-t border-dark-border/50 hover:bg-dark-bg/40">
                        <td className="px-4 py-3 font-medium text-white">{ROLE_DISPLAY_STATS[role] ?? role}</td>
                        <td className="px-4 py-3 text-center text-gray-300">{games}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${roleWr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {roleWr}%
                          </span>
                          <span className="text-gray-500 text-xs ml-1">({w}V/{games - w}D)</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={parseFloat(kda) >= 3 ? 'text-emerald-400' : parseFloat(kda) >= 2 ? 'text-white' : 'text-rose-300'}>
                            {kda}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-dark-border overflow-hidden">
                              <div
                                className={`h-full rounded-full ${roleWr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${roleWr}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
