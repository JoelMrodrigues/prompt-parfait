/**
 * Algorithme d'analyse Team — 100% déterministe, zéro IA externe
 * Génère du markdown structuré à partir des stats victoires/défaites d'équipe
 */
import type { TeamAnalysisResult } from './teamTypes'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const f1  = (n: number | null) => n != null ? n.toFixed(1) : '—'
const pct = (n: number)        => `${Math.round(n * 100)}%`
const fMin = (sec: number | null) => {
  if (sec == null) return '—'
  return `${Math.floor(sec / 60)}min${Math.round(sec % 60).toString().padStart(2, '0')}s`
}

function relDiff(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null
  return ((a - b) / Math.abs(b)) * 100
}

interface Insight {
  label: string
  winsVal: number | null
  lossVal: number | null
  magnitude: number
  higherIsBetter: boolean
  favorableInWins: boolean
}

function buildInsights(result: TeamAnalysisResult): Insight[] {
  const W = result.winsStats
  const L = result.lossesStats
  const out: Insight[] = []

  const add = (
    label: string, wVal: number | null, lVal: number | null,
    higherIsBetter: boolean
  ) => {
    const d = relDiff(wVal, lVal)
    if (d == null) return
    const magnitude = Math.abs(d)
    const favorableInWins = higherIsBetter ? d > 0 : d < 0
    out.push({ label, winsVal: wVal, lossVal: lVal, magnitude, higherIsBetter, favorableInWins })
  }

  add('KDA',             W.avgKda,         L.avgKda,         true)
  add('Morts/partie',    W.avgDeaths,      L.avgDeaths,      false)
  add('Dragons',         W.avgDragonKills, L.avgDragonKills, true)
  add('Barons',          W.avgBaronKills,  L.avgBaronKills,  true)
  add('Tours',           W.avgTowerKills,  L.avgTowerKills,  true)
  add('1er sang',        W.firstBloodRate, L.firstBloodRate, true)
  add('1er dragon',      W.firstDragonRate,L.firstDragonRate,true)
  add('1er baron',       W.firstBaronRate, L.firstBaronRate, true)
  add('1ère tour',       W.firstTowerRate, L.firstTowerRate, true)
  add('Durée',           W.avgGameDuration,L.avgGameDuration,null! )

  return out.sort((a, b) => b.magnitude - a.magnitude)
}

// ─── computeAnalyse ────────────────────────────────────────────────────────────

