/**
 * Sections Builds & Runes — SoloQ et Team
 * Extraites de PlayerDetailPage pour alléger le fichier principal.
 */
import { useState, useEffect } from 'react'
import { getChampionImage } from '../../../../lib/championImages'
import { getItemImageUrl, getItemName, loadItems, isItemsLoaded } from '../../../../lib/items'

const DD_RUNE = (icon: string) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/${icon.toLowerCase()}`

export function RuneIcon({ id, runesCache, size = 'sm' }: { id: number; runesCache: Array<{ id: number; name: string; icon: string }>; size?: 'lg' | 'sm' }) {
  const r = runesCache.find((x) => Number(x.id) === id)
  if (!r?.icon) return <div className={`${size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} rounded-full bg-dark-bg/60 border border-dark-border/50`} title={String(id)} />
  return (
    <img src={DD_RUNE(r.icon)} alt={r.name} title={r.name}
      className={`${size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} rounded-full object-cover bg-dark-bg border border-dark-border/50`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

export function ItemImg({ id, size = 'md' }: { id: number; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false)
  const url = getItemImageUrl(id)
  const cls = size === 'sm' ? 'w-6 h-6 rounded' : 'w-7 h-7 rounded-md'
  if (!url || imgError) return <div className={`${cls} border border-dark-border/60 bg-dark-bg/40`} title={String(id)} />
  return (
    <img src={url} alt={String(id)} title={getItemName(id) ?? String(id)}
      className={`${cls} border border-dark-border/60 object-cover`}
      onError={() => setImgError(true)}
    />
  )
}

export function ChampRow({
  champ, isExpanded, onClick, children,
}: { champ: string; isExpanded: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-dark-bg/60 transition-colors ${isExpanded ? 'bg-dark-bg/60' : 'bg-dark-bg/40'}`} onClick={onClick}>
      <img src={getChampionImage(champ)} alt={champ} className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      {children}
      <div className="ml-auto shrink-0 text-gray-500">
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  )
}

export function RunesRow({ ks, p1, p2, p3, s1, s2, runesCache }: { ks?: number; p1?: number; p2?: number; p3?: number; s1?: number; s2?: number; runesCache: Array<{ id: number; name: string; icon: string }> }) {
  return (
    <div className="flex items-center gap-1">
      {ks ? <RuneIcon id={ks} runesCache={runesCache} size="lg" /> : null}
      {[p1, p2, p3].filter(Boolean).map((id) => <RuneIcon key={id} id={id!} runesCache={runesCache} size="sm" />)}
      {(s1 || s2) && <div className="w-px h-5 bg-dark-border/60 mx-0.5 shrink-0" />}
      {[s1, s2].filter(Boolean).map((id) => <RuneIcon key={id} id={id!} runesCache={runesCache} size="sm" />)}
    </div>
  )
}

