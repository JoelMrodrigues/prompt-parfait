const PADDING = { top: 32, right: 24, bottom: 40, left: 48 }
const LINE_COLOR = '#22d3ee'

export function LpCurveChart({
  points,
}: {
  points: { date: Date; lp: number; win?: boolean }[]
}) {
  if (points.length < 2) return null
  const width = 640
  const height = 280
  const p = PADDING
  const innerW = width - p.left - p.right
  const innerH = height - p.top - p.bottom
  const minLp = Math.min(...points.map((x) => x.lp))
  const maxLp = Math.max(...points.map((x) => x.lp))
  const lpRange = Math.max(maxLp - minLp, 50)
  const minT = points[0].date.getTime()
  const maxT = points[points.length - 1].date.getTime()
  const tRange = Math.max(maxT - minT, 1)
  const toX = (d: Date) => p.left + ((d.getTime() - minT) / tRange) * innerW
  const toY = (lp: number) => p.top + innerH - ((lp - minLp) / lpRange) * innerH
  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.date)} ${toY(pt.lp)}`)
    .join(' ')
  const labelIndices =
    points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1]
  const uniq = Array.from(new Set(labelIndices)).sort((a, b) => a - b)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((q) => {
        const lp = minLp + q * lpRange
        const y = toY(lp)
        return (
          <line
            key={q}
            x1={p.left}
            y1={y}
            x2={width - p.right}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
        )
      })}
      <path
        d={pathD}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((pt, i) => (
        <circle
          key={i}
          cx={toX(pt.date)}
          cy={toY(pt.lp)}
          r="3"
          fill={LINE_COLOR}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      ))}
      {uniq.map((i) => {
        const pt = points[i]
        const x = toX(pt.date)
        const y = toY(pt.lp)
        return (
          <g key={i}>
            <rect
              x={x - 28}
              y={y - 22}
              width={56}
              height={18}
              rx="4"
              fill="rgba(0,0,0,0.75)"
              stroke="rgba(255,255,255,0.2)"
            />
            <text
              x={x}
              y={y - 9}
              textAnchor="middle"
              className="fill-white text-[10px] font-semibold font-mono"
            >
              {pt.lp} LP
            </text>
          </g>
        )
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((q) => {
        const lp = Math.round(minLp + q * lpRange)
        const y = toY(lp)
        return (
          <text
            key={q}
            x={p.left - 8}
            y={y + 4}
            textAnchor="end"
            className="fill-gray-400 text-[11px] font-mono"
          >
            {lp}
          </text>
        )
      })}
      {(() => {
        const step = Math.max(1, Math.floor(points.length / 10))
        const indices: number[] = []
        for (let i = 0; i < points.length; i += step) indices.push(i)
        if (points.length - 1 - (indices[indices.length - 1] ?? 0) > step / 2)
          indices.push(points.length - 1)
        return indices.map((i) => {
          const pt = points[i]
          const x = toX(pt.date)
          const label = `${String(pt.date.getDate()).padStart(2, '0')}/${String(pt.date.getMonth() + 1).padStart(2, '0')}`
          return (
            <text
              key={i}
              x={x}
              y={height - 12}
              textAnchor="middle"
              className="fill-gray-500 text-[10px] font-mono"
            >
              {label}
            </text>
          )
        })
      })()}
    </svg>
  )
}
