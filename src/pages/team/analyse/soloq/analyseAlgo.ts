/**
 * Algorithme d'analyse SoloQ — 100% déterministe, zéro IA externe
 * Génère du markdown structuré à partir des stats victoires/défaites
 */

import type { AnalysisResult } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const f1  = (n: number | null) => n != null ? n.toFixed(1) : '—'
const f0  = (n: number | null) => n != null ? Math.round(n).toString() : '—'
const pct = (n: number)        => `${Math.round(n * 100)}%`
const fK  = (n: number | null) => n != null ? (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString()) : '—'

/** Écart relatif (%) de `a` par rapport à `b` */
function relDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null
  return ((a - b) / Math.abs(b)) * 100
}

interface MetricInsight {
  key: string
  label: string
  winsVal: number | null
  lossVal: number | null
  /** + = favorable en victoire / - = problème en défaite */
  score: number
}

function buildInsights(result: AnalysisResult, axes: Set<string>): MetricInsight[] {
  const { winsStats: W, lossesStats: L } = result
  const out: MetricInsight[] = []

  if ((axes.has('trading') || axes.has('deaths')) && W.avgKDA != null && L.avgKDA != null) {
    const d = relDiff(W.avgKDA, L.avgKDA) ?? 0
    out.push({ key: 'kda',    label: 'KDA',       winsVal: W.avgKDA,     lossVal: L.avgKDA,     score: d })
  }
  if (axes.has('deaths')) {
    // Pour les morts : plus en défaite = mauvais → score positif si on meurt plus en défaite
    const d = relDiff(L.avgDeaths, W.avgDeaths) ?? 0
    out.push({ key: 'deaths', label: 'Morts',      winsVal: W.avgDeaths,  lossVal: L.avgDeaths,  score: d })
  }
  if (axes.has('cs') && W.avgCsPerMin != null) {
    const d = relDiff(W.avgCsPerMin, L.avgCsPerMin) ?? 0
    out.push({ key: 'cs',     label: 'CS/min',     winsVal: W.avgCsPerMin, lossVal: L.avgCsPerMin, score: d })
  }
  if (axes.has('vision') && W.avgVision != null) {
    const d = relDiff(W.avgVision, L.avgVision) ?? 0
    out.push({ key: 'vision', label: 'Vision',     winsVal: W.avgVision,  lossVal: L.avgVision,  score: d })
  }
  if ((axes.has('gold') || axes.has('trading')) && W.avgDamage != null) {
    const d = relDiff(W.avgDamage, L.avgDamage) ?? 0
    out.push({ key: 'damage', label: 'Dégâts',     winsVal: W.avgDamage,  lossVal: L.avgDamage,  score: d })
  }
  if (axes.has('gold') && W.avgGold != null) {
    const d = relDiff(W.avgGold, L.avgGold) ?? 0
    out.push({ key: 'gold',   label: 'Or gagné',   winsVal: W.avgGold,    lossVal: L.avgGold,    score: d })
  }

  return out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
}

// ─── ANALYSE ──────────────────────────────────────────────────────────────────

