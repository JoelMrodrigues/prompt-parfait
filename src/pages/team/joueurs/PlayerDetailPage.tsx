/**
 * Page détail joueur — 4 cartes : Général | Solo Q | Team | Pool Champ
 * Toute la logique est dans usePlayerDetail.
 */
import { useParams, useNavigate, Link } from 'react-router-dom'
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
  Download,
  ChevronDown,
  TrendingUp,
  X,
  Table2,
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
import { usePlayerDetail } from './hooks/usePlayerDetail'
import { getRankColor, generateDpmLink, parseLpFromRank, ROLE_LABELS } from './utils/playerDetailHelpers'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC, PAGE_SIZE } from '../../../lib/constants'

const MAIN_CARDS = [
  { id: 'general', label: 'Général', icon: User },
  { id: 'soloq', label: 'Solo Q', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'pool-champ', label: 'Pool Champ', icon: Trophy },
]

const SOLOQ_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
  { id: 'import', label: 'Import', icon: Download },
]

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
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all truncate max-w-[180px] ${
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

      {/* 4 cartes principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MAIN_CARDS.map((card) => {
          const Icon = card.icon
          const isActive = d.selectedCard === card.id
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => d.setSelectedCard(card.id)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-left ${
                isActive
                  ? 'border-accent-blue bg-accent-blue/10 shadow-lg shadow-accent-blue/20'
                  : 'border-dark-border bg-dark-card/50 hover:border-dark-border/80 hover:bg-dark-card/70'
              }`}
            >
              <div className={`p-3 rounded-xl ${isActive ? 'bg-accent-blue/20' : 'bg-dark-bg/50'}`}>
                <Icon size={28} className={isActive ? 'text-accent-blue' : 'text-gray-400'} />
              </div>
              <span className={`font-display font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
        <div className="flex flex-wrap gap-2">
          {TEAM_SUB.map((sub) => {
            const SubIcon = sub.icon
            const isActive = d.selectedTeamSub === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => d.setSelectedTeamSub(sub.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
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

      {/* Zone de contenu */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/30 p-6 min-h-[200px]">

        {/* ── Général ── */}
        {d.selectedCard === 'general' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-cyan-400" />
              <div>
                <h3 className="font-display text-lg font-semibold text-white">Rank History</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                  {d.lpCurvePoints.length >= 2
                    ? `Historique du ${d.lpCurvePoints[0].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${d.lpCurvePoints[d.lpCurvePoints.length - 1].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
                    : 'Saison en cours'}
                </p>
              </div>
            </div>
            {d.lpGraphLoading ? (
              <p className="text-gray-500 text-sm">Chargement des parties…</p>
            ) : d.lpCurvePoints.length < 2 ? (
              <p className="text-gray-500 text-sm">
                {parseLpFromRank(player.rank) != null
                  ? 'Chargez des parties Solo Q (onglet Solo Q → Import) pour afficher la courbe des LP.'
                  : 'Rang sans LP affiché ou aucune partie. Faites une mise à jour du rang en haut de page.'}
              </p>
            ) : (
              <div className="w-full rounded-xl bg-dark-bg/80 border border-dark-border p-4">
                <LpCurveChart points={d.lpCurvePoints} />
              </div>
            )}
          </div>
        )}

        {/* ── Solo Q ── */}
        {d.selectedCard === 'soloq' && (
          <>
            {d.selectedSoloqSub === 'import' && (
              <div className="space-y-4">
                <p className="text-gray-500 text-sm">Chargez les parties Solo Q depuis l&apos;API Riot (S16 uniquement).</p>
                {(d.totalFromRiot != null || d.countInDb != null) && (
                  <div className="flex flex-wrap gap-3">
                    {d.totalFromRiot != null && (
                      <span className="px-3 py-1.5 rounded-lg bg-dark-bg/60 text-sm">
                        <span className="text-white font-semibold">{d.totalFromRiot}</span>
                        <span className="text-gray-500 ml-1">parties S16</span>
                      </span>
                    )}
                    {d.countInDb != null && (
                      <span className="px-3 py-1.5 rounded-lg bg-accent-blue/10 text-sm border border-accent-blue/30">
                        <span className="text-accent-blue font-semibold">{d.countInDb}</span>
                        <span className="text-gray-400 ml-1">enregistrées</span>
                      </span>
                    )}
                    {d.toLoad != null && d.toLoad > 0 && (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-sm border border-amber-500/30">
                        {d.toLoad} à charger
                      </span>
                    )}
                  </div>
                )}
                {d.activeSoloqPseudo?.trim() && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={d.handleRefreshTotal}
                      disabled={d.refreshTotalLoading}
                      className="px-4 py-2.5 rounded-xl bg-dark-bg/60 border border-dark-border text-gray-300 text-sm font-medium disabled:opacity-50 hover:bg-dark-bg transition-colors"
                    >
                      {d.refreshTotalLoading ? 'Calcul…' : 'Actualiser le total'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={d.handleLoadAllFromRiot}
                        disabled={d.loadAllFromRiotLoading || (d.rateLimitSeconds != null && d.rateLimitSeconds > 0)}
                        className="px-4 py-2.5 rounded-xl bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-sm font-medium disabled:opacity-50 hover:bg-accent-blue/30 transition-colors"
                      >
                        {d.loadAllFromRiotLoading ? 'Chargement…' : 'Charger toutes les parties'}
                      </button>
                      {d.rateLimitSeconds != null && d.rateLimitSeconds > 0 && (
                        <p className="text-rose-400 text-sm mt-1.5 font-medium">
                          Plus de requêtes possible. Attendre{' '}
                          <span className="font-mono font-bold">{d.rateLimitSeconds}s</span>.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!d.activeSoloqPseudo?.trim() && (
                  <p className="text-gray-500 text-sm">Sélectionnez un pseudo (compte 1 ou 2) pour charger les parties.</p>
                )}
              </div>
            )}

            {d.selectedSoloqSub === 'statistiques' && (
              <div className="space-y-6">
                {d.soloqWinrate != null && (
                  <p className="text-gray-400 text-sm">
                    Winrate <span className="font-semibold text-white">{d.soloqWinrate}%</span> sur les parties enregistrées.
                  </p>
                )}
                {d.soloqTopChampionsLoading ? (
                  <p className="text-gray-500 text-sm">Chargement du Top 5…</p>
                ) : d.soloqTopChampionsFromDb.length > 0 ? (
                  <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                    <p className="text-gray-400 text-sm font-medium mb-3">Top 5 Champions</p>
                    <div className="grid grid-cols-5 gap-2 justify-items-center">
                      {d.soloqTopChampionsFromDb.slice(0, 5).map((champ: any, idx: number) => {
                        const name = champ.name
                        if (!name) return null
                        const wr = champ.winrate ?? 0
                        const wrColor = wr >= 90 ? 'text-violet-300' : wr >= 60 ? 'text-green-400' : wr >= 40 ? 'text-orange-400' : 'text-red-700'
                        return (
                          <button key={`${name}-${idx}`} type="button" onClick={() => d.openChampionModal(champ)} className="flex flex-col items-center gap-1 min-w-0 w-full">
                            <span className="text-[12px] text-white font-medium">{champ.games ?? 0}</span>
                            <img src={getChampionImage(name)} alt={name} className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0" />
                            <span className={`text-[12px] font-semibold ${wrColor}`}>{wr}%</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  d.soloqWinrate == null && (
                    <p className="text-gray-500 text-sm">Chargez des parties dans Import pour voir les statistiques.</p>
                  )
                )}
              </div>
            )}

            {d.selectedSoloqSub === 'champions' && (
              <div className="space-y-6">
                {d.soloqTopChampionsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : d.soloqTopChampionsFromDb.length > 0 ? (
                  <>
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-3">Top 5 des champions les plus joués</p>
                      <div className="flex flex-wrap gap-3">
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
                          <button
                            type="button"
                            key={m.matchId || i}
                            onClick={() => d.setGameDetailMatch(m)}
                            className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors text-left"
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
                          </button>
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
          </>
        )}

        {/* ── Team ── */}
        {d.selectedCard === 'team' && (
          <>
            {d.selectedTeamSub === 'statistiques' && (
              <div className="space-y-6">
                {!d.teamStatsLoading && (d.teamStats?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-400 text-sm font-medium">Forme récente (Team)</p>
                      <button type="button" onClick={() => d.setSelectedTeamSub('historiques')} className="text-accent-blue text-sm font-medium hover:underline">
                        Voir l&apos;historique
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(d.teamStats ?? []).slice(0, 5).map((s: any, i: number) => {
                        const m = s.team_matches
                        const win = s.win ?? m?.our_win
                        const k = s.kills ?? 0
                        const dd = s.deaths ?? 0
                        const a = s.assists ?? 0
                        const kda = dd > 0 ? ((k + a) / dd).toFixed(1) : (k + a).toFixed(1)
                        return (
                          <div key={s.id || i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card/80 border border-dark-border/60">
                            <img src={getChampionImage(s.champion_name)} alt="" className="w-8 h-8 rounded object-cover border border-dark-border shrink-0" />
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {win ? 'V' : 'D'}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">KDA {kda}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                <div className="flex gap-2 mb-5 border-b border-dark-border pb-4">
                  {([{ id: 'general', label: 'Général' }, { id: 'detaille', label: 'Détaillé' }] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { d.setTeamChampSubSub(id); d.setExpandedTeamChampion(null) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        d.teamChampSubSub === id
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {d.teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : d.championStatsFromTeam.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune donnée. Ajoutez des parties depuis Matchs.</p>
                ) : d.teamChampSubSub === 'general' ? (
                  <div className="rounded-xl border border-dark-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-bg/80 text-gray-400 text-left">
                          <th className="px-4 py-3 font-medium w-10">#</th>
                          <th className="px-4 py-3 font-medium">Champion</th>
                          <th className="px-4 py-3 font-medium text-center">Parties</th>
                          <th className="px-4 py-3 font-medium text-center">Winrate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.championStatsFromTeam.map((c, idx) => (
                          <tr key={c.name} className="border-t border-dark-border/50">
                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={getChampionImage(c.name)} alt={c.name} className="w-8 h-8 rounded object-cover border border-dark-border shrink-0" />
                                <span className="font-medium text-white">{getChampionDisplayName(c.name) || c.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-emerald-400">{c.wins}V</span>
                              <span className="text-gray-500 mx-1">/</span>
                              <span className="text-rose-400">{c.losses}D</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={c.winrate >= 50 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{c.winrate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {d.championStatsFromTeam.map((c) => {
                      const isOpen = d.expandedTeamChampion === c.name
                      return (
                        <div key={c.name} className="rounded-xl border border-dark-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => d.setExpandedTeamChampion(isOpen ? null : c.name)}
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
                ) : d.teamStats.length > 0 ? (
                  <div className="space-y-3">
                    {d.teamStats.map((s: any, i: number) => {
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

        {/* Modal Champion (matchups solo Q) */}
        {d.championModalChampion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={d.closeChampionModal}>
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
          </div>
        )}

        {/* Modal détail Solo Q */}
        {d.gameDetailMatch && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={() => d.setGameDetailMatch(null)}>
            <div className="bg-dark-card border border-dark-border rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Partie Solo Q</h2>
                <button type="button" onClick={() => d.setGameDetailMatch(null)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Résumé</p>
                <div className="flex items-center gap-3">
                  <img src={getChampionImage(d.gameDetailMatch.championName)} alt="" className="w-12 h-12 rounded-lg object-cover border border-dark-border" />
                  <div>
                    <h3 className="font-semibold text-white">{getChampionDisplayName(d.gameDetailMatch.championName) || d.gameDetailMatch.championName}</h3>
                    <p className="text-sm text-gray-500">
                      {d.gameDetailMatch.gameCreation ? new Date(d.gameDetailMatch.gameCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                    {d.gameDetailMatch.opponentChampionName && (
                      <p className="text-sm text-gray-400 mt-0.5">vs <span className="text-white font-medium">{getChampionDisplayName(d.gameDetailMatch.opponentChampionName) || d.gameDetailMatch.opponentChampionName}</span></p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <div className="flex-1 p-3 rounded-xl bg-dark-bg/50">
                    <p className="text-gray-500 text-xs">Résultat</p>
                    <p className={d.gameDetailMatch.win ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {d.gameDetailMatch.win ? 'Victoire' : 'Défaite'}
                    </p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-dark-bg/50">
                    <p className="text-gray-500 text-xs">Durée</p>
                    <p className="text-white">{d.gameDetailMatch.gameDuration ? `${Math.round(d.gameDetailMatch.gameDuration / 60)} min` : '—'}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Stats globales</p>
                <div className="p-3 rounded-xl bg-dark-bg/50">
                  <p className="text-gray-500 text-xs">K/D/A</p>
                  <p className="font-mono text-white text-lg">{d.gameDetailMatch.kills}/{d.gameDetailMatch.deaths}/{d.gameDetailMatch.assists}</p>
                </div>
              </div>
            </div>
          </div>
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