export function GameHistoryPanel({
  games, runesCache, getRunesFromGame, getItemsFromGame, getWin, getDate, getKda, emptyMsg,
}: {
  games: any[]
  runesCache: Array<{ id: number; name: string; icon: string }>
  getRunesFromGame: (g: any) => { ks?: number; p1?: number; p2?: number; p3?: number; s1?: number; s2?: number }
  getItemsFromGame: (g: any) => number[]
  getWin: (g: any) => boolean
  getDate: (g: any) => number | null
  getKda: (g: any) => string
  emptyMsg: string
}) {
  const [showAll, setShowAll] = useState(false)
  const display = showAll ? games : games.slice(0, 10)
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  if (games.length === 0) return <p className="text-gray-500 text-xs py-3 text-center">{emptyMsg}</p>

  return (
    <div className="divide-y divide-dark-border/20">
      {display.map((g, idx) => {
        const win = getWin(g)
        const runes = getRunesFromGame(g)
        const items = getItemsFromGame(g)
        const date = getDate(g)
        const hasData = runes.ks || items.length > 0
        return (
          <div key={idx} className={`flex items-center gap-3 px-4 py-2 ${win ? 'bg-emerald-900/10' : 'bg-rose-900/10'}`}>
            <div className="w-[90px] shrink-0">
              <span className={`text-xs font-semibold ${win ? 'text-emerald-400' : 'text-rose-400'}`}>{win ? 'Victoire' : 'Défaite'}</span>
              {date ? <p className="text-[10px] text-gray-600">{fmt(date)}</p> : null}
            </div>
            <div className="w-14 shrink-0 text-xs text-gray-400">{getKda(g)}</div>
            {hasData ? (
              <>
                <RunesRow {...runes} runesCache={runesCache} />
                {items.length > 0 && <div className="w-px h-5 bg-dark-border/60 shrink-0" />}
                <div className="flex items-center gap-0.5">
                  {items.map((id, i) => <ItemImg key={`${id}-${i}`} id={id} size="sm" />)}
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-600 italic">Données non enrichies</span>
            )}
          </div>
        )
      })}
      {!showAll && games.length > 10 && (
        <button className="w-full py-2 text-xs text-accent-blue hover:opacity-80 transition-opacity" onClick={() => setShowAll(true)}>
          Voir plus ({games.length - 10} parties supplémentaires)
        </button>
      )}
    </div>
  )
}

