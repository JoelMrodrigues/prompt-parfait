const PAD = { top: 24, right: 20, bottom: 36, left: 64 }
const W = 720
const H = 200
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

const COLOR_POS = '#22c55e' // green-500
const COLOR_NEG = '#ef4444' // red-500

/** Retourne le participantId du joueur dans la timeline Riot */
function findParticipantId(timeline: any, puuid: string): number | null {
  const pInfo = timeline?.info?.participants
  if (!Array.isArray(pInfo)) return null
  const found = pInfo.find((p: any) => p.puuid === puuid)
  return found?.participantId ?? null
}

/** Extrait les gold différentiels par minute depuis les frames de timeline */
function extractGoldDiff(timeline: any, participantId: number): { minute: number; diff: number }[] {
  const frames: any[] = timeline?.info?.frames ?? []
  const result: { minute: number; diff: number }[] = []
  for (const frame of frames) {
    const pFrame = frame.participantFrames?.[String(participantId)]
    if (!pFrame) continue
    const minute = Math.round((frame.timestamp ?? 0) / 60000)
    const myGold = pFrame.totalGold ?? 0
    // Moyenne gold des adversaires (team id opposé)
    const allFrames = Object.values(frame.participantFrames ?? {}) as any[]
    const myTeamIds = new Set<number>()
    // On ne peut pas identifier les équipes depuis les frames seules, on prend la médiane des autres
    const others = allFrames.filter((f: any) => f.participantId !== participantId)
    const avgOpponent = others.length > 0
      ? others.reduce((sum: number, f: any) => sum + (f.totalGold ?? 0), 0) / others.length
      : myGold
    result.push({ minute, diff: myGold - avgOpponent })
  }
  return result
}

export function GoldDiffChart({
  timeline,
  puuid,
}: {
  timeline: any
  puuid?: string
}) {
  const participantId = puuid ? findParticipantId(timeline, puuid) : null
  const points = participantId ? extractGoldDiff(timeline, participantId) : []

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        Données gold non disponibles
      </div>
    )
  }

  const maxMinute = points[points.length - 1].minute
  const diffs = points.map((p) => p.diff)
  const absMax = Math.max(Math.abs(Math.min(...diffs)), Math.abs(Math.max(...diffs)), 1)
  const diffMin = -absMax
  const diffMax = absMax
  const diffRange = diffMax - diffMin

  const toX = (min: number) => PAD.left + (min / Math.max(maxMinute, 1)) * INNER_W
  const toY = (d: number) => PAD.top + INNER_H - ((d - diffMin) / diffRange) * INNER_H
  const zeroY = toY(0)

  const coords = points.map((pt) => ({ x: toX(pt.minute), y: toY(pt.diff) }))

  // Construire des paths segmentés positif/négatif
  let posPath = ''
  let negPath = ''
  for (let i = 0; i < coords.length; i++) {
    const seg = i === 0 ? 'M' : 'L'
    posPath += `${seg} ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)} `
    negPath += `${seg} ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)} `
  }

  // Area fill : path fermé vers la ligne zéro
  const firstX = coords[0].x.toFixed(1)
  const lastX = coords[coords.length - 1].x.toFixed(1)

  const linePath = `M ${coords.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ')}`
  const areaPath = `${linePath} L ${lastX} ${zeroY.toFixed(1)} L ${firstX} ${zeroY.toFixed(1)} Z`

  // Labels axe X (toutes les 5 minutes)
  const xLabels: number[] = []
  for (let m = 0; m <= maxMinute; m += 5) xLabels.push(m)

  // Labels axe Y
  const yTicks = [-absMax, -Math.round(absMax / 2), 0, Math.round(absMax / 2), absMax]

  const formatK = (v: number) => {
    const abs = Math.abs(v)
    return abs >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_POS }} />
          Avantage gold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_NEG }} />
          Désavantage gold
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="goldPosGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_POS} stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLOR_POS} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="goldNegGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={COLOR_NEG} stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLOR_NEG} stopOpacity="0" />
          </linearGradient>
          <clipPath id="goldClipPos">
            <rect x={PAD.left} y={PAD.top} width={INNER_W} height={zeroY - PAD.top} />
          </clipPath>
          <clipPath id="goldClipNeg">
            <rect x={PAD.left} y={zeroY} width={INNER_W} height={PAD.top + INNER_H - zeroY} />
          </clipPath>
        </defs>

        {/* Fond */}
        <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H} fill="rgba(255,255,255,0.02)" rx="4" />

        {/* Grille horizontale */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD.left} y1={toY(v)} x2={PAD.left + INNER_W} y2={toY(v)}
            stroke={v === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}
            strokeDasharray={v === 0 ? 'none' : '4 3'}
            strokeWidth={v === 0 ? 1.5 : 1}
          />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="rgba(255,255,255,0.1)" />
        <line x1={PAD.left} y1={PAD.top + INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + INNER_H} stroke="rgba(255,255,255,0.1)" />

        {/* Fill positif (au-dessus de 0) */}
        <path d={areaPath} fill="url(#goldPosGrad)" clipPath="url(#goldClipPos)" />
        {/* Fill négatif (sous 0) */}
        <path d={areaPath} fill="url(#goldNegGrad)" clipPath="url(#goldClipNeg)" />

        {/* Courbe */}
        <path
          d={linePath}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#goldClipPos)"
        />
        <path
          d={linePath}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#goldClipNeg)"
        />

        {/* Labels Y */}
        {yTicks.map((v) => (
          <text
            key={v}
            x={PAD.left - 8}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill={v === 0 ? '#a1a1aa' : '#52525b'}
          >
            {v > 0 ? '+' : ''}{formatK(v)}
          </text>
        ))}

        {/* Labels X */}
        {xLabels.map((m) => (
          <text
            key={m}
            x={toX(m)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#52525b"
          >
            {m}'
          </text>
        ))}
      </svg>
    </div>
  )
}
