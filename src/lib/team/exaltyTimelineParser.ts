/**
 * Parse les timelines Exalty/Riot (JSON par frame avec participantFrames + events).
 * Format: { frames: [ { timestamp, participantFrames: { "1": {...}, ... }, events: [...] } ] }
 */

/** Types d'events Riot */
const EVENT_TYPES = {
  CHAMPION_KILL: 'CHAMPION_KILL',
  ELITE_MONSTER_KILL: 'ELITE_MONSTER_KILL',
  BUILDING_KILL: 'BUILDING_KILL',
}

const MONSTER_LABELS = {
  DRAGON: 'Dragon',
  BARON_NASHOR: 'Baron',
  RIFTHERALD: 'Herald',
  HORDE: 'Horde',
  AIR_DRAGON: 'Dragon Air',
  WATER_DRAGON: 'Dragon Eau',
  FIRE_DRAGON: 'Dragon Feu',
  EARTH_DRAGON: 'Dragon Terre',
  HEXTECH_DRAGON: 'Dragon Hextech',
  ELDER_DRAGON: 'Dragon Ancien',
}

const TOWER_LABELS = {
  OUTER_TURRET: 'Tour externe',
  INNER_TURRET: 'Tour interne',
  BASE_TURRET: 'Tour base',
  NEXUS_TURRET: 'Tour Nexus',
}

/**
 * Récupère un game ID depuis le JSON (Riot/Exalty peuvent utiliser des noms différents).
 * @param {Object} data - Objet parsé
 * @returns {number|string|null}
 */
function extractGameIdFromData(data) {
  if (!data || typeof data !== 'object') return null
  const id = data.gameId ?? data.game_id ?? data.matchId ?? data.match_id
  if (id != null && id !== '') return typeof id === 'number' ? id : Number(id) || id
  return null
}

/**
 * Tente d'extraire le numéro de game du nom de fichier.
 * Ex: timeline3.txt → 3, timeline13 → 13, response_3 → 3, timeline_7704801020.json → 7704801020
 * @param {string} filename
 * @returns {string|null} - Le nombre trouvé (string) ou null
 */
export function extractGameIdFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null
  const numbers = filename.match(/\d+/g)
  if (!numbers || numbers.length === 0) return null
  return numbers.length === 1
    ? numbers[0]
    : numbers.reduce((a, b) => (b.length >= a.length ? b : a))
}

/**
 * Parse le JSON brut (fichier .txt ou .json)
 * @param {string|Object} raw - Contenu texte ou objet déjà parsé
 * @param {{ filename?: string }} options - optionnel: filename pour tenter d'extraire un gameId
 * @returns {Object|null} - { frames, summary, gameId } ou null
 */
export function parseTimeline(raw, options = {}) {
  let data
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw.trim())
    } catch {
      return null
    }
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.frames)) {
    data = raw
  } else {
    return null
  }

  if (!data?.frames?.length) return null

  const gameIdFromJson = extractGameIdFromData(data)
  const opts = options as { filename?: string }
  const gameIdFromFile = opts.filename ? extractGameIdFromFilename(opts.filename) : null
  const gameId = gameIdFromJson ?? gameIdFromFile ?? null

  const frames = data.frames
  const events = []
  const participantSnapshots = new Map() // participantId -> [{ timestamp, ... }]

  for (const frame of frames) {
    const ts = frame.timestamp ?? 0
    const min = Math.floor(ts / 60000)

    for (const ev of frame.events || []) {
      events.push({
        ...ev,
        timeMin: min,
        timeSec: (ts / 1000).toFixed(1),
      })
    }

    const pf = frame.participantFrames || {}
    for (const pid of Object.keys(pf)) {
      const p = pf[pid]
      if (!participantSnapshots.has(pid)) {
        participantSnapshots.set(pid, [])
      }
      participantSnapshots.get(pid).push({
        timestamp: ts,
        timeMin: min,
        currentGold: p.currentGold ?? 0,
        totalGold: p.totalGold ?? 0,
        level: p.level ?? 1,
        minionsKilled: p.minionsKilled ?? 0,
        jungleMinionsKilled: p.jungleMinionsKilled ?? 0,
        xp: p.xp ?? 0,
        position: p.position ?? { x: 0, y: 0 },
      })
    }
  }

  const lastFrame = frames[frames.length - 1]
  const durationMs = lastFrame?.timestamp ?? 0
  const durationMin = Math.floor(durationMs / 60000)

  // Résumé des events par type
  const kills = events.filter((e) => e.type === EVENT_TYPES.CHAMPION_KILL)
  const monsters = events.filter((e) => e.type === EVENT_TYPES.ELITE_MONSTER_KILL)
  const buildings = events.filter((e) => e.type === EVENT_TYPES.BUILDING_KILL)

  const dragons = monsters.filter((e) => e.monsterType === 'DRAGON')
  const baron = monsters.find((e) => e.monsterType === 'BARON_NASHOR')
  const heralds = monsters.filter((e) => e.monsterType === 'RIFTHERALD')

  const towers = buildings.filter((e) => e.buildingType === 'TOWER_BUILDING')
  const inhibitors = buildings.filter((e) => e.buildingType === 'INHIBITOR_BUILDING')

  // Gold / XP par équipe (participants 1-5 = team 100, 6-10 = team 200)
  const goldByTeam = { 100: [], 200: [] }
  const xpByTeam = { 100: [], 200: [] }
  for (const frame of frames) {
    const pf = frame.participantFrames || {}
    let g100 = 0
    let g200 = 0
    let x100 = 0
    let x200 = 0
    for (let i = 1; i <= 10; i++) {
      const p = pf[String(i)]
      if (p) {
        const gold = p.totalGold ?? 0
        const xp = p.xp ?? 0
        if (i <= 5) {
          g100 += gold
          x100 += xp
        } else {
          g200 += gold
          x200 += xp
        }
      }
    }
    goldByTeam[100].push({ timestamp: frame.timestamp, total: g100 })
    goldByTeam[200].push({ timestamp: frame.timestamp, total: g200 })
    xpByTeam[100].push({ timestamp: frame.timestamp, total: x100 })
    xpByTeam[200].push({ timestamp: frame.timestamp, total: x200 })
  }

  const summary = {
    durationMs,
    durationMin,
    frameCount: frames.length,
    eventCount: events.length,
    kills: kills.length,
    dragons: dragons.length,
    dragonTypes: [...new Set(dragons.map((d) => d.monsterSubType || d.monsterType))],
    baron: baron ? { at: baron.timeMin, killerId: baron.killerId } : null,
    heralds: heralds.length,
    towers: towers.length,
    inhibitors: inhibitors.length,
    killsByParticipant: countBy(kills, 'killerId'),
    deathsByParticipant: countBy(kills, 'victimId'),
    assistsByParticipant: countAssists(kills),
    monsterKillsByParticipant: countBy(monsters, 'killerId'),
    participantSnapshots,
    goldByTeam,
    xpByTeam,
    events,
    dragonsList: dragons.map((d) => ({
      timeMin: d.timeMin,
      subType: d.monsterSubType || d.monsterType,
      killerId: d.killerId,
      label:
        MONSTER_LABELS[d.monsterSubType] ||
        MONSTER_LABELS[d.monsterType] ||
        d.monsterSubType ||
        d.monsterType,
    })),
    towersList: towers.map((t) => ({
      timeMin: t.timeMin,
      lane: t.laneType,
      towerType: t.towerType,
      teamId: t.teamId,
      killerId: t.killerId,
      label: `${t.laneType || ''} ${TOWER_LABELS[t.towerType] || t.towerType}`.trim(),
    })),
  }

  if (gameId != null) {
    ;(summary as Record<string, unknown>).gameId = gameId
  }

  return {
    frames,
    summary,
    gameId,
    raw: data,
  }
}

