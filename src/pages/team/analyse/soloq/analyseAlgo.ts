/**
 * Algorithme d'analyse SoloQ — 100% déterministe, zéro IA externe
 * Génère du markdown structuré à partir des stats victoires/défaites
 */
import type { AnalysisResult, SplitStats } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const f1  = (n: number | null) => n != null ? n.toFixed(1) : '—'
const f0  = (n: number | null) => n != null ? Math.round(n).toString() : '—'
const pct = (n: number)        => `${Math.round(n * 100)}%`
const fK  = (n: number | null) => n != null ? (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString()) : '—'
const fMin = (sec: number | null) => {
  if (sec == null) return '—'
  return `${Math.floor(sec / 60)}m${Math.round(sec % 60).toString().padStart(2, '0')}s`
}

function relDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null
  return ((a - b) / Math.abs(b)) * 100
}

// ─── Insights par métrique ────────────────────────────────────────────────────

interface MetricInsight {
  key: string
  label: string
  winsVal: number | null
  lossVal: number | null
  /** Magnitude de l'écart V/D — toujours positif, plus grand = plus discriminant */
  magnitude: number
  /** true = plus élevé en victoire est mieux, false = plus bas est mieux (morts) */
  higherIsBetter: boolean
  /** true = significativement meilleur en victoire */
  favorableInWins: boolean
}

function buildInsights(result: AnalysisResult, axes: Set<string>): MetricInsight[] {
  const W = result.winsStats
  const L = result.lossesStats
  const out: MetricInsight[] = []

  const add = (
    key: string, label: string,
    wVal: number | null, lVal: number | null,
    higherIsBetter: boolean, requiredAxis: string | null = null
  ) => {
    if (requiredAxis && !axes.has(requiredAxis)) return
    const d = relDiff(wVal, lVal)
    if (d == null) return
    // Pour les métriques "lower is better" (morts), l'écart favorable = moins en victoire
    const magnitude = Math.abs(d)
    const favorableInWins = higherIsBetter ? d > 0 : d < 0
    out.push({ key, label, winsVal: wVal, lossVal: lVal, magnitude, higherIsBetter, favorableInWins })
  }

  add('kda',         'KDA',             W.avgKDA,         L.avgKDA,         true,  null)
  add('deaths',      'Morts/partie',    W.avgDeaths,      L.avgDeaths,      false, 'deaths')
  add('cs',          'CS/min',          W.avgCsPerMin,    L.avgCsPerMin,    true,  'cs')
  add('vision',      'Vision score',    W.avgVision,      L.avgVision,      true,  'vision')
  add('visionMin',   'Vision/min',      W.avgVisionPerMin,L.avgVisionPerMin,true,  'vision')
  add('damage',      'Dégâts/partie',   W.avgDamage,      L.avgDamage,      true,  'trading')
  add('dmgPerMin',   'Dégâts/min',      W.avgDmgPerMin,   L.avgDmgPerMin,   true,  'trading')
  add('gold',        'Or/partie',       W.avgGold,        L.avgGold,        true,  'gold')
  add('goldPerMin',  'Or/min',          W.avgGoldPerMin,  L.avgGoldPerMin,  true,  'gold')
  add('gameDur',     'Durée moyenne',   W.avgGameDuration,L.avgGameDuration,null!,  null)

  return out.sort((a, b) => b.magnitude - a.magnitude)
}

// ─── Texte contexte durée ─────────────────────────────────────────────────────

function durationContext(W: SplitStats, L: SplitStats): string | null {
  if (W.avgGameDuration == null || L.avgGameDuration == null) return null
  const diff = L.avgGameDuration - W.avgGameDuration
  if (Math.abs(diff) < 120) return null // < 2 min d'écart → pas significatif
  if (diff > 0) {
    return `Les défaites durent en moyenne **${fMin(diff)} de plus** que les victoires (${fMin(W.avgGameDuration)} V / ${fMin(L.avgGameDuration)} D) — les parties perdues s'éternisent.`
  }
  return `Les victoires durent plus longtemps que les défaites (${fMin(W.avgGameDuration)} V / ${fMin(L.avgGameDuration)} D) — le joueur close bien les parties gagnées.`
}

