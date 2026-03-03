/**
 * Bloc stats Team d'un joueur — Redesign par familles (même stats qu'All Stats, sans runes).
 * Performance | Combat | Dégâts | Farm & Or | Vision | Objectifs | Soins | Contrôle | Autres | Champions
 */
import { useMemo } from 'react'
import { usePlayerTeamStats } from '../../hooks/usePlayerTeamStats'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'
import {
  Trophy,
  Swords,
  Target,
  Eye,
  Sparkles,
  DollarSign,
  Shield,
  Crosshair,
  Clock,
  Layers,
} from 'lucide-react'
import {
  isStatKeyIgnored,
  STAT_FAMILY_ORDER,
  groupKeysByFamily,
  getStatLabel,
  formatStatValue,
} from '../utils/teamStatsFamilies'

const FAMILY_ICONS: Record<string, any> = {
  Performance: Trophy,
  Combat: Swords,
  'Dégâts': Crosshair,
  'Farm & Or': DollarSign,
  Vision: Eye,
  Objectifs: Target,
  'Soins & Boucliers': Shield,
  Contrôle: Clock,
  Autres: Layers,
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext = '',
  accent = 'blue',
}: {
  icon: any
  label: string
  value: any
  subtext?: string
  accent?: string
}) {
  const accents: Record<string, string> = {
    blue: 'border-l-accent-blue bg-accent-blue/5',
    green: 'border-l-emerald-500 bg-emerald-500/5',
    red: 'border-l-rose-500 bg-rose-500/5',
    gold: 'border-l-amber-500 bg-amber-500/5',
    purple: 'border-l-violet-500 bg-violet-500/5',
  }
  return (
    <div className={`rounded-xl p-4 border border-dark-border border-l-4 ${accents[accent] || accents.blue}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-dark-bg/50 shrink-0">
          <Icon size={18} className="text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-xl font-bold text-white mt-0.5">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

function SectionBlock({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-accent-blue shrink-0" />
        <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/** Agrège les stats d'un participant (stats object) — récupère valeur numérique ou booléenne */
function getStatValue(stats: any, key: string): number | boolean | null {
  if (!stats || typeof stats !== 'object') return null
  const k = Object.keys(stats).find((x) => x.toLowerCase() === key.toLowerCase())
  const v = k ? stats[k] : stats[key]
  if (v === undefined || v === null) return null
  if (typeof v === 'boolean') return v
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** mode: 'stats' = tout sauf champions | 'champions' = champions only | 'all' = tout */
export function PlayerTeamStatsSection({
  playerId,
  mode = 'all',
  matchesWithJson = [],
}: {
  playerId: string | null | undefined
  mode?: 'stats' | 'champions' | 'all'
  matchesWithJson?: any[]
}) {
  const { stats: teamStats, teamTotalsByMatch, loading: teamStatsLoading } = usePlayerTeamStats(playerId)

  const n = teamStats.length
  const wins = teamStats.filter((s) => s.team_matches?.our_win).length
  const winrate = n ? (wins / n) * 100 : 0
  const blueRows = teamStats.filter((s) => s.team_matches?.our_team_id === 100)
  const redRows = teamStats.filter((s) => s.team_matches?.our_team_id === 200)
  const blueGames = blueRows.length
  const redGames = redRows.length
  const blueWins = blueRows.filter((s) => s.team_matches?.our_win).length
  const redWins = redRows.filter((s) => s.team_matches?.our_win).length
  const winrateBlue = blueGames ? (blueWins / blueGames) * 100 : 0
  const winrateRed = redGames ? (redWins / redGames) * 100 : 0
  const sumK = teamStats.reduce((a, s) => a + (s.kills ?? 0), 0)
  const sumD = teamStats.reduce((a, s) => a + (s.deaths ?? 0), 0)
  const sumA = teamStats.reduce((a, s) => a + (s.assists ?? 0), 0)
  const avgK = n ? sumK / n : 0
  const avgD = n ? sumD / n : 0
  const avgA = n ? sumA / n : 0
  const kdaRatio = sumD > 0 ? (sumK + sumA) / sumD : sumK + sumA
  const kpPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.kills === 0) return null
      return (((s.kills ?? 0) + (s.assists ?? 0)) / tot.kills) * 100
    })
    .filter((x) => x != null)
  const goldPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.gold === 0) return null
      return ((s.gold_earned ?? 0) / tot.gold) * 100
    })
    .filter((x) => x != null)
  const dmgPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.damage === 0) return null
      return ((s.total_damage_dealt_to_champions ?? 0) / tot.damage) * 100
    })
    .filter((x) => x != null)
  const avgKp = kpPcts.length ? kpPcts.reduce((a, b) => a + b, 0) / kpPcts.length : 0
  const avgGoldPct = goldPcts.length ? goldPcts.reduce((a, b) => a + b, 0) / goldPcts.length : 0
  const avgDmgPct = dmgPcts.length ? dmgPcts.reduce((a, b) => a + b, 0) / dmgPcts.length : 0
  const csPerMinList = teamStats
    .map((s) => {
      const dur = s.team_matches?.game_duration
      if (!dur || dur <= 0) return null
      return (s.cs ?? 0) / (dur / 60)
    })
    .filter((x) => x != null)
  const avgCsPerMin = csPerMinList.length ? csPerMinList.reduce((a, b) => a + b, 0) / csPerMinList.length : 0
  const sumVision = teamStats.reduce((a, s) => a + (s.vision_score ?? 0), 0)
  const avgVision = n ? sumVision / n : 0

  const matchesById = useMemo(() => {
    const map = new Map<string, any>()
    for (const m of matchesWithJson || []) {
      if (m?.id) map.set(m.id, m)
    }
    return map
  }, [matchesWithJson])

  const aggregatedByKey = useMemo(() => {
    const sum: Record<string, number> = {}
    const count: Record<string, number> = {}
    let gamesWithJson = 0
    for (const row of teamStats) {
      const match = matchesById.get(row.match_id)
      const json = match?.match_json
      const participants = json?.info?.participants ?? json?.participants ?? []
      const participantId = row.participant_id ?? row.participantId
      const participant = participants.find(
        (p: any) => (p.participantId ?? p.participant_id) === participantId
      )
      if (!participant) continue
      const stats = participant.stats ?? participant
      if (!stats || typeof stats !== 'object') continue
      gamesWithJson += 1
      for (const key of Object.keys(stats)) {
        if (isStatKeyIgnored(key)) continue
        const v = getStatValue(stats, key)
        if (v === null) continue
        if (typeof v === 'boolean') {
          if (!sum[key]) sum[key] = 0
          sum[key] += v ? 1 : 0
          count[key] = (count[key] || 0) + 1
        } else {
          sum[key] = (sum[key] || 0) + v
          count[key] = (count[key] || 0) + 1
        }
      }
    }
    const avg: Record<string, number | boolean> = {}
    for (const key of Object.keys(sum)) {
      const c = count[key] ?? 0
      if (c === 0) continue
      const val = sum[key]
      const isBool = key.toLowerCase().includes('win') || val === 0 || val === 1
      if (isBool && gamesWithJson > 0) avg[key] = val / gamesWithJson
      else avg[key] = val / c
    }
    return { avg, gamesWithJson }
  }, [teamStats, matchesById])

  const familyMap = useMemo(() => {
    const keys = Object.keys(aggregatedByKey.avg).filter((k) => k.toLowerCase() !== 'win')
    return groupKeysByFamily(keys)
  }, [aggregatedByKey.avg])

  interface ChampEntry {
    champion_name: string
    games: number
    wins: number
    kills: number
    deaths: number
    assists: number
    cs: number
    csPerMinSum: number
    csPerMinCount: number
  }
  const byChamp: Record<string, ChampEntry> = {}
  for (const s of teamStats) {
    const name = s.champion_name || 'Inconnu'
    if (!byChamp[name]) {
      byChamp[name] = {
        champion_name: name,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        csPerMinSum: 0,
        csPerMinCount: 0,
      }
    }
    const c = byChamp[name]
    c.games += 1
    if (s.team_matches?.our_win) c.wins += 1
    c.kills += s.kills ?? 0
    c.deaths += s.deaths ?? 0
    c.assists += s.assists ?? 0
    c.cs += s.cs ?? 0
    const dur = s.team_matches?.game_duration
    if (dur && dur > 0) {
      c.csPerMinSum += (s.cs ?? 0) / (dur / 60)
      c.csPerMinCount += 1
    }
  }
  const championList = Object.values(byChamp).sort((a, b) => b.games - a.games)

  if (teamStatsLoading) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500">Chargement des statistiques…</p>
      </div>
    )
  }
  if (!playerId || n === 0) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <div className="max-w-sm mx-auto">
          <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 text-sm">
            Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.
          </p>
        </div>
      </div>
    )
  }

  const showStats = mode === 'stats' || mode === 'all'
  const showChampions = mode === 'champions' || mode === 'all'
  const useFullStatsByFamily = showStats && aggregatedByKey.gamesWithJson > 0 && Object.keys(aggregatedByKey.avg).length > 0

  return (
    <div className="space-y-12">
      {showStats && (
        <>
          {/* Performance — Résultats (toujours affiché) */}
          <SectionBlock title="Performance" icon={Trophy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Trophy} label="Parties jouées" value={n} accent="blue" />
              <StatCard
                icon={Trophy}
                label="Winrate global"
                value={`${winrate.toFixed(1)}%`}
                subtext={`${wins}V / ${n - wins}D`}
                accent={winrate >= 50 ? 'green' : 'red'}
              />
              <StatCard
                icon={Trophy}
                label="Winrate côté Bleu"
                value={blueGames ? `${winrateBlue.toFixed(1)}%` : '—'}
                subtext={blueGames ? `${blueWins}V · ${blueGames} parties` : undefined}
                accent="blue"
              />
              <StatCard
                icon={Trophy}
                label="Winrate côté Rouge"
                value={redGames ? `${winrateRed.toFixed(1)}%` : '—'}
                subtext={redGames ? `${redWins}V · ${redGames} parties` : undefined}
                accent="red"
              />
            </div>
          </SectionBlock>

          {useFullStatsByFamily ? (
            <>
              <p className="text-sm text-gray-500 -mt-4">
                Moyennes sur <strong>{aggregatedByKey.gamesWithJson}</strong> partie{aggregatedByKey.gamesWithJson > 1 ? 's' : ''} (données complètes du JSON).
              </p>
              {/* Toutes les stats par famille (depuis match_json) */}
              {STAT_FAMILY_ORDER.map((familyName) => {
              const keys = familyMap.get(familyName)
              if (!keys?.length) return null
              const Icon = FAMILY_ICONS[familyName] ?? Layers
              return (
                <SectionBlock key={familyName} title={familyName} icon={Icon}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {keys.map((key) => {
                      const raw = aggregatedByKey.avg[key]
                      const val =
                        typeof raw === 'boolean'
                          ? raw
                            ? 'Oui'
                            : 'Non'
                          : formatStatValue(key, raw, true)
                      return (
                        <div
                          key={key}
                          className="rounded-lg p-3 border border-dark-border bg-dark-bg/40 hover:bg-dark-bg/60 transition-colors"
                        >
                          <p className="text-xs text-gray-500 truncate" title={getStatLabel(key)}>
                            {getStatLabel(key)}
                          </p>
                          <p className="text-lg font-semibold text-white mt-0.5 truncate">{val}</p>
                        </div>
                      )
                    })}
                  </div>
                </SectionBlock>
              )
            })}
            </>
          ) : (
            /* Fallback : stats classiques (DB uniquement) */
            <>
              <SectionBlock title="Combat" icon={Swords}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={Swords}
                    label="KDA ratio"
                    value={kdaRatio.toFixed(1)}
                    subtext={`${avgK.toFixed(1)} / ${avgD.toFixed(1)} / ${avgA.toFixed(1)} par partie`}
                    accent="red"
                  />
                  <StatCard icon={Target} label="CS / minute" value={avgCsPerMin.toFixed(1)} accent="gold" />
                </div>
              </SectionBlock>
              <SectionBlock title="Impact sur l'équipe" icon={Target}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard icon={Target} label="Participation aux kills (KP%)" value={`${avgKp.toFixed(1)}%`} accent="purple" />
                  <StatCard icon={Target} label="Part de l'or équipe" value={`${avgGoldPct.toFixed(1)}%`} accent="gold" />
                  <StatCard icon={Target} label="Part des dégâts équipe" value={`${avgDmgPct.toFixed(1)}%`} accent="red" />
                </div>
              </SectionBlock>
              <SectionBlock title="Vision" icon={Eye}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Eye} label="Score de vision (moy.)" value={avgVision.toFixed(1)} accent="purple" />
                </div>
              </SectionBlock>
            </>
          )}
        </>
      )}

      {showChampions && (
        <SectionBlock title="Champions les plus joués" icon={Sparkles}>
          <div className="rounded-xl border border-dark-border overflow-hidden bg-dark-card/30">
            <div className="divide-y divide-dark-border">
              {championList.map((c) => {
                const wr = c.games ? (c.wins / c.games) * 100 : 0
                const kda = c.deaths > 0 ? (c.kills + c.assists) / c.deaths : c.kills + c.assists
                const avgCsMin = c.csPerMinCount ? c.csPerMinSum / c.csPerMinCount : 0
                const avgK = c.games ? c.kills / c.games : 0
                const avgD = c.games ? c.deaths / c.games : 0
                const avgA = c.games ? c.assists / c.games : 0
                return (
                  <div
                    key={c.champion_name}
                    className="flex items-center gap-4 p-4 hover:bg-dark-bg/30 transition-colors"
                  >
                    <img
                      src={getChampionImage(c.champion_name)}
                      alt={getChampionDisplayName(c.champion_name) || c.champion_name}
                      className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">
                        {getChampionDisplayName(c.champion_name) || c.champion_name}
                      </p>
                      <p className="text-sm text-gray-500 sm:hidden">
                        {c.games} partie{c.games > 1 ? 's' : ''} · {wr.toFixed(0)}% · KDA {kda.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-500 hidden sm:block">
                        {c.games} partie{c.games > 1 ? 's' : ''} · Winrate {wr.toFixed(0)}%
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">K/D/A</p>
                        <p className="text-white">
                          {avgK.toFixed(1)} / {avgD.toFixed(1)} / {avgA.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">KDA</p>
                        <p className="text-white">{kda.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">CS/min</p>
                        <p className="text-white">{avgCsMin.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Winrate</p>
                        <p className={wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{wr.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </SectionBlock>
      )}
    </div>
  )
}