export function computeAnalyse(result: AnalysisResult, axes: Set<string>): string {
  const { winsStats: W, lossesStats: L, champions } = result
  const insights = buildInsights(result, axes)
  const lines: string[] = []

  const nV = W.games
  const nD = L.games

  // ── ✅ Ce qui fonctionne ──────────────────────────────────────────────────
  lines.push('## ✅ Ce qui fonctionne')

  const strengths: string[] = []

  // Winrate
  if (result.winRate >= 0.52) {
    strengths.push(
      `**Winrate positif** : ${pct(result.winRate)} sur ${result.totalGames} parties — le joueur génère plus de victoires que de défaites.`
    )
  }

  // Meilleur insight (le + discriminant côté positif)
  const topPositive = insights.find(i => i.score >= 20)
  if (topPositive) {
    if (topPositive.key === 'kda') {
      strengths.push(
        `**KDA** : ${f1(topPositive.winsVal)} en victoire contre ${f1(topPositive.lossVal)} en défaite — le joueur convertit efficacement ses avantages quand l'équipe est en forme (+${Math.round(topPositive.score)}% d'écart).`
      )
    } else if (topPositive.key === 'damage') {
      strengths.push(
        `**Impact en dégâts** : ${fK(topPositive.winsVal)} en victoire vs ${fK(topPositive.lossVal)} en défaite — le joueur est present dans les fights gagnants.`
      )
    } else if (topPositive.key === 'cs') {
      strengths.push(
        `**Farm en victoire** : ${f1(topPositive.winsVal)} CS/min quand l'équipe gagne — la gestion de lane est solide dans les bonnes conditions.`
      )
    }
  }

  // Meilleur champion (min 3 games, WR ≥ 60%)
  if (axes.has('champion')) {
    const bestChamp = champions.find(c => c.games >= 3 && c.winRate >= 0.6)
    if (bestChamp) {
      strengths.push(
        `**${bestChamp.name}** est le point fort du pool : ${pct(bestChamp.winRate)} WR sur ${bestChamp.games} parties (KDA ${f1(bestChamp.kda)}).`
      )
    }
  }

  // Morts faibles en victoire
  if (axes.has('deaths') && W.avgDeaths != null && W.avgDeaths <= 3) {
    strengths.push(
      `**Survie en victoire** : seulement ${f1(W.avgDeaths)} mort${W.avgDeaths > 1 ? 's' : ''}/partie dans les ${nV} parties gagnées — le joueur sait rester en vie quand l'équipe performe.`
    )
  }

  if (strengths.length === 0) {
    strengths.push('Les données actuelles ne montrent pas de point fort marqué. Élargissez la plage de dates pour plus de signal.')
  }
  lines.push(...strengths)
  lines.push('')

  // ── ❌ Ce qui freine les victoires ────────────────────────────────────────
  lines.push('## ❌ Ce qui freine les victoires')

  const weaknesses: string[] = []

  // Morts trop élevées en défaite
  const deathsI = insights.find(i => i.key === 'deaths')
  if (deathsI && deathsI.lossVal != null && deathsI.lossVal > 4.5) {
    weaknesses.push(
      `**Trop de morts en défaite** : ${f1(deathsI.lossVal)} morts/partie (${nD} parties perdues) vs ${f1(deathsI.winsVal)} en victoire — ${Math.round(deathsI.score)}% d'écart. Les parties défavorables empirent rapidement à cause de morts en surnombre.`
    )
  }

  // CS/min qui chute en défaite
  const csI = insights.find(i => i.key === 'cs')
  if (csI && csI.winsVal != null && csI.lossVal != null && csI.winsVal - csI.lossVal > 0.5) {
    weaknesses.push(
      `**Farm qui s'effondre en défaite** : ${f1(csI.winsVal)} CS/min en victoire vs ${f1(csI.lossVal)} en défaite (−${f1(csI.winsVal - csI.lossVal)} CS/min). Quand le joueur est sous pression, il perd aussi le fil du farm.`
    )
  }

  // KDA très bas en défaite
  const kdaI = insights.find(i => i.key === 'kda')
  if (kdaI && kdaI.lossVal != null && kdaI.lossVal < 1.5) {
    weaknesses.push(
      `**KDA en chute libre lors des défaites** : ${f1(kdaI.lossVal)} seulement — les parties perdues se transforment en snowball adverse. Manque de capacité à limiter les pertes.`
    )
  }

  // Champion avec mauvais WR
  if (axes.has('champion')) {
    const worstChamp = champions.find(c => c.games >= 3 && c.winRate < 0.4)
    if (worstChamp) {
      weaknesses.push(
        `**${worstChamp.name}** génère des défaites : ${pct(worstChamp.winRate)} WR sur ${worstChamp.games} parties (KDA ${f1(worstChamp.kda)}) — à déprioritiser tant que le niveau de maîtrise n'est pas suffisant.`
      )
    }
  }

  // Winrate bas
  if (result.winRate < 0.45) {
    weaknesses.push(
      `**Winrate en territoire négatif** : ${pct(result.winRate)} sur ${result.totalGames} parties — il y a plus de défaites que de victoires sur cette période.`
    )
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Aucun pattern négatif marqué sur cette période. Continuez sur cette lancée.')
  }
  lines.push(...weaknesses)
  lines.push('')

  // ── 📊 Corrélations clés ──────────────────────────────────────────────────
  lines.push('## 📊 Corrélations clés')

  const correlations: string[] = []
  insights.slice(0, 3).forEach(ins => {
    if (Math.abs(ins.score) < 8) return
    if (ins.key === 'kda') {
      correlations.push(`- **KDA → résultat** : ${f1(ins.winsVal)} en victoire / ${f1(ins.lossVal)} en défaite (${Math.round(ins.score)}% d'écart) — forte corrélation avec le résultat.`)
    } else if (ins.key === 'deaths') {
      correlations.push(`- **Morts → défaite** : ${f1(ins.winsVal)} morts en V / ${f1(ins.lossVal)} en D (+${Math.round(ins.score)}%) — indicateur le plus prédictif du résultat final.`)
    } else if (ins.key === 'cs') {
      correlations.push(`- **Farm → résultat** : ${f1(ins.winsVal)} CS/min en V / ${f1(ins.lossVal)} en D — quand le farm chute, la partie est souvent perdue.`)
    } else if (ins.key === 'vision') {
      correlations.push(`- **Vision → résultat** : ${f0(ins.winsVal)} score vision en V / ${f0(ins.lossVal)} en D — maîtrise de la map liée aux victoires.`)
    } else if (ins.key === 'damage') {
      correlations.push(`- **Dégâts → résultat** : ${fK(ins.winsVal)} en V / ${fK(ins.lossVal)} en D — l'impact en dégâts est significativement plus élevé dans les victoires.`)
    }
  })

  if (correlations.length === 0) {
    correlations.push('- Pas assez d\'écart entre victoires et défaites pour établir des corrélations solides. Analysez sur une période plus longue.')
  }
  lines.push(...correlations)
  lines.push('')

  // ── 🎯 Indicateurs à surveiller ──────────────────────────────────────────
  lines.push('## 🎯 Indicateurs à surveiller')

  const topIndicators = insights.filter(i => Math.abs(i.score) >= 10).slice(0, 4)
  if (topIndicators.length === 0) {
    lines.push('- Winrate global : ' + pct(result.winRate) + ' sur ' + result.totalGames + ' parties')
  } else {
    topIndicators.forEach(ins => {
      const ecart = `écart ${Math.round(Math.abs(ins.score))}% V/D`
      if (ins.key === 'deaths') {
        lines.push(`- **Morts/partie** : ${f1(ins.winsVal)} V / ${f1(ins.lossVal)} D — ${ecart}`)
      } else if (ins.key === 'kda') {
        lines.push(`- **KDA** : ${f1(ins.winsVal)} V / ${f1(ins.lossVal)} D — ${ecart}`)
      } else if (ins.key === 'cs') {
        lines.push(`- **CS/min** : ${f1(ins.winsVal)} V / ${f1(ins.lossVal)} D — ${ecart}`)
      } else if (ins.key === 'vision') {
        lines.push(`- **Vision score** : ${f0(ins.winsVal)} V / ${f0(ins.lossVal)} D — ${ecart}`)
      } else if (ins.key === 'damage') {
        lines.push(`- **Dégâts** : ${fK(ins.winsVal)} V / ${fK(ins.lossVal)} D — ${ecart}`)
      } else if (ins.key === 'gold') {
        lines.push(`- **Or gagné** : ${fK(ins.winsVal)} V / ${fK(ins.lossVal)} D — ${ecart}`)
      }
    })
  }

  return lines.join('\n')
}