export function computeAnalyse(result: TeamAnalysisResult): string {
  const W = result.winsStats
  const L = result.lossesStats
  const insights = buildInsights(result)

  const strengths  = insights.filter(i => i.favorableInWins && i.magnitude >= 15)
  const weaknesses = insights.filter(i => !i.favorableInWins && i.magnitude >= 10)

  // ── ✅ Points forts ──────────────────────────────────────────────────────────
  let out = '## ✅ Points forts collectifs\n'

  if (strengths.length === 0) {
    out += 'Aucune métrique ne se distingue fortement en victoire — la performance est homogène.\n'
  } else {
    for (const s of strengths.slice(0, 4)) {
      const diff = relDiff(s.winsVal, s.lossVal)!
      if (s.higherIsBetter) {
        out += `- **${s.label}** significativement meilleur en victoire (**${f1(s.winsVal)}** V vs ${f1(s.lossVal)} D — +${diff.toFixed(0)}%)\n`
      } else {
        out += `- **${s.label}** plus faible en victoire : **${f1(s.winsVal)}** V vs ${f1(s.lossVal)} D (${Math.abs(diff).toFixed(0)}% d'écart)\n`
      }
    }
  }

  // KDA role le plus fort en victoire
  const bestRole = result.roleStats
    .filter(r => r.games >= 3)
    .sort((a, b) => b.avgKda - a.avgKda)[0]
  if (bestRole) {
    out += `- **${bestRole.role}** — rôle avec le meilleur KDA global (${bestRole.avgKda.toFixed(1)}, ${bestRole.games} parties)\n`
  }

  // Champions avec bon WR
  const reliableChamps = result.topChampions.filter(c => c.games >= 3 && c.winRate >= 0.6)
  if (reliableChamps.length > 0) {
    out += `- Champions fiables (WR ≥ 60%) : ${reliableChamps.slice(0, 3).map(c => `**${c.name}** (${pct(c.winRate)})`).join(', ')}\n`
  }

  // ── 💪 Résistance sous pression ──────────────────────────────────────────────
  out += '\n## 💪 Résistance sous pression\n'

  const lossKda = L.avgKda
  const winKda  = W.avgKda
  const kdaDrop = relDiff(lossKda, winKda)

  if (kdaDrop != null && Math.abs(kdaDrop) < 20) {
    out += `Le KDA en défaite (${f1(lossKda)}) reste proche de celui en victoire (${f1(winKda)}) — l'équipe ne s'effondre pas complètement quand elle perd.\n`
  } else if (kdaDrop != null && kdaDrop < -30) {
    out += `Le KDA chute de **${Math.abs(kdaDrop).toFixed(0)}%** en défaite (${f1(winKda)} V → ${f1(lossKda)} D) — les parties perdues deviennent vite incontrôlables.\n`
  }

  if (result.hasObjectives && W.avgGameDuration != null && L.avgGameDuration != null) {
    const durDiff = L.avgGameDuration - W.avgGameDuration
    if (durDiff > 180) {
      out += `Les défaites durent **${fMin(durDiff)} de plus** en moyenne (${fMin(W.avgGameDuration)} V / ${fMin(L.avgGameDuration)} D) — les parties perdues s'éternisent.\n`
    } else if (durDiff < -120) {
      out += `Les victoires durent plus longtemps (${fMin(W.avgGameDuration)} V / ${fMin(L.avgGameDuration)} D) — l'équipe close bien ses parties gagnées.\n`
    } else {
      out += `Durée comparable victoires/défaites (${fMin(W.avgGameDuration)} V / ${fMin(L.avgGameDuration)} D) — les parties ne sont pas fermées tôt.\n`
    }
  }

  // ── ❌ Ce qui freine ─────────────────────────────────────────────────────────
  out += '\n## ❌ Ce qui freine les victoires\n'

  if (weaknesses.length === 0) {
    out += 'Aucun pattern de défaite clairement identifiable sur ces données.\n'
  } else {
    for (const w of weaknesses.slice(0, 4)) {
      const diff = relDiff(w.winsVal, w.lossVal)!
      if (!w.higherIsBetter) {
        out += `- **${w.label}** plus élevé en défaite : ${f1(w.lossVal)} D vs ${f1(w.winsVal)} V (+${Math.abs(diff).toFixed(0)}%)\n`
      } else {
        out += `- **${w.label}** bien inférieur en défaite : ${f1(w.lossVal)} D vs ${f1(w.winsVal)} V (−${Math.abs(diff).toFixed(0)}%)\n`
      }
    }
  }

  // Rôle problématique en défaite
  const worstRole = result.roleStats
    .filter(r => r.games >= 3)
    .sort((a, b) => a.avgKda - b.avgKda)[0]
  if (worstRole && worstRole.avgKda < 2.5) {
    out += `- **${worstRole.role}** — KDA moyen le plus bas (${worstRole.avgKda.toFixed(1)}) : ce rôle est souvent le premier à décrocher\n`
  }

  // Champions problématiques
  const badChamps = result.topChampions.filter(c => c.games >= 3 && c.winRate < 0.4)
  if (badChamps.length > 0) {
    out += `- Champions à problème (WR < 40%) : ${badChamps.slice(0, 3).map(c => `**${c.name}** (${pct(c.winRate)}, ${c.games}G)`).join(', ')}\n`
  }

  // ── 📊 Corrélations clés ─────────────────────────────────────────────────────
  out += '\n## 📊 Corrélations clés\n'

  if (result.hasObjectives) {
    if (result.winsStats.avgDragonKills != null && result.lossesStats.avgDragonKills != null) {
      const wD = result.winsStats.avgDragonKills
      const lD = result.lossesStats.avgDragonKills
      const diff = relDiff(wD, lD)
      if (diff != null && Math.abs(diff) >= 10) {
        out += `- **Dragons** : ${f1(wD)} pris en victoire vs ${f1(lD)} en défaite (${diff > 0 ? '+' : ''}${diff.toFixed(0)}%) — le contrôle dragon est corrélé au résultat\n`
      }
    }
    if (result.winsStats.firstBloodRate != null && result.lossesStats.firstBloodRate != null) {
      const wFB = result.winsStats.firstBloodRate
      out += `- **Premier sang** : obtenu dans **${pct(wFB)}** des victoires vs ${pct(result.lossesStats.firstBloodRate!)} des défaites\n`
    }
    if (result.winsStats.firstTowerRate != null) {
      out += `- **1ère tour** : prise dans **${pct(result.winsStats.firstTowerRate)}** des victoires vs ${pct(result.lossesStats.firstTowerRate!)} des défaites\n`
    }
  } else {
    // Corrélations sur KDA/morts si pas d'objectifs
    const top3 = insights.slice(0, 3)
    for (const ins of top3) {
      const d = relDiff(ins.winsVal, ins.lossVal)!
      out += `- **${ins.label}** : ${f1(ins.winsVal)} en victoire vs ${f1(ins.lossVal)} en défaite (${Math.abs(d).toFixed(0)}% d'écart)\n`
    }
  }

  // ── 🏆 Analyse par rôle ──────────────────────────────────────────────────────
  out += '\n## 🎭 Performances par rôle\n'

  for (const r of result.roleStats) {
    if (r.games < 2) continue
    const kdaStr  = r.avgKda.toFixed(1)
    const killStr = `${r.avgKills.toFixed(1)}/${r.avgDeaths.toFixed(1)}/${r.avgAssists.toFixed(1)}`
    const champStr = r.topChampions.length > 0 ? ` · ${r.topChampions.join(', ')}` : ''
    out += `- **${r.role}** : KDA ${kdaStr} (${killStr})${champStr}\n`
  }

  return out.trim()
}