function countBy(events, key) {
  const m = {}
  for (const e of events) {
    const id = e[key]
    if (id != null && id !== 0) {
      const k = String(id)
      m[k] = (m[k] || 0) + 1
    }
  }
  return m
}

function countAssists(kills) {
  const m = {}
  for (const e of kills) {
    const ids = e.assistingParticipantIds || []
    for (const id of ids) {
      const k = String(id)
      m[k] = (m[k] || 0) + 1
    }
  }
  return m
}

/**
 * Retourne les totaux or/XP par équipe + par participant aux minutes demandées.
 * Stocké en base pour "Stats timeline" : avantages par joueur + global équipe.
 * @param {Object} parsed - Résultat de parseTimeline()
 * @param {number[]} minutes - [5, 10, 15, 20, 25]
 * @returns {Object} - { "5": { gold_100, gold_200, xp_100, xp_200, participants: { "1": { gold, xp, cs }, ... } }, ... }
 */
export function getSnapshotsAtMinutes(parsed, minutes = [5, 10, 15, 20, 25]) {
  if (!parsed?.frames?.length) return {}
  const frames = parsed.frames
  const snapshot = {}
  for (const min of minutes) {
    const targetMs = min * 60 * 1000
    let best = null
    let bestDiff = Infinity
    for (const frame of frames) {
      const ts = frame.timestamp ?? 0
      const d = Math.abs(ts - targetMs)
      if (d <= bestDiff) {
        bestDiff = d
        best = frame
      }
      if (ts > targetMs + 60000) break
    }
    if (!best?.participantFrames) continue
    const pf = best.participantFrames
    let gold_100 = 0
    let gold_200 = 0
    let xp_100 = 0
    let xp_200 = 0
    const participants = {}
    for (let i = 1; i <= 10; i++) {
      const p = pf[String(i)]
      const g = p?.totalGold ?? 0
      const x = p?.xp ?? 0
      const minions = p?.minionsKilled ?? 0
      const jungle = p?.jungleMinionsKilled ?? 0
      const cs = minions + jungle
      if (i <= 5) {
        gold_100 += g
        xp_100 += x
      } else {
        gold_200 += g
        xp_200 += x
      }
      participants[String(i)] = { gold: g, xp: x, cs: minions + jungle, minions, jungle }
    }
    snapshot[String(min)] = { gold_100, gold_200, xp_100, xp_200, participants }
  }
  return snapshot
}

/**
 * Retourne un résumé lisible pour la démo (stats principales)
 */
export function getTimelineDemoSummary(parsed) {
  if (!parsed?.summary) return null
  const s = parsed.summary
  return {
    gameId: parsed.gameId ?? s.gameId ?? null,
    duree: `${s.durationMin} min`,
    frames: s.frameCount,
    evenements: s.eventCount,
    kills: s.kills,
    dragons: s.dragons,
    typesDragons: s.dragonTypes?.join(', ') || '—',
    baron: s.baron ? `Oui (${s.baron.at} min, joueur ${s.baron.killerId})` : 'Non',
    heralds: s.heralds,
    tours: s.towers,
    inhibs: s.inhibitors,
    killsParJoueur: s.killsByParticipant,
    mortsParJoueur: s.deathsByParticipant,
    objectifsDragons: s.dragonsList?.slice(0, 10) || [],
    toursDetruites: s.towersList?.slice(0, 15) || [],
  }
}

export { MONSTER_LABELS, TOWER_LABELS, EVENT_TYPES }