// ─── RAPPORT ──────────────────────────────────────────────────────────────────

const ACTIONS: Record<string, { title: string; actions: (v: number, l: number) => string[] }> = {
  deaths: {
    title: 'Réduire les morts en difficulté',
    actions: (winsD, lossD) => [
      `Fixe-toi un plafond de **${Math.ceil(lossD - 1)} morts max** par partie cette semaine (actuellement ${f1(lossD)} en défaite).`,
      `Identifie les 2 situations où tu meurs le plus souvent (invade early, team fight, sur-extension) et joue en retrait dans ces scénarios.`,
      `Après chaque mort, pose-toi la question : "Est-ce que je pouvais éviter ça ?" — note mentalement le type de mort.`,
      `Objectif cible : descendre à ${f1(winsD + 0.5)} morts/partie en défaite (niveau actuel en victoire : ${f1(winsD)}).`,
    ],
  },
  cs: {
    title: 'Maintenir le farm sous pression',
    actions: (winsCs, lossCs) => [
      `En custom game, entraîne-toi à farmer 10 min sans capacités — vise ${Math.ceil(winsCs * 10)} CS à 10 min.`,
      `Ne laisse jamais une vague entière se perdre sous tour sans la récupérer — chaque vague = ~6 CS.`,
      `Objectif : remonter à **${f1(lossCs + 0.5)} CS/min en défaite** (actuellement ${f1(lossCs)}, vs ${f1(winsCs)} en victoire).`,
      `Priorité lane : nettoie la vague AVANT de chercher un trade ou d'aider un objectif éloigné.`,
    ],
  },
  kda: {
    title: 'Limiter les pertes en partie défavorable',
    actions: (winsK, lossK) => [
      `Quand tu es en déficit (mort 1 ou 2 fois en early), joue défensif 5 min : pas de trade initié, pas de roam.`,
      `Objectif KDA en défaite : dépasser **${f1(Math.min(winsK * 0.6, lossK * 1.5))}** (actuellement ${f1(lossK)}).`,
      `Priorise ta survie sur les kills quand l'équipe est derrière — un carry vivant vaut plus qu'un trade douteux.`,
      `Regarde tes 3 dernières défaites : combien de morts auraient pu être évitées en jouant plus safe ?`,
    ],
  },
  vision: {
    title: 'Améliorer le contrôle de vision',
    actions: (winsV, lossV) => [
      `Achète systématiquement **1 contrôle ward** à chaque retour en base — même en défaite.`,
      `Place un ward offensif dans le jungle adverse après un gank évité ou un kill en lane.`,
      `Objectif : atteindre **${Math.ceil((winsV ?? 40) * 0.85)} score de vision** minimum (actuellement ${f0(lossV)} en défaite).`,
      `Sweep les wards adverses avant chaque objectif majeur (Dragon, Baron).`,
    ],
  },
  champion: {
    title: 'Optimiser le pool de champions',
    actions: () => [
      `Réduis ton pool à **2-3 champions maximum** que tu maîtrises vraiment bien.`,
      `Joue tes champions à faible WR uniquement en parties personnalisées ou en ranked de faible enjeu.`,
      `Identifie les champions où ton KDA est > 3 — ce sont ceux à prioriser en ranked.`,
      `Avant de pick un champion, vérifie son winrate récent dans ta liste — si < 45%, considère une alternative.`,
    ],
  },
}