// ─── computeRapport ────────────────────────────────────────────────────────────

export function computeRapport(result: TeamAnalysisResult): string {
  const insights = buildInsights(result)
    .filter(i => !i.favorableInWins && i.magnitude >= 10)

  // Identifier les 3 priorités
  const priorities: { title: string; problem: string; target: string; actions: string[] }[] = []

  // Priorité 1 : ce qui discrimine le plus entre V et D
  const p1 = insights[0]
  if (p1) {
    const diff = relDiff(p1.winsVal, p1.lossVal)!
    const target = p1.higherIsBetter
      ? `Atteindre **${f1(p1.winsVal)}** (niveau victoire) contre ${f1(p1.lossVal)} actuel en défaite`
      : `Descendre à **${f1(p1.winsVal)}** (niveau victoire) contre ${f1(p1.lossVal)} en défaite`
    priorities.push({
      title: p1.label,
      problem: `**${p1.label}** diverge de **${Math.abs(diff).toFixed(0)}%** entre victoires (${f1(p1.winsVal)}) et défaites (${f1(p1.lossVal)})`,
      target,
      actions: getActionsForMetric(p1.label, result),
    })
  }

  // Priorité 2 : deuxième métrique ou rôle problématique
  const p2 = insights[1]
  if (p2) {
    const diff = relDiff(p2.winsVal, p2.lossVal)!
    priorities.push({
      title: p2.label,
      problem: `**${p2.label}** : ${f1(p2.winsVal)} V vs ${f1(p2.lossVal)} D (${Math.abs(diff).toFixed(0)}% d'écart)`,
      target: p2.higherIsBetter
        ? `Monter à **${f1(p2.winsVal)}** le niveau de victoire`
        : `Réduire à **${f1(p2.winsVal)}** le niveau de victoire`,
      actions: getActionsForMetric(p2.label, result),
    })
  }

  // Priorité 3 : rôle le plus problématique
  const worstRole = result.roleStats
    .filter(r => r.games >= 3)
    .sort((a, b) => a.avgKda - b.avgKda)[0]
  if (worstRole && worstRole.avgKda < 3 && priorities.length >= 2) {
    priorities.push({
      title: `Rôle ${worstRole.role}`,
      problem: `**${worstRole.role}** affiche le KDA le plus bas (${worstRole.avgKda.toFixed(1)}) — ce joueur est souvent dans une situation difficile`,
      target: `Viser un KDA de **${(worstRole.avgKda * 1.3).toFixed(1)}** sur ce rôle (amélioration de 30%)`,
      actions: [
        `Revoir la pick/ban : prioriser un champion de sécurité sur ${worstRole.role} pour limiter les contre-picks`,
        `Analyser ensemble les parties perdues par ${worstRole.role} pour identifier les patterns de mort évitables`,
        `En scrim : tester des compositions qui soutiennent davantage le ${worstRole.role} (peel, rotation, etc.)`,
      ],
    })
  }

  // Fallback si pas assez de données
  if (priorities.length === 0) {
    return `## 📊 Données insuffisantes\n\nPas assez de parties ou de variance entre victoires/défaites pour générer des priorités pertinentes.\n\nLancez l'analyse sur une période plus longue ou après avoir joué plus de matchs.`
  }

  const icons = ['🥇', '🥈', '🥉']
  let out = ''

  for (let i = 0; i < Math.min(priorities.length, 3); i++) {
    const p = priorities[i]
    out += `## ${icons[i]} Priorité ${i + 1} — ${p.title}\n`
    out += `**Problème identifié :** ${p.problem}\n`
    out += `**Objectif :** ${p.target}\n`
    out += `**Comment :**\n`
    for (const action of p.actions) {
      out += `- ${action}\n`
    }
    out += '\n'
  }

  // Suivi
  out += '## 📅 Suivi recommandé\n'

  const scrims = result.matchType !== 'tournament'
  out += `- Réévaluer après **${scrims ? '10 scrims' : '5 matchs officiels'}** sur les métriques identifiées\n`

  if (result.hasObjectives) {
    out += '- Tracker après chaque session : dragons pris, premier sang, WR par rapport aux objectifs\n'
  }
  out += `- WR cible à 2 semaines : **${pct(Math.min(result.winRate + 0.1, 0.7))}** (${pct(result.winRate)} actuel)\n`

  return out.trim()
}

