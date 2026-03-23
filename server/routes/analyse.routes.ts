/**
 * Routes d'analyse SoloQ — appels Claude API (côté serveur uniquement)
 * POST /api/analyse/soloq/analyse  → analyse patterns victoires/défaites
 * POST /api/analyse/soloq/rapport  → plan d'entraînement coaching
 */
import { Router, type Request, type Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types partagés ────────────────────────────────────────────────────────────

interface SplitStats {
  games: number
  winRate: number
  avgKDA: number
  avgDeaths: number
  avgCsPerMin: number | null
  avgVision: number | null
  avgDamage: number | null
  avgGold: number | null
}

interface ChampionStat {
  name: string
  games: number
  winRate: number
  kda: number
  avgCs: number | null
}

interface AnalysePayload {
  player: { name: string; position?: string; rank?: string }
  period: { from: string; to: string; games: number }
  global: {
    winRate: number
    kda: number
    avgKills: number
    avgDeaths: number
    avgAssists: number
    avgCsPerMin: number | null
    avgVision: number | null
    avgDamage: number | null
    avgGold: number | null
  }
  wins: SplitStats
  losses: SplitStats
  champions: ChampionStat[]
  selectedAxes: string[]
}

// ─── Formatage contexte commun ─────────────────────────────────────────────────

function buildContext(p: AnalysePayload): string {
  const f = (n: number | null, d = 1) => n != null ? n.toFixed(d) : 'N/A'
  const pct = (n: number) => `${Math.round(n * 100)}%`

  const champLines = p.champions.slice(0, 8).map(c =>
    `  - ${c.name}: ${c.games}G · WR ${pct(c.winRate)} · KDA ${c.kda.toFixed(1)}${c.avgCs != null ? ` · ${c.avgCs.toFixed(0)} CS moy` : ''}`
  ).join('\n')

  return `
Joueur: ${p.player.name}${p.player.position ? ` (${p.player.position})` : ''}${p.player.rank ? ` — ${p.player.rank}` : ''}
Période: ${p.period.from} → ${p.period.to} · ${p.period.games} parties analysées

STATISTIQUES GLOBALES
  Winrate: ${pct(p.global.winRate)} (${p.wins.games}V / ${p.losses.games}D)
  KDA: ${f(p.global.kda)} (${f(p.global.avgKills)} / ${f(p.global.avgDeaths)} / ${f(p.global.avgAssists)})
  CS/min: ${f(p.global.avgCsPerMin)}
  Vision score: ${f(p.global.avgVision, 0)}
  Dégâts/partie: ${p.global.avgDamage != null ? Math.round(p.global.avgDamage).toLocaleString() : 'N/A'}
  Or/partie: ${p.global.avgGold != null ? Math.round(p.global.avgGold).toLocaleString() : 'N/A'}

STATS EN VICTOIRE (${p.wins.games} parties)
  KDA: ${f(p.wins.avgKDA)}
  Morts moy: ${f(p.wins.avgDeaths)}
  CS/min: ${f(p.wins.avgCsPerMin)}
  Vision: ${f(p.wins.avgVision, 0)}
  Dégâts: ${p.wins.avgDamage != null ? Math.round(p.wins.avgDamage).toLocaleString() : 'N/A'}

STATS EN DÉFAITE (${p.losses.games} parties)
  KDA: ${f(p.losses.avgKDA)}
  Morts moy: ${f(p.losses.avgDeaths)}
  CS/min: ${f(p.losses.avgCsPerMin)}
  Vision: ${f(p.losses.avgVision, 0)}
  Dégâts: ${p.losses.avgDamage != null ? Math.round(p.losses.avgDamage).toLocaleString() : 'N/A'}

CHAMPIONS (triés par nb de parties)
${champLines}

Axes analysés: ${p.selectedAxes.join(', ')}
`.trim()
}

// ─── POST /api/analyse/soloq/analyse ──────────────────────────────────────────

router.post('/soloq/analyse', async (req: Request, res: Response) => {
  const payload = req.body as AnalysePayload

  if (!payload?.player?.name || !payload?.period?.games) {
    res.status(400).json({ error: 'Payload invalide' })
    return
  }

  const context = buildContext(payload)

  const prompt = `Tu es un coach League of Legends expert et analytique. Tu analyses les données SoloQ d'un joueur.

${context}

Génère une analyse approfondie en markdown structuré. Sois direct, précis, base-toi uniquement sur les chiffres fournis.

Structure ta réponse ainsi :

## ✅ Ce qui fonctionne
Identifie les points forts clairs dans les données (compare victoires vs défaites, champions avec bon WR, etc.)

## ❌ Ce qui freine les victoires
Identifie les patterns qui reviennent dans les défaites. Corrélations entre mauvaises stats et défaites.

## 📊 Corrélations clés
2-3 corrélations statistiques importantes entre les métriques (ex: "quand les morts dépassent X, le WR chute à Y%")

## 🎯 Indicateurs à surveiller
Les 3-4 métriques les plus discriminantes pour ce joueur (celles qui varient le plus entre victoires et défaites)

Sois concis, pas plus de 400 mots. Utilise des chiffres précis.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    res.json({ text })
  } catch (err: unknown) {
    console.error('[analyse] Erreur Claude:', err)
    res.status(500).json({ error: 'Erreur API Claude' })
  }
})

// ─── POST /api/analyse/soloq/rapport ──────────────────────────────────────────

router.post('/soloq/rapport', async (req: Request, res: Response) => {
  const payload = req.body as AnalysePayload

  if (!payload?.player?.name || !payload?.period?.games) {
    res.status(400).json({ error: 'Payload invalide' })
    return
  }

  const context = buildContext(payload)

  const prompt = `Tu es un coach League of Legends expert. Tu génères un plan d'entraînement personnalisé.

${context}

Génère un rapport de coaching concret en markdown. Chaque point doit être actionnable immédiatement.

Structure ta réponse ainsi :

## 🥇 Priorité 1 — [Nom du point le plus critique]
**Problème identifié :** [chiffres précis du problème]
**Objectif :** [métrique cible réaliste à atteindre en 2-4 semaines]
**Comment :** [2-3 actions concrètes à mettre en pratique en jeu]

## 🥈 Priorité 2 — [Deuxième point]
[même structure]

## 🥉 Priorité 3 — [Troisième point]
[même structure]

## 📅 Suivi recommandé
[Comment mesurer les progrès, fréquence de réévaluation]

Sois ultra-concret : pas de généralités, des actions précises en jeu. Max 450 mots.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    res.json({ text })
  } catch (err: unknown) {
    console.error('[rapport] Erreur Claude:', err)
    res.status(500).json({ error: 'Erreur API Claude' })
  }
})

export default router