export function computeRapport(result: AnalysisResult, axes: Set<string>): string {
  const { champions } = result
  const insights = buildInsights(result, axes)
  const lines: string[] = []

  // ── Identifier les 3 priorités ──────────────────────────────────────────
  interface Priority {
    key: string
    severity: number
    problem: string
    target: string
    winsVal: number | null
    lossVal: number | null
  }

  const priorities: Priority[] = []

  // Morts
  const deathsI = insights.find(i => i.key === 'deaths')
  if (axes.has('deaths') && deathsI && deathsI.lossVal != null) {
    const severity = deathsI.lossVal > 6 ? 3 : deathsI.lossVal > 4.5 ? 2 : 1
    priorities.push({
      key: 'deaths',
      severity: severity * (deathsI.score / 10),
      problem: `${f1(deathsI.lossVal)} morts/partie en défaite (vs ${f1(deathsI.winsVal)} en victoire, +${Math.round(deathsI.score)}% d'écart)`,
      target: `Descendre à **${f1((deathsI.winsVal ?? 3) + 0.5)} morts/partie** en défaite d'ici 2 semaines`,
      winsVal: deathsI.winsVal,
      lossVal: deathsI.lossVal,
    })
  }

  // CS/min
  const csI = insights.find(i => i.key === 'cs')
  if (axes.has('cs') && csI && csI.winsVal != null && csI.lossVal != null && csI.winsVal - csI.lossVal > 0.4) {
    priorities.push({
      key: 'cs',
      severity: csI.score * 0.8,
      problem: `Farm chute à ${f1(csI.lossVal)} CS/min en défaite (vs ${f1(csI.winsVal)} en victoire — −${f1(csI.winsVal - csI.lossVal)} CS/min)`,
      target: `Monter à **${f1(csI.lossVal + 0.6)} CS/min** même sous pression d'ici 3 semaines`,
      winsVal: csI.winsVal,
      lossVal: csI.lossVal,
    })
  }

  // KDA en défaite
  const kdaI = insights.find(i => i.key === 'kda')
  if ((axes.has('trading') || axes.has('deaths')) && kdaI && kdaI.lossVal != null && kdaI.lossVal < 2) {
    priorities.push({
      key: 'kda',
      severity: kdaI.score * 0.7,
      problem: `KDA de ${f1(kdaI.lossVal)} en défaite — les parties perdues virent au désastre`,
      target: `Remonter à **${f1(Math.min((kdaI.lossVal ?? 1) * 1.5, (kdaI.winsVal ?? 4) * 0.6))} KDA** en défaite`,
      winsVal: kdaI.winsVal,
      lossVal: kdaI.lossVal,
    })
  }

  // Vision
  const visI = insights.find(i => i.key === 'vision')
  if (axes.has('vision') && visI && visI.lossVal != null && visI.score > 15) {
    priorities.push({
      key: 'vision',
      severity: visI.score * 0.6,
      problem: `Score de vision à ${f0(visI.lossVal)} en défaite (vs ${f0(visI.winsVal)} en victoire)`,
      target: `Atteindre **${Math.ceil((visI.winsVal ?? 40) * 0.85)} de score de vision** systématiquement`,
      winsVal: visI.winsVal,
      lossVal: visI.lossVal,
    })
  }

  // Champion pool
  if (axes.has('champion')) {
    const worstChamp = champions.find(c => c.games >= 3 && c.winRate < 0.4)
    const poolSize = champions.filter(c => c.games >= 2).length
    if (worstChamp || poolSize > 5) {
      priorities.push({
        key: 'champion',
        severity: 15,
        problem: worstChamp
          ? `${worstChamp.name} à ${pct(worstChamp.winRate)} WR sur ${worstChamp.games} parties — drag sur le winrate global`
          : `Pool de ${poolSize} champions actifs — trop dilué pour être efficace`,
        target: 'Recentrer le pool sur 2-3 champions maîtrisés',
        winsVal: null,
        lossVal: null,
      })
    }
  }

  // Trier par sévérité
  priorities.sort((a, b) => Math.abs(b.severity) - Math.abs(a.severity))
  const top3 = priorities.slice(0, 3)

  // Si pas assez de priorités claires
  if (top3.length === 0) {
    return [
      '## 📋 Rapport de coaching',
      '',
      'Les stats sur cette période ne montrent pas de faiblesse majeure à corriger. Deux recommandations générales :',
      '',
      '- **Augmente la période analysée** (30 jours ou la saison complète) pour un signal plus fiable.',
      '- **Ajoute plus d\'axes** dans la configuration pour avoir plus de métriques comparées.',
    ].join('\n')
  }

  const medals = ['🥇', '🥈', '🥉']

  top3.forEach((p, i) => {
    const actionDef = ACTIONS[p.key]
    const actionsText = actionDef
      ? actionDef.actions(p.winsVal ?? 3, p.lossVal ?? 5)
      : ['Travaille ce point spécifiquement en analysant les replays de tes défaites.']

    lines.push(`## ${medals[i]} Priorité ${i + 1} — ${actionDef?.title ?? p.key}`)
    lines.push(`**Problème identifié :** ${p.problem}`)
    lines.push(`**Objectif :** ${p.target}`)
    lines.push('**Comment :**')
    actionsText.forEach(a => lines.push(`- ${a}`))
    lines.push('')
  })

  // ── 📅 Suivi ──────────────────────────────────────────────────────────────
  lines.push('## 📅 Suivi recommandé')
  lines.push(`- **Chaque session** : note mentalement si tu as atteint l'objectif de la priorité 1.`)
  lines.push(`- **Après 20 parties** : relance cette analyse sur la même période pour mesurer la progression.`)
  lines.push(`- **Indicateur de progrès** : focus sur 1 seule priorité à la fois — ne cherche pas à tout corriger simultanément.`)

  return lines.join('\n')
}