// ─── Bibliothèque d'actions par métrique ──────────────────────────────────────

function getActionsForMetric(label: string, result: TeamAnalysisResult): string[] {
  switch (label) {
    case 'Dragons':
      return [
        'Assigner un joueur responsable du "dragon ping" 30 secondes avant le spawn',
        'Ne pas engager un teamfight éloigné quand le dragon spawn dans < 60s',
        'Préparer la vision (wards) autour du puits dragon 2 minutes avant',
      ]
    case 'Barons':
      return [
        'Baron = objectif de close, pas d\'engage à risque — attendre un avantage clair',
        'Visionner le pit baron dès 18 min avec deepwards côté ennemi',
        'Si kill côté ennemi : décision baron en moins de 5 secondes, pas d\'hésitation',
      ]
    case '1er sang':
    case '1ère tour':
      return [
        'Aligner la composition sur un early game agressif si vous voulez first blood en priorité',
        'Pré-game : décider ensemble si l\'objectif est "tempo early" ou "scaling" pour éviter les prises de risque incohérentes',
        'Utiliser le timing level 2 (vague 1 + 3 casters) pour créer des opportunités de premier sang au bot ou top',
      ]
    case '1er dragon':
      return [
        'Ward côté dragon dès niveau 4 (pas 6) — l\'objectif est de prendre le contrôle tôt',
        `Si ${result.winsStats.avgDragonKills != null ? `vous prenez en moyenne ${result.winsStats.avgDragonKills.toFixed(1)} dragons en victoire` : 'vous pouvez contrôler les dragons'}, la priorité est la setup de vision en avance`,
        'Ne contester un dragon sous tower ennemie que si vous avez 2+ avantages (herald, kill, ward)',
      ]
    case 'Morts/partie':
    case 'KDA':
      return [
        'Identifier en VOD les 2-3 morts les plus évitables par partie (engage trop loin, recall raté, etc.)',
        'Règle : ne pas s\'engager sur un objectif si plus de 2 joueurs sont en situation critique (oom, low HP)',
        'En défaite : tendance à forcer des engages désespérés — décider ensemble d\'un seuil de "tempo" au-delà duquel on joue safe',
      ]
    default:
      return [
        `Analyser les parties perdues pour identifier les moments où **${label}** bascule en votre défaveur`,
        'Mettre en place un focus post-partie : 3 minutes sur cette métrique après chaque scrim',
        `Définir une cible chiffrée par session et la comparer au niveau victoire`,
      ]
  }
}