// ─── ANALYSE ──────────────────────────────────────────────────────────────────

export function computeAnalyse(result: AnalysisResult, axes: Set<string>): string {
  const W = result.winsStats
  const L = result.lossesStats
  const { champions } = result
  const insights = buildInsights(result, axes)
  const lines: string[] = []
  const nV = W.games
  const nD = L.games

  // ── 📈 Points forts (en victoire) ──────────────────────────────────────────
  lines.push('## ✅ Points forts')

  const strengths: string[] = []

  if (result.winRate >= 0.55) {
    strengths.push(`**Winrate solide** : ${pct(result.winRate)} sur ${result.totalGames} parties — le joueur génère clairement plus de victoires que de défaites.`)
  } else if (result.winRate >= 0.50) {
    strengths.push(`**Winrate légèrement positif** : ${pct(result.winRate)} sur ${result.totalGames} parties — la marge est là mais reste à consolider.`)
  }

  // Ce qui est nettement meilleur en victoire
  const topFavorable = insights.filter(i => i.favorableInWins && i.magnitude >= 15).slice(0, 3)
  topFavorable.forEach(ins => {
    if (ins.key === 'kda')
      strengths.push(`**KDA** : ${f1(ins.winsVal)} en victoire vs ${f1(ins.lossVal)} en défaite (+${Math.round(ins.magnitude)}%) — le joueur convertit efficacement ses avantages quand l'équipe est en forme.`)
    else if (ins.key === 'damage' || ins.key === 'dmgPerMin')
      strengths.push(`**Impact en dégâts** : ${fK(W.avgDmgPerMin)} dégâts/min en victoire vs ${fK(L.avgDmgPerMin)} en défaite — le joueur est présent et actif dans les fights qui comptent.`)
    else if (ins.key === 'cs')
      strengths.push(`**Farm en victoire** : ${f1(W.avgCsPerMin)} CS/min — la gestion de lane est solide dans les conditions favorables.`)
    else if (ins.key === 'vision' || ins.key === 'visionMin')
      strengths.push(`**Vision en victoire** : ${f0(W.avgVision)} score vision en victoire — bonne maîtrise de la carte quand l'équipe est en avance.`)
  })

  // Morts basses en victoire
  if (axes.has('deaths') && W.avgDeaths != null && W.avgDeaths <= 3.0) {
    strengths.push(`**Survie en victoire** : seulement ${f1(W.avgDeaths)} mort${W.avgDeaths >= 2 ? 's' : ''}/partie dans les ${nV} parties gagnées — le joueur sait rester en vie quand l'équipe performe.`)
  }

  // Meilleur champion
  if (axes.has('champion')) {
    const bestChamp = champions.find(c => c.games >= 3 && c.winRate >= 0.62)
    if (bestChamp) {
      strengths.push(`**${bestChamp.name}** est le point fort du pool : ${pct(bestChamp.winRate)} WR sur ${bestChamp.games} parties (KDA ${f1(bestChamp.kda)}).`)
    }
  }

  if (strengths.length === 0)
    strengths.push('Peu de points forts marqués sur cette période — élargissez la plage de dates pour plus de signal.')
  lines.push(...strengths)
  lines.push('')

  // ── 💪 Ce que le joueur maintient même en défaite ──────────────────────────
  const resiliences: string[] = []

  if (L.avgDeaths != null && L.avgDeaths <= 4.5 && axes.has('deaths'))
    resiliences.push(`**Morts contenues même en défaite** : ${f1(L.avgDeaths)} morts/partie dans les défaites — le joueur ne "tilt" pas et évite le snowball adverse excessif.`)
  if (L.avgCsPerMin != null && L.avgCsPerMin >= 7.0 && axes.has('cs'))
    resiliences.push(`**Farm maintenu en difficulté** : ${f1(L.avgCsPerMin)} CS/min même dans les ${nD} défaites — discipline de lane présente même sous pression.`)
  if (L.avgVision != null && L.avgVision >= 35 && axes.has('vision'))
    resiliences.push(`**Vision maintenue** : ${f0(L.avgVision)} score vision même en défaite — effort de contrôle de carte constant.`)
  if (L.avgDmgPerMin != null && W.avgDmgPerMin != null && L.avgDmgPerMin >= W.avgDmgPerMin * 0.75 && axes.has('trading'))
    resiliences.push(`**Dégâts consistants** : ${fK(L.avgDmgPerMin)} dégâts/min en défaite (vs ${fK(W.avgDmgPerMin)} en victoire) — le joueur continue à jouer même en mauvaise posture.`)

  if (resiliences.length > 0) {
    lines.push('## 💪 Résistance sous pression')
    lines.push(...resiliences)
    lines.push('')
  }

  // ── ❌ Ce qui freine les victoires ────────────────────────────────────────
  lines.push('## ❌ Ce qui freine les victoires')
  const weaknesses: string[] = []

  // Morts
  const deathsI = insights.find(i => i.key === 'deaths')
  if (deathsI && L.avgDeaths != null && L.avgDeaths > 4.5 && axes.has('deaths')) {
    weaknesses.push(
      `**Morts excessives en défaite** : ${f1(L.avgDeaths)} morts/partie (${nD} défaites) vs ${f1(W.avgDeaths)} en victoire — +${Math.round(deathsI.magnitude)}% d'écart. Chaque mort amplifie le snowball adverse.`
    )
  }

  // CS drop
  const csI = insights.find(i => i.key === 'cs')
  if (csI && W.avgCsPerMin != null && L.avgCsPerMin != null && W.avgCsPerMin - L.avgCsPerMin > 0.5 && axes.has('cs')) {
    weaknesses.push(
      `**Farm en chute libre en défaite** : ${f1(W.avgCsPerMin)} CS/min en victoire vs ${f1(L.avgCsPerMin)} en défaite (−${f1(W.avgCsPerMin - L.avgCsPerMin)} CS/min). Sous pression, la discipline de farm disparaît.`
    )
  }

  // KDA très bas en défaite
  const kdaI = insights.find(i => i.key === 'kda')
  if (kdaI && L.avgKDA != null && L.avgKDA < 1.8) {
    weaknesses.push(
      `**KDA effondré en défaite** : ${f1(L.avgKDA)} — les parties perdues se transforment en désastre. Manque de capacité à limiter les pertes.`
    )
  }

  // Vision basse en défaite
  const visI = insights.find(i => i.key === 'vision')
  if (visI && L.avgVision != null && L.avgVision < 30 && axes.has('vision')) {
    weaknesses.push(
      `**Vision insuffisante en défaite** : ${f0(L.avgVision)} score vision — quand l'équipe est derrière, l'effort de vision s'effondre exactement quand il est le plus nécessaire.`
    )
  }

  // Dégâts en défaite
  const dmgI = insights.find(i => i.key === 'dmgPerMin')
  if (dmgI && L.avgDmgPerMin != null && W.avgDmgPerMin != null && dmgI.magnitude > 25 && axes.has('trading')) {
    weaknesses.push(
      `**Implication réduite en défaite** : ${fK(W.avgDmgPerMin)} dégâts/min en victoire vs ${fK(L.avgDmgPerMin)} en défaite (−${Math.round(dmgI.magnitude)}%) — le joueur disparaît des fights quand l'équipe est derrière.`
    )
  }

  // Durée des parties
  const durCtx = durationContext(W, L)
  if (durCtx) weaknesses.push(durCtx)

  // Champion problématique
  if (axes.has('champion')) {
    const worstChamp = champions.find(c => c.games >= 3 && c.winRate < 0.4)
    if (worstChamp) {
      weaknesses.push(
        `**${worstChamp.name}** génère des défaites : ${pct(worstChamp.winRate)} WR sur ${worstChamp.games} parties (KDA ${f1(worstChamp.kda)}) — champion à déprioritiser en ranked.`
      )
    }
  }

  if (result.winRate < 0.45)
    weaknesses.push(`**Winrate négatif** : ${pct(result.winRate)} sur ${result.totalGames} parties — plus de défaites que de victoires sur cette période.`)

  if (weaknesses.length === 0)
    weaknesses.push('Aucun pattern négatif marqué sur cette période. Continuez sur cette lancée.')
  lines.push(...weaknesses)
  lines.push('')

  // ── 📊 Corrélations V/D ───────────────────────────────────────────────────
  lines.push('## 📊 Corrélations Victoires / Défaites')

  // Top 4 insights les plus discriminants
  const topInsights = insights.slice(0, 5).filter(i => i.magnitude >= 8)

  // Déduplique (cs et csMin par ex.)
  const seen = new Set<string>()
  const dedupedInsights = topInsights.filter(i => {
    const base = i.key.replace('PerMin', '').replace('Min', '')
    if (seen.has(base)) return false
    seen.add(base)
    return true
  })

  if (dedupedInsights.length === 0) {
    lines.push('- Pas assez d\'écart entre victoires et défaites — analysez sur une période plus longue.')
  } else {
    dedupedInsights.slice(0, 4).forEach(ins => {
      const arrow = ins.favorableInWins ? '📈' : '📉'
      const wLabel = ins.higherIsBetter ? `${f1(ins.winsVal)} V` : `${f1(ins.winsVal)} V`
      const lLabel = `${f1(ins.lossVal)} D`
      lines.push(`- ${arrow} **${ins.label}** : ${wLabel} / ${lLabel} — écart de **${Math.round(ins.magnitude)}%** entre victoires et défaites`)
    })
  }
  lines.push('')

  // ── 🏆 Champions ──────────────────────────────────────────────────────────
  if (axes.has('champion') && champions.length > 0) {
    lines.push('## 🏆 Pool de champions')

    const core     = champions.filter(c => c.games >= 4)
    const rising   = champions.filter(c => c.games >= 2 && c.games < 4 && c.winRate >= 0.5)
    const problems = champions.filter(c => c.games >= 3 && c.winRate < 0.4)

    if (core.length > 0) {
      const best = core.sort((a, b) => b.winRate - a.winRate)[0]
      const worst = core.sort((a, b) => a.winRate - b.winRate)[0]
      if (best.name !== worst.name) {
        lines.push(`**Champions principaux (${core.length})** — meilleur : **${best.name}** (${pct(best.winRate)} WR, ${best.games}G) · plus faible : **${worst.name}** (${pct(worst.winRate)} WR, ${worst.games}G)`)
      } else {
        lines.push(`**Champion principal** : **${best.name}** (${pct(best.winRate)} WR, ${best.games} parties, KDA ${f1(best.kda)})`)
      }
    }
    if (rising.length > 0)
      lines.push(`**Montants** : ${rising.map(c => `${c.name} (${pct(c.winRate)} WR)`).join(', ')} — prometteurs mais peu de données.`)
    if (problems.length > 0)
      lines.push(`**Problématiques** : ${problems.map(c => `${c.name} (${pct(c.winRate)} WR sur ${c.games}G)`).join(', ')} — à éviter en ranked.`)

    // Taille du pool
    const activePicks = champions.filter(c => c.games >= 2).length
    if (activePicks > 5)
      lines.push(`Pool étendu (${activePicks} champions actifs) — concentration recommandée sur 3 picks maximum.`)
    else if (activePicks <= 2)
      lines.push(`Pool très concentré (${activePicks} picks actifs) — bien si WR élevé, risqué si l'adversaire te counter-pick systématiquement.`)
  }

  return lines.join('\n')
}

