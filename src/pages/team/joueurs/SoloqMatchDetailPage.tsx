/**
 * Page dédiée au détail d'une partie Solo Q
 * Route : /team/joueurs/:playerId/soloq/:riotMatchId
 * Tabs : Résumé | Timeline | Build | Stats
 */
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Sword, Clock, BarChart3, Layers, TrendingUp } from 'lucide-react'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { getItemImageUrl } from '../../../lib/items'
import { GoldDiffChart } from './charts/GoldDiffChart'
import { useSoloqMatchDetail } from './hooks/useSoloqMatchDetail'

const TABS = [
  { id: 'resume', label: 'Résumé', icon: Sword },
  { id: 'timeline', label: 'Timeline', icon: TrendingUp },
  { id: 'build', label: 'Build', icon: Layers },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
]

function statCard(label: string, value: string | number | null) {
  return (
    <div key={label} className="flex flex-col items-center gap-1 bg-dark-bg/60 border border-dark-border rounded-xl p-3 min-w-[80px]">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-white font-semibold text-base">{value ?? '—'}</span>
    </div>
  )
}

export function SoloqMatchDetailPage() {
  const { playerId, riotMatchId } = useParams<{ playerId: string; riotMatchId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('resume')

  const { matchData, timelineData, loading, timelineLoading, error } = useSoloqMatchDetail(
    playerId,
    riotMatchId,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 text-gray-400">
        Chargement…
      </div>
    )
  }

  if (error || !matchData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-rose-400">{error || 'Partie introuvable'}</p>
        <button type="button" onClick={() => navigate(-1)} className="text-purple-500 text-sm hover:underline">
          ← Retour
        </button>
      </div>
    )
  }

  const m = matchData
  const matchJson = m.match_json as Record<string, any> | null
  const items: number[] = Array.isArray(m.items) ? m.items : []
  const mainItems = items.slice(0, 6)
  const trinket = items[6] ?? 0

  const durationMin = m.game_duration ? Math.floor(m.game_duration / 60) : 0
  const durationSec = m.game_duration ? m.game_duration % 60 : 0
  const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`

  const kda = m.deaths > 0
    ? ((m.kills + m.assists) / m.deaths).toFixed(2)
    : (m.kills + m.assists).toFixed(2)

  const csPMin = m.cs && m.game_duration
    ? (m.cs / (m.game_duration / 60)).toFixed(1)
    : null

  const puuid = matchJson?.puuid as string | undefined

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={getChampionImage(m.champion_name)}
            alt={m.champion_name}
            className="w-12 h-12 rounded-xl object-cover border border-dark-border"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white">
                {getChampionDisplayName(m.champion_name) || m.champion_name}
              </h1>
              {m.opponent_champion && (
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  vs
                  <img
                    src={getChampionImage(m.opponent_champion)}
                    alt={m.opponent_champion}
                    className="w-5 h-5 rounded object-cover inline-block mx-1"
                  />
                  {getChampionDisplayName(m.opponent_champion)}
                </span>
              )}
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                m.win ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}>
                {m.win ? 'Victoire' : 'Défaite'}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Clock size={11} />
              {durationStr}
              {m.game_creation
                ? ` · ${new Date(m.game_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-dark-border pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? 'text-purple-500 border-purple-500 bg-dark-card/50'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-dark-card/30'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Résumé ──────────────────────────────────────────── */}
      {activeTab === 'resume' && (
        <div className="space-y-5">
          {/* KDA + stats clés */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-5">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-white">
                {m.kills} / <span className={m.deaths > 5 ? 'text-rose-400' : 'text-white'}>{m.deaths}</span> / {m.assists}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                <span className={parseFloat(kda) >= 3 ? 'text-emerald-400 font-semibold' : 'text-gray-300'}>
                  {kda} KDA
                </span>
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {statCard('Dégâts', m.total_damage ? m.total_damage.toLocaleString('fr-FR') : null)}
              {statCard('CS', m.cs)}
              {statCard('CS/min', csPMin)}
              {statCard('Vision', m.vision_score)}
              {statCard('Gold', m.gold_earned ? `${Math.round(m.gold_earned / 1000)}k` : null)}
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="bg-dark-card rounded-2xl border border-dark-border p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Items finaux</h3>
              <div className="flex flex-wrap items-center gap-2">
                {mainItems.map((itemId, i) => (
                  itemId > 0 ? (
                    <img
                      key={i}
                      src={getItemImageUrl(itemId) ?? undefined}
                      alt={`Item ${itemId}`}
                      className="w-10 h-10 rounded-lg border border-dark-border object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div key={i} className="w-10 h-10 rounded-lg border border-dark-border bg-dark-bg/60" />
                  )
                ))}
                {trinket > 0 && (
                  <>
                    <div className="w-px h-8 bg-dark-border mx-1" />
                    <img
                      src={getItemImageUrl(trinket) ?? undefined}
                      alt={`Trinket ${trinket}`}
                      className="w-9 h-9 rounded-lg border border-dark-border/50 object-cover opacity-80"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Runes sommaires */}
          {m.runes && (
            <div className="bg-dark-card rounded-2xl border border-dark-border p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Runes</h3>
              <RunesSummary runes={m.runes} />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Timeline ────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="bg-dark-card rounded-2xl border border-dark-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Différentiel de Gold</h3>
          {timelineLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              Chargement de la timeline…
            </div>
          ) : timelineData ? (
            <GoldDiffChart timeline={timelineData} puuid={puuid} />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              Timeline non disponible pour cette partie
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Build ───────────────────────────────────────────── */}
      {activeTab === 'build' && (
        <div className="bg-dark-card rounded-2xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Build</h3>
          {items.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {mainItems.map((itemId, i) => (
                <ItemCard key={i} itemId={itemId} slot={i + 1} />
              ))}
              {trinket > 0 && <ItemCard itemId={trinket} slot={7} label="Trinket" />}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Build non disponible (partie non importée avec les nouvelles données)</p>
          )}
        </div>
      )}

      {/* ── Tab: Stats ───────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="bg-dark-card rounded-2xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Statistiques détaillées</h3>
          {matchJson ? (
            <AllStatsTable participant={matchJson} gameDuration={m.game_duration} />
          ) : (
            <p className="text-gray-500 text-sm">Données détaillées non disponibles (partie non importée avec les nouvelles données)</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RunesSummary({ runes }: { runes: any }) {
  const styles = runes?.styles ?? []
  if (!styles.length) return <p className="text-gray-500 text-sm">Runes non disponibles</p>

  return (
    <div className="flex flex-col gap-2">
      {styles.map((style: any, si: number) => {
        const selections: any[] = style.selections ?? []
        return (
          <div key={si} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16">{si === 0 ? 'Principal' : 'Secondaire'}</span>
            {selections.map((sel: any, i: number) => (
              <span key={i} className="text-xs bg-dark-bg/60 border border-dark-border rounded px-2 py-0.5 text-gray-300">
                {sel.perk}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ItemCard({ itemId, slot, label }: { itemId: number; slot: number; label?: string }) {
  if (!itemId) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-xl border border-dark-border bg-dark-bg/60" />
        <span className="text-xs text-gray-600">{label ?? `Slot ${slot}`}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getItemImageUrl(itemId) ?? undefined}
        alt={`Item ${itemId}`}
        className="w-14 h-14 rounded-xl border border-dark-border object-cover"
        onError={(e) => {
          const el = e.target as HTMLImageElement
          el.style.display = 'none'
        }}
      />
      <span className="text-xs text-gray-400">{label ?? `Slot ${slot}`}</span>
    </div>
  )
}

const STAT_GROUPS = [
  {
    label: 'Combat',
    keys: [
      ['kills', 'Kills'],
      ['deaths', 'Deaths'],
      ['assists', 'Assists'],
      ['totalDamageDealtToChampions', 'Dégâts champ.'],
      ['totalDamageTaken', 'Dégâts subis'],
      ['magicDamageDealtToChampions', 'Dégâts magiques'],
      ['physicalDamageDealtToChampions', 'Dégâts physiques'],
      ['trueDamageDealtToChampions', 'Dégâts vrais'],
      ['largestCriticalStrike', 'Plus gros crit'],
      ['totalHeal', 'Soin total'],
      ['totalDamageShieldedOnTeammates', 'Bouclier allié'],
      ['timeCCingOthers', 'Temps CC (s)'],
    ],
  },
  {
    label: 'Farm & Or',
    keys: [
      ['totalMinionsKilled', 'Sbires'],
      ['neutralMinionsKilled', 'Monstres'],
      ['goldEarned', 'Or gagné'],
      ['goldSpent', 'Or dépensé'],
    ],
  },
  {
    label: 'Vision',
    keys: [
      ['visionScore', 'Score vision'],
      ['wardsPlaced', 'Wards posées'],
      ['wardsKilled', 'Wards détruites'],
      ['visionWardsBoughtInGame', 'Wards contrôle'],
      ['detectorWardsPlaced', 'Wards vision'],
    ],
  },
  {
    label: 'Objectifs',
    keys: [
      ['turretKills', 'Tourelles'],
      ['inhibitorKills', 'Inhibiteurs'],
      ['baronKills', 'Barons'],
      ['dragonKills', 'Dragons'],
      ['firstBloodKill', 'First blood'],
      ['firstTowerKill', 'First tour'],
    ],
  },
]

function AllStatsTable({ participant, gameDuration }: { participant: Record<string, any>; gameDuration: number }) {
  const totalCs = (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0)
  const csPMin = gameDuration > 0 ? (totalCs / (gameDuration / 60)).toFixed(1) : '—'

  return (
    <div className="space-y-5">
      {/* CS/min synthèse */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">CS total : <span className="text-white font-semibold">{totalCs}</span></span>
        <span className="text-gray-400">CS/min : <span className="text-white font-semibold">{csPMin}</span></span>
      </div>

      {STAT_GROUPS.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {group.keys.map(([key, label]) => {
              const val = participant[key]
              if (val == null) return null
              return (
                <div key={key} className="flex items-center justify-between bg-dark-bg/60 border border-dark-border/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-xs font-semibold text-white">
                    {typeof val === 'boolean' ? (val ? 'Oui' : 'Non') : val.toLocaleString?.('fr-FR') ?? val}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
