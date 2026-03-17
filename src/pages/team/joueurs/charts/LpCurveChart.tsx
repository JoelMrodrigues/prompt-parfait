const PAD = { top: 22, right: 76, bottom: 34, left: 56 }
const W = 720
const H = 170
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

const LINE_COLOR = '#a855f7'   // purple-500
const WIN_COLOR  = '#22c55e'   // green-500
const LOSS_COLOR = '#ef4444'   // red-500

/** Courbe lissée — bezier cubique passant par les midpoints */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1)
    d += ` C ${cpX} ${pts[i].y.toFixed(1)}, ${cpX} ${pts[i + 1].y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`
  }
  return d
}

export function LpCurveChart({
  points,
}: {
  points: { date: Date; lp: number; win?: boolean }[]
}) {
  if (points.length < 2) return null

  // Échelle LP : bas = 0 (Diamond territory), haut = max + 500
  const maxLp   = Math.max(...points.map((x) => x.lp))
  const lpMin   = 0
  const lpMax   = maxLp + 500
  const lpRange = lpMax - lpMin

  // Échelle temporelle
  const minT   = points[0].date.getTime()
  const maxT   = points[points.length - 1].date.getTime()
  const tRange = Math.max(maxT - minT, 1)

  const toX = (d: Date) => PAD.left + ((d.getTime() - minT) / tRange) * INNER_W
  const toY = (lp: number) => PAD.top + INNER_H - ((lp - lpMin) / lpRange) * INNER_H

  const coords   = points.map((pt) => ({ x: toX(pt.date), y: toY(pt.lp) }))
  const linePath = smoothPath(coords)

  // Area fill path
  const firstX  = coords[0].x.toFixed(1)
  const lastX   = coords[coords.length - 1].x.toFixed(1)
  const baseY   = (PAD.top + INNER_H).toFixed(1)
  const areaPath = `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`

  // LP actuel (dernier point)
  const currentLp = points[points.length - 1].lp
  const currentY  = toY(currentLp)

  // Variation nette
  const diff      = currentLp - points[0].lp
  const diffLabel = (diff >= 0 ? '+' : '') + diff + ' LP'

  // Quartiles pour grille Y
  const yQuartiles = [0, 0.25, 0.5, 0.75, 1]

  // Labels axe X — filtrés par distance pixel min pour éviter les chevauchements
  const MIN_X_GAP = 58
  const xIndices: number[] = []
  let lastLabelX = -Infinity
  for (let i = 0; i < points.length; i++) {
    const x = toX(points[i].date)
    if (x - lastLabelX >= MIN_X_GAP) {
      xIndices.push(i)
      lastLabelX = x
    }
  }
  // Toujours inclure le dernier point s'il est assez loin du précédent
  const last = points.length - 1
  if (xIndices[xIndices.length - 1] !== last) {
    const prevX = toX(points[xIndices[xIndices.length - 1]].date)
    if (toX(points[last].date) - prevX >= MIN_X_GAP * 0.5) xIndices.push(last)
  }

  // Afficher les dots seulement si pas trop de points
  const showDots = points.length <= 120

  return (
    <div className="w-full space-y-3">
      {/* ── Légende ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-5 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="8" viewBox="0 0 20 8">
              <line x1="0" y1="4" x2="20" y2="4" stroke={LINE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Courbe LP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: WIN_COLOR }} />
            Victoire
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: LOSS_COLOR }} />
            Défaite
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border-2"
              style={{ background: LINE_COLOR, borderColor: 'rgba(255,255,255,0.5)' }}
            />
            LP actuel
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            diff >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {diffLabel} sur la période
        </span>
      </div>

      {/* ── SVG ─────────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="lpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={LINE_COLOR} stopOpacity="0.22" />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </linearGradient>
          <clipPath id="lpClip">
            <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H} />
          </clipPath>
        </defs>

        {/* Fond zone de tracé */}
        <rect
          x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H}
          fill="rgba(168,85,247,0.03)" rx="4"
        />

        {/* Grille horizontale */}
        {yQuartiles.map((q) => {
          const y = toY(lpMin + q * lpRange)
          return (
            <line
              key={q}
              x1={PAD.left} y1={y} x2={PAD.left + INNER_W} y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="5 4"
            />
          )
        })}

        {/* Ligne LP actuel */}
        <line
          x1={PAD.left} y1={currentY} x2={PAD.left + INNER_W} y2={currentY}
          stroke="rgba(168,85,247,0.35)"
          strokeDasharray="6 3"
          strokeWidth="1.2"
        />

        {/* Remplissage sous la courbe */}
        <path d={areaPath} fill="url(#lpAreaGrad)" clipPath="url(#lpClip)" />

        {/* Axes */}
        <line
          x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H}
          stroke="rgba(255,255,255,0.1)"
        />
        <line
          x1={PAD.left} y1={PAD.top + INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + INNER_H}
          stroke="rgba(255,255,255,0.1)"
        />

        {/* Courbe */}
        <path
          d={linePath}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#lpClip)"
        />

        {/* Points win/loss */}
        {showDots && points.map((pt, i) => {
          const isLast = i === points.length - 1
          const color  = pt.win === undefined ? LINE_COLOR : pt.win ? WIN_COLOR : LOSS_COLOR
          return (
            <circle
              key={i}
              cx={coords[i].x}
              cy={coords[i].y}
              r={isLast ? 5.5 : 3.5}
              fill={isLast ? LINE_COLOR : color}
              stroke={isLast ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
              strokeWidth={isLast ? 2 : 1}
            />
          )
        })}

        {/* Labels axe Y */}
        {yQuartiles.map((q) => {
          const lp = Math.round(lpMin + q * lpRange)
          const y  = toY(lp)
          return (
            <text
              key={q}
              x={PAD.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fontFamily="monospace"
              fill="#71717a"
            >
              {lp}
            </text>
          )
        })}

        {/* Titre axe Y */}
        <text
          x={14}
          y={PAD.top + INNER_H / 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily="monospace"
          fill="#52525b"
          transform={`rotate(-90, 14, ${PAD.top + INNER_H / 2})`}
          letterSpacing="2"
        >
          LP
        </text>

        {/* Labels axe X */}
        {xIndices.map((i) => {
          const pt  = points[i]
          const x   = toX(pt.date)
          const day = String(pt.date.getDate()).padStart(2, '0')
          const mon = String(pt.date.getMonth() + 1).padStart(2, '0')
          return (
            <text
              key={i}
              x={x}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill="#71717a"
            >
              {day}/{mon}
            </text>
          )
        })}

        {/* Badge LP actuel à droite */}
        <rect
          x={PAD.left + INNER_W + 5}
          y={currentY - 11}
          width={68}
          height={22}
          rx="5"
          fill="rgba(168,85,247,0.18)"
          stroke="rgba(168,85,247,0.5)"
          strokeWidth="1"
        />
        <text
          x={PAD.left + INNER_W + 39}
          y={currentY + 5}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="600"
          fill="#c084fc"
        >
          {currentLp} LP
        </text>

        {/* Tick axe Y au niveau LP actuel */}
        <line
          x1={PAD.left - 5} y1={currentY}
          x2={PAD.left}     y2={currentY}
          stroke="rgba(168,85,247,0.6)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}