export function SoloqBuildsRunesSection({ lpGraphMatches, loading, runesCache }: {
  lpGraphMatches: any[]; loading: boolean; runesCache: Array<{ id: number; name: string; icon: string }>
}) {
  const [itemsReady, setItemsReady] = useState(isItemsLoaded)
  useEffect(() => { if (!itemsReady) loadItems().then(() => setItemsReady(true)) }, [])
  const [expandedChamp, setExpandedChamp] = useState<string | null>(null)

  const realGames = lpGraphMatches.filter((m) => (m.game_duration ?? 0) >= 180)

  // Runes : colonne `runes` (perks Riot) ou fallback sur match_json.perks si la colonne est null
  const getSoloqRunes = (m: any) => m.runes ?? (m.match_json as any)?.perks ?? null
  // Items : colonne `items` ou fallback sur les champs item0..6 dans match_json
  const getSoloqItems = (m: any): number[] => {
    if (m.items) return (m.items as number[]).filter((id: number) => id > 0)
    const mj = m.match_json as any
    if (!mj) return []
    return [mj.item0, mj.item1, mj.item2, mj.item3, mj.item4, mj.item5, mj.item6].filter((id: number) => id > 0)
  }

  type ChampData = { games: number; wins: number; runeCombos: Map<string, number>; itemFreq: Map<number, number> }
  const champMap = new Map<string, ChampData>()
  for (const m of realGames) {
    const champ = m.champion_name
    if (!champ) continue
    const runesData = getSoloqRunes(m)
    const primary = runesData?.styles?.find((s: any) => s.description === 'primaryStyle')
    const sub = runesData?.styles?.find((s: any) => s.description === 'subStyle')
    const ks = primary?.selections?.[0]?.perk ?? 0
    const p1 = primary?.selections?.[1]?.perk ?? 0
    const p2 = primary?.selections?.[2]?.perk ?? 0
    const p3 = primary?.selections?.[3]?.perk ?? 0
    const s1 = sub?.selections?.[0]?.perk ?? 0
    const s2 = sub?.selections?.[1]?.perk ?? 0
    const entry = champMap.get(champ) ?? { games: 0, wins: 0, runeCombos: new Map(), itemFreq: new Map() }
    entry.games++
    if (m.win) entry.wins++
    if (ks) entry.runeCombos.set([ks, p1, p2, p3, s1, s2].join(','), (entry.runeCombos.get([ks, p1, p2, p3, s1, s2].join(',')) ?? 0) + 1)
    for (const id of getSoloqItems(m)) {
      entry.itemFreq.set(id, (entry.itemFreq.get(id) ?? 0) + 1)
    }
    champMap.set(champ, entry)
  }

  const topChamps = Array.from(champMap.entries())
    .sort((a, b) => b[1].games - a[1].games).slice(0, 8)
    .map(([name, v]) => {
      const [bestRune] = [...v.runeCombos.entries()].sort((a, b) => b[1] - a[1])
      const [ks, p1, p2, p3, s1, s2] = (bestRune?.[0] ?? '').split(',').map(Number)
      const topItems = [...v.itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
      return { name, games: v.games, wr: Math.round((v.wins / v.games) * 100), ks, p1, p2, p3, s1, s2, topItems }
    })

  const getChampGames = (champ: string) =>
    realGames.filter((m) => m.champion_name === champ).sort((a, b) => (b.game_creation ?? 0) - (a.game_creation ?? 0))

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Chargement…</p>
  if (topChamps.length === 0)
    return <p className="text-gray-500 text-sm py-6 text-center">Aucune donnée disponible. Importez des parties avec le backend Riot.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Runes & builds les plus fréquents — cliquez un champion pour voir l'historique</p>
      {topChamps.map((c) => {
        const isExpanded = expandedChamp === c.name
        return (
          <div key={c.name} className="rounded-xl border border-dark-border/60 overflow-hidden">
            <ChampRow champ={c.name} isExpanded={isExpanded} onClick={() => setExpandedChamp(isExpanded ? null : c.name)}>
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.games}G · <span className={c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{c.wr}%</span></p>
              </div>
              <RunesRow ks={c.ks} p1={c.p1} p2={c.p2} p3={c.p3} s1={c.s1} s2={c.s2} runesCache={runesCache} />
              {c.topItems.length > 0 && <div className="w-px h-6 bg-dark-border/60 shrink-0" />}
              <div className="flex items-center gap-1">
                {c.topItems.map((id, i) => <ItemImg key={`${id}-${i}`} id={id} />)}
              </div>
            </ChampRow>
            {isExpanded && (
              <div className="border-t border-dark-border/40">
                <GameHistoryPanel
                  games={getChampGames(c.name)}
                  runesCache={runesCache}
                  getRunesFromGame={(m) => {
                    const rd = getSoloqRunes(m)
                    const primary = rd?.styles?.find((s: any) => s.description === 'primaryStyle')
                    const sub = rd?.styles?.find((s: any) => s.description === 'subStyle')
                    return {
                      ks: primary?.selections?.[0]?.perk,
                      p1: primary?.selections?.[1]?.perk,
                      p2: primary?.selections?.[2]?.perk,
                      p3: primary?.selections?.[3]?.perk,
                      s1: sub?.selections?.[0]?.perk,
                      s2: sub?.selections?.[1]?.perk,
                    }
                  }}
                  getItemsFromGame={(m) => getSoloqItems(m).slice(0, 6)}
                  getWin={(m) => !!m.win}
                  getDate={(m) => m.game_creation ?? null}
                  getKda={(m) => `${m.kills ?? 0}/${m.deaths ?? 0}/${m.assists ?? 0}`}
                  emptyMsg="Aucune partie trouvée"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function TeamBuildsRunesSection({ teamStats, loading, runesCache }: {
  teamStats: any[]; loading: boolean; runesCache: Array<{ id: number; name: string; icon: string }>
}) {
  const [itemsReady, setItemsReady] = useState(isItemsLoaded)
  useEffect(() => { if (!itemsReady) loadItems().then(() => setItemsReady(true)) }, [])
  const [expandedChamp, setExpandedChamp] = useState<string | null>(null)

  const realGames = teamStats.filter((s) => (s.team_matches?.game_duration ?? 0) >= 180)

  const extractTeamRunes = (s: any) => {
    const n = (v: any) => (v ? Number(v) : undefined)
    return { ks: n(s.perk0), p1: n(s.perk1), p2: n(s.perk2), p3: n(s.perk3), s1: n(s.perk4), s2: n(s.perk5) }
  }

  type ChampData = { games: number; wins: number; runeCombos: Map<string, number>; itemFreq: Map<number, number> }
  const champMap = new Map<string, ChampData>()
  for (const s of realGames) {
    const champ = s.champion_name
    if (!champ) continue
    const { ks = 0, p1 = 0, p2 = 0, p3 = 0, s1 = 0, s2 = 0 } = extractTeamRunes(s)
    const entry = champMap.get(champ) ?? { games: 0, wins: 0, runeCombos: new Map(), itemFreq: new Map() }
    entry.games++
    if (s.team_matches?.our_win) entry.wins++
    if (ks) {
      const key = [ks, p1, p2, p3, s1, s2].join(',')
      entry.runeCombos.set(key, (entry.runeCombos.get(key) ?? 0) + 1)
    }
    for (const id of [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5].filter((id) => id > 0)) {
      entry.itemFreq.set(id, (entry.itemFreq.get(id) ?? 0) + 1)
    }
    champMap.set(champ, entry)
  }

  const topChamps = Array.from(champMap.entries())
    .sort((a, b) => b[1].games - a[1].games).slice(0, 8)
    .map(([name, v]) => {
      const [bestRune] = [...v.runeCombos.entries()].sort((a, b) => b[1] - a[1])
      const [ks, p1, p2, p3, s1, s2] = (bestRune?.[0] ?? '').split(',').map(Number)
      const topItems = [...v.itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
      return { name, games: v.games, wr: Math.round((v.wins / v.games) * 100), ks, p1, p2, p3, s1, s2, topItems }
    })

  const getChampGames = (champ: string) =>
    realGames.filter((s) => s.champion_name === champ).sort((a, b) => (b.team_matches?.game_creation ?? 0) - (a.team_matches?.game_creation ?? 0))

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Chargement…</p>
  if (topChamps.length === 0)
    return <p className="text-gray-500 text-sm py-6 text-center">Aucune donnée. Ajoutez des matchs Team depuis la page Matchs.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Runes & builds les plus fréquents — cliquez un champion pour voir l'historique</p>
      {topChamps.map((c) => {
        const isExpanded = expandedChamp === c.name
        const hasRunes = !!(c.ks)
        return (
          <div key={c.name} className="rounded-xl border border-dark-border/60 overflow-hidden">
            <ChampRow champ={c.name} isExpanded={isExpanded} onClick={() => setExpandedChamp(isExpanded ? null : c.name)}>
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.games}G · <span className={c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{c.wr}%</span></p>
              </div>
              {hasRunes
                ? <RunesRow ks={c.ks} p1={c.p1} p2={c.p2} p3={c.p3} s1={c.s1} s2={c.s2} runesCache={runesCache} />
                : <span className="text-xs text-gray-600 italic">Runes non disponibles</span>
              }
              {c.topItems.length > 0 && <div className="w-px h-6 bg-dark-border/60 shrink-0" />}
              <div className="flex items-center gap-1">
                {c.topItems.map((id, i) => <ItemImg key={`${id}-${i}`} id={id} />)}
              </div>
            </ChampRow>
            {isExpanded && (
              <div className="border-t border-dark-border/40">
                <GameHistoryPanel
                  games={getChampGames(c.name)}
                  runesCache={runesCache}
                  getRunesFromGame={extractTeamRunes}
                  getItemsFromGame={(s) => [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5].filter((id) => id > 0)}
                  getWin={(s) => !!s.team_matches?.our_win}
                  getDate={(s) => s.team_matches?.game_creation ?? null}
                  getKda={(s) => `${s.kills ?? 0}/${s.deaths ?? 0}/${s.assists ?? 0}`}
                  emptyMsg="Aucune partie trouvée"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