// ─── RAPPORT ──────────────────────────────────────────────────────────────────

interface PriorityDef {
  key: string
  severity: number
  title: string
  problem: string
  target: string
  actions: string[]
}

export function computeRapport(result: AnalysisResult, axes: Set<string>): string {
  const W = result.winsStats
  const L = result.lossesStats
  const { champions } = result
  const insights = buildInsights(result, axes)
  const lines: string[] = []

  const priorities: PriorityDef[] = []

  // ── Priorité : Morts ──────────────────────────────────────────────────────
  const deathsI = insights.find(i => i.key === 'deaths')
  if (axes.has('deaths') && deathsI && L.avgDeaths != null && L.avgDeaths > 4) {
    const target = Math.max((W.avgDeaths ?? 3) + 0.5, L.avgDeaths - 1.5)
    priorities.push({
      key: 'deaths',
      severity: deathsI.magnitude * (L.avgDeaths > 6 ? 1.5 : 1),
      title: 'Réduire les morts en situation défavorable',
      problem: `${f1(L.avgDeaths)} morts/partie en défaite (vs ${f1(W.avgDeaths)} en victoire — +${Math.round(deathsI.magnitude)}% d'écart)`,
      target: `Descendre sous **${f1(target)} morts/partie** même en défaite d'ici 20 parties`,
      actions: [
        `Identifie tes 2 "situations à risque" récurrentes (trade 1v1 perdu, invade adverse, sur-extension) — joue en retrait dans ces scénarios uniquement.`,
        `Après chaque mort, catégorise-la mentalement : "évitable" ou "inévitable". Vise à éliminer les morts "évitables".`,
        `Quand tu es down 1-2 morts en early, adopte un mode défensif 5 minutes : cs propres, pas de trades initiés.`,
        `Objectif concret : si tu as déjà ${Math.ceil(L.avgDeaths - 0.5)} morts à 20 min, joue ultra-safe le reste de la partie.`,
      ],
    })
  }

  // ── Priorité : Farm en défaite ────────────────────────────────────────────
  const csI = insights.find(i => i.key === 'cs')
  if (axes.has('cs') && csI && W.avgCsPerMin != null && L.avgCsPerMin != null && csI.magnitude > 8) {
    const target = L.avgCsPerMin + (W.avgCsPerMin - L.avgCsPerMin) * 0.5
    priorities.push({
      key: 'cs',
      severity: csI.magnitude * 0.9,
      title: 'Maintenir le farm sous pression',
      problem: `CS/min chute à ${f1(L.avgCsPerMin)} en défaite (vs ${f1(W.avgCsPerMin)} en victoire — −${f1(W.avgCsPerMin - L.avgCsPerMin)} CS/min)`,
      target: `Atteindre **${f1(target)} CS/min** même dans les parties défavorables`,
      actions: [
        `La règle des vagues : clear chaque vague AVANT de roam ou d'aider. Une vague = ~6 CS ≈ 1 kill de gold.`,
        `En custom game : 10 min de CS solo sans capacités, vise ${Math.ceil((L.avgCsPerMin + 1) * 10)} CS à 10 min.`,
        `Quand tu meurs, ne respawn pas en mode "je cherche le fight" — retourne farm la vague qui s'accumule.`,
        `Si tu es derrière, le farm est ta priorité absolue sur les objectives : un carry pauvre ne gagne pas le jeu.`,
      ],
    })
  }

  // ── Priorité : KDA en défaite ─────────────────────────────────────────────
  if ((axes.has('trading') || axes.has('deaths')) && L.avgKDA != null && L.avgKDA < 2.0) {
    const kdaI = insights.find(i => i.key === 'kda')
    priorities.push({
      key: 'kda',
      severity: (kdaI?.magnitude ?? 30) * 0.8,
      title: 'Limiter les défaites en cascade',
      problem: `KDA de ${f1(L.avgKDA)} en défaite — les parties perdues se transforment en snowball incontrôlable`,
      target: `Remonter à **${f1(Math.min((W.avgKDA ?? 4) * 0.55, 2.5))} KDA** minimum en défaite`,
      actions: [
        `Si tu es derrière, ta valeur principale est de rester en vie — un carry sur le terrain vaut plus qu'un mort qui a "essayé".`,
        `Avoid les 1v2 défensifs : si 2 ennemis te chase, run — ne trade pas en position désavantageuse.`,
        `En team fight perdant, positionne-toi en retrait et cleanup — ne plonge pas en premier.`,
        `Quand le score est défavorable, joue pour "perdre lentement" : chaque minute gagnée = plus de chances de remonter.`,
      ],
    })
  }

  // ── Priorité : Vision ─────────────────────────────────────────────────────
  const visI = insights.find(i => i.key === 'vision' || i.key === 'visionMin')
  if (axes.has('vision') && visI && visI.magnitude > 15) {
    const target = Math.ceil((W.avgVision ?? 45) * 0.85)
    priorities.push({
      key: 'vision',
      severity: visI.magnitude * 0.65,
      title: 'Contrôle de vision constant',
      problem: `Score vision à ${f0(L.avgVision)} en défaite vs ${f0(W.avgVision)} en victoire (−${Math.round(visI.magnitude)}%)`,
      target: `Atteindre **${target} score de vision** minimum, même dans les parties difficiles`,
      actions: [
        `À chaque retour en base : achète **1 contrôle ward** systématiquement, sans exception.`,
        `Place un ward offensif en zone jungle adverse après chaque sécurisation d'objectif ou kill.`,
        `Avant Dragon/Baron : sweep la zone avec un pink ward, pose 2 wards défensifs.`,
        `Règle simple : si tu n'as pas de ward à placer depuis 3 minutes, tu meurs à l'aveugle.`,
      ],
    })
  }

  // ── Priorité : Dégâts en défaite ──────────────────────────────────────────
  const dmgI = insights.find(i => i.key === 'dmgPerMin')
  if (axes.has('trading') && dmgI && dmgI.magnitude > 25 && L.avgDmgPerMin != null) {
    priorities.push({
      key: 'damage',
      severity: dmgI.magnitude * 0.6,
      title: 'Rester impactant même en position défavorable',
      problem: `Dégâts chutent à ${fK(L.avgDmgPerMin)}/min en défaite vs ${fK(W.avgDmgPerMin)}/min en victoire (−${Math.round(dmgI.magnitude)}%)`,
      target: `Maintenir **${fK(Math.round((L.avgDmgPerMin ?? 500) * 1.2))}/min** même en défaite`,
      actions: [
        `Les dégâts révèlent l'implication : si tu ne deals pas, tu n'existes pas en teamfight.`,
        `Identifie les situations où tu "disparais" : après une mort, dans les mauvais team fights, dans les sieges défensifs.`,
        `Même derrière, cherche les trades défensifs gagnants — les dégâts forcent l'adversaire à reculer.`,
        `Si tu joues carry, tu dois dealer même en mourant — un 0/3 avec 15k dégâts est plus utile qu'un 0/1 avec 4k.`,
      ],
    })
  }

  // ── Priorité : Champion pool ──────────────────────────────────────────────
  if (axes.has('champion')) {
    const worstChamp = champions.find(c => c.games >= 3 && c.winRate < 0.4)
    const poolSize = champions.filter(c => c.games >= 2).length
    if (worstChamp || poolSize > 6) {
      priorities.push({
        key: 'champion',
        severity: 18,
        title: 'Rationaliser le pool de champions',
        problem: worstChamp
          ? `${worstChamp.name} à ${pct(worstChamp.winRate)} WR sur ${worstChamp.games} parties — drag actif sur le winrate global`
          : `Pool de ${poolSize} champions actifs — trop dilué pour progresser efficacement`,
        target: 'Concentrer 80% des games ranked sur 2-3 champions maîtrisés',
        actions: [
          `Identifie tes 2 "mains" absolus (ceux avec meilleur KDA + WR) — joue-les en priorité.`,
          worstChamp ? `Mets **${worstChamp.name}** en "pause ranked" — joue-le uniquement en custom ou normal jusqu'à comprendre les matchups difficiles.` : `Élimine les picks sous 40% WR sur plus de 3 games de ton pool ranked.`,
          `Si counter-pick adverse : prépare 1 counter-pick par rôle — mais ne le jouez que si tu le maîtrises.`,
          `Règle du pool : jamais plus de 3 picks actifs en ranked. La spécialisation bat la variété au macro-niveau.`,
        ],
      })
    }
  }

  // ── Priorité : Winrate négatif (fallback) ─────────────────────────────────
  if (result.winRate < 0.45 && priorities.length === 0) {
    priorities.push({
      key: 'consistency',
      severity: 20,
      title: 'Stabiliser les performances',
      problem: `Winrate de ${pct(result.winRate)} sur ${result.totalGames} parties — déficit de consistance`,
      target: `Remonter au-dessus de 50% sur les 20 prochaines parties`,
      actions: [
        `Joue uniquement sur tes 2 champions les plus maîtrisés pour les 20 prochaines parties ranked.`,
        `Évite de jouer en état de fatigue ou de frustration (tilté) — les décisions dégradées coûtent des LP.`,
        `Analyse 1 défaite par session : identifie le moment clé où la partie a basculé.`,
        `Limite-toi à 2-3 ranked consécutifs max — faire des pauses préserve la qualité de jeu.`,
      ],
    })
  }

  // ── Génération du texte ───────────────────────────────────────────────────
  priorities.sort((a, b) => b.severity - a.severity)
  const top3 = priorities.slice(0, 3)

  if (top3.length === 0) {
    return [
      '## 📋 Rapport de coaching',
      '',
      `Les stats sur cette période (${result.totalGames} parties, ${pct(result.winRate)} WR) ne révèlent pas de faiblesse critique.`,
      '',
      '**Recommandations générales :**',
      '- Augmente la période analysée (30 jours minimum) pour un signal plus fiable.',
      '- Concentre-toi sur la régularité : moins de "one-shot games", plus de performances moyennes élevées.',
      '- Analyse tes replays des défaites proches (≤ 5 min d\'écart) — ce sont les plus instructifs.',
    ].join('\n')
  }

  const medals = ['🥇', '🥈', '🥉']
  top3.forEach((p, i) => {
    lines.push(`## ${medals[i]} Priorité ${i + 1} — ${p.title}`)
    lines.push(`**Problème identifié :** ${p.problem}`)
    lines.push(`**Objectif :** ${p.target}`)
    lines.push('**Actions concrètes :**')
    p.actions.forEach(a => lines.push(`- ${a}`))
    lines.push('')
  })

  // ── Plan de suivi ─────────────────────────────────────────────────────────
  lines.push('## 📅 Plan de suivi')
  lines.push(`- **Chaque session** : focus sur 1 seule priorité à la fois — ne corrige pas tout simultanément.`)
  lines.push(`- **Après ${Math.min(20, Math.ceil(result.totalGames * 0.4))} parties** : relance cette analyse pour mesurer la progression.`)
  lines.push(`- **Indicateur simple** : si ${top3[0]?.key === 'deaths' ? 'tes morts en défaite descendent sous ' + f1((L.avgDeaths ?? 5) - 1) : 'ton winrate dépasse ' + pct(Math.min(result.winRate + 0.08, 0.60))}, la priorité 1 est acquise.`)

  return lines.join('\n')
}
