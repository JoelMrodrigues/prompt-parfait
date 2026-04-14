/**
 * MapCanvas — carte SR interactive avec Konva.
 * La minimap est un <img> absolu derrière la Stage (aucun CORS, aucun taint canvas).
 */
import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Circle, Group, Text, Rect, Line, Arrow, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { SceneContext } from 'konva/lib/Context'
import type { CanvasData, DrawingLine, Ward, PlayerToken } from '../types'
import { CANVAS_SIZE, MAP_LOCAL, ROLE_LABELS, TOKEN_RADIUS, WARD_RADIUS } from '../constants'
import { getChampionImage } from '../../../../lib/championImages'

const uuidv4 = () => crypto.randomUUID()

// URLs minimap essayées dans l'ordre
const MAP_FALLBACKS = [
  MAP_LOCAL,
  'https://raw.communitydragon.org/latest/game/assets/maps/minimap/minimap.png',
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loadouts/summonersrift/environment/summoners-rift-update-minimap.png',
]

interface ActiveLine {
  type: 'pencil' | 'arrow'
  points: number[]
  color: string
  strokeWidth: number
}

interface Props {
  data: CanvasData
  tool: string
  drawColor: string
  strokeWidth: number
  size: number
  onCommit: (newData: CanvasData) => void
  onTokenClick?: (token: PlayerToken) => void
}

export function MapCanvas({ data, tool, drawColor, strokeWidth, size, onCommit, onTokenClick }: Props) {
  const stageRef   = useRef<Konva.Stage>(null)
  const [activeLine, setActiveLine] = useState<ActiveLine | null>(null)
  const isDrawing  = useRef(false)
  const [champImages, setChampImages] = useState<Record<string, HTMLImageElement>>({})
  const [mapSrc, setMapSrc]   = useState(MAP_FALLBACKS[0])
  const [mapFbIdx, setMapFbIdx] = useState(0)

  const scale = size / CANVAS_SIZE

  // ─── Champion images ──────────────────────────────────────────────────────
  useEffect(() => {
    data.tokens.forEach((t) => {
      if (t.championName && !champImages[t.championName]) {
        const img = new window.Image()
        img.src = getChampionImage(t.championName)
        img.onload = () => setChampImages((p) => ({ ...p, [t.championName!]: img }))
      }
    })
  }, [data.tokens])

  // ─── Pointer → coordonnées canvas ────────────────────────────────────────
  function getPos() {
    const pos = stageRef.current?.getPointerPosition()
    return pos ? { x: pos.x / scale, y: pos.y / scale } : null
  }

  function isOnInteractive(node: Konva.Node): boolean {
    let cur: Konva.Node | null = node
    while (cur) {
      if (cur.name() === 'token' || cur.name() === 'ward') return true
      cur = cur.getParent() as Konva.Node | null
    }
    return false
  }

  // ─── Mouse handlers ───────────────────────────────────────────────────────
  function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
    if (isOnInteractive(e.target)) return
    const pos = getPos(); if (!pos) return

    if (tool === 'ward' || tool === 'pink_ward') {
      onCommit({ ...data, wards: [...data.wards, { id: uuidv4(), type: tool === 'ward' ? 'ward' : 'pink', x: pos.x, y: pos.y }] })
      return
    }
    if (tool === 'pencil' || tool === 'arrow') {
      isDrawing.current = true
      setActiveLine({ type: tool as 'pencil' | 'arrow', points: [pos.x, pos.y], color: drawColor, strokeWidth })
    }
  }

  function handleMouseMove() {
    if (!isDrawing.current || !activeLine) return
    const pos = getPos(); if (!pos) return
    if (activeLine.type === 'pencil') {
      setActiveLine((p) => p ? { ...p, points: [...p.points, pos.x, pos.y] } : p)
    } else {
      setActiveLine((p) => p ? { ...p, points: [p.points[0], p.points[1], pos.x, pos.y] } : p)
    }
  }

  function handleMouseUp() {
    if (!isDrawing.current || !activeLine) return
    isDrawing.current = false
    const pts = activeLine.points
    if (pts.length < 4 || (pts[pts.length - 2] - pts[0]) ** 2 + (pts[pts.length - 1] - pts[1]) ** 2 < 25) {
      setActiveLine(null); return
    }
    onCommit({ ...data, drawings: [...data.drawings, { id: uuidv4(), type: activeLine.type, points: activeLine.points, color: activeLine.color, strokeWidth: activeLine.strokeWidth } as DrawingLine] })
    setActiveLine(null)
  }

  function handleTokenDragEnd(tokenId: string, e: KonvaEventObject<DragEvent>) {
    const abs = e.target.absolutePosition()
    onCommit({ ...data, tokens: data.tokens.map((t) => t.id === tokenId ? { ...t, x: abs.x / scale, y: abs.y / scale } : t) })
  }

  function handleWardDragEnd(wardId: string, e: KonvaEventObject<DragEvent>) {
    const abs = e.target.absolutePosition()
    onCommit({ ...data, wards: data.wards.map((w) => w.id === wardId ? { ...w, x: abs.x / scale, y: abs.y / scale } : w) })
  }

  function handleDrawingClick(id: string) {
    if (tool === 'eraser') onCommit({ ...data, drawings: data.drawings.filter((d) => d.id !== id) })
  }

  function handleWardClick(e: KonvaEventObject<Event>, id: string) {
    if (tool === 'eraser') { e.cancelBubble = true; onCommit({ ...data, wards: data.wards.filter((w) => w.id !== id) }) }
  }

  function handleTokenClick(e: KonvaEventObject<Event>, token: PlayerToken) {
    e.cancelBubble = true
    if (tool === 'select' && onTokenClick) onTokenClick(token)
  }

  const cursorStyle = tool === 'eraser' || tool === 'pencil' || tool === 'arrow' ? 'crosshair'
    : tool === 'ward' || tool === 'pink_ward' ? 'cell' : 'default'

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] relative"
      style={{ width: size, height: size, cursor: cursorStyle, flexShrink: 0, background: '#070d1a' }}
    >
      {/* Minimap en <img> — aucun canvas taint, aucun CORS côté canvas */}
      <img
        src={mapSrc}
        alt=""
        onError={() => {
          const next = mapFbIdx + 1
          if (next < MAP_FALLBACKS.length) { setMapFbIdx(next); setMapSrc(MAP_FALLBACKS[next]) }
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none' }}
        draggable={false}
      />

      {/* Stage Konva transparent par-dessus */}
      <Stage
        ref={stageRef}
        width={size}
        height={size}
        scaleX={scale}
        scaleY={scale}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drawings */}
        <Layer>
          {data.drawings.map((d) =>
            d.type === 'pencil' ? (
              <Line key={d.id} points={d.points} stroke={d.color} strokeWidth={d.strokeWidth} tension={0.4} lineCap="round" lineJoin="round" hitStrokeWidth={14} onClick={() => handleDrawingClick(d.id)} onTap={() => handleDrawingClick(d.id)} />
            ) : (
              <Arrow key={d.id} points={d.points} stroke={d.color} fill={d.color} strokeWidth={d.strokeWidth} pointerLength={12} pointerWidth={9} lineCap="round" hitStrokeWidth={14} onClick={() => handleDrawingClick(d.id)} onTap={() => handleDrawingClick(d.id)} />
            )
          )}
        </Layer>

        {/* Active drawing preview */}
        <Layer listening={false}>
          {activeLine?.type === 'pencil' && <Line points={activeLine.points} stroke={activeLine.color} strokeWidth={activeLine.strokeWidth} tension={0.4} lineCap="round" lineJoin="round" opacity={0.85} />}
          {activeLine?.type === 'arrow' && activeLine.points.length >= 4 && <Arrow points={activeLine.points} stroke={activeLine.color} fill={activeLine.color} strokeWidth={activeLine.strokeWidth} pointerLength={12} pointerWidth={9} lineCap="round" opacity={0.85} />}
        </Layer>

        {/* Wards */}
        <Layer>
          {data.wards.map((w) => (
            <Group key={w.id} name="ward" x={w.x} y={w.y} draggable={tool === 'select'} onDragEnd={(e) => handleWardDragEnd(w.id, e)} onClick={(e) => handleWardClick(e, w.id)} onTap={(e) => handleWardClick(e, w.id)}>
              {w.type === 'ward' ? (
                <><Circle radius={WARD_RADIUS} fill="#22c55e" stroke="#fff" strokeWidth={1.5} shadowColor="black" shadowBlur={4} shadowOpacity={0.6} /><Text text="W" fontSize={7} fontStyle="bold" fill="white" align="center" verticalAlign="middle" width={WARD_RADIUS*2} height={WARD_RADIUS*2} x={-WARD_RADIUS} y={-WARD_RADIUS} /></>
              ) : (
                <><Rect width={WARD_RADIUS*2} height={WARD_RADIUS*2} x={-WARD_RADIUS} y={-WARD_RADIUS} fill="#ec4899" stroke="#fff" strokeWidth={1.5} cornerRadius={2} shadowColor="black" shadowBlur={4} shadowOpacity={0.6} /><Text text="P" fontSize={7} fontStyle="bold" fill="white" align="center" verticalAlign="middle" width={WARD_RADIUS*2} height={WARD_RADIUS*2} x={-WARD_RADIUS} y={-WARD_RADIUS} /></>
              )}
            </Group>
          ))}
        </Layer>

        {/* Player tokens */}
        <Layer>
          {data.tokens.map((token) => {
            const fill   = token.team === 'blue' ? '#3b82f6' : '#ef4444'
            const border = token.team === 'blue' ? '#93c5fd' : '#fca5a5'
            const cImg   = token.championName ? champImages[token.championName] : null
            return (
              <Group key={token.id} name="token" x={token.x} y={token.y} draggable={tool === 'select'} onDragEnd={(e) => handleTokenDragEnd(token.id, e)} onClick={(e) => handleTokenClick(e, token)} onTap={(e) => handleTokenClick(e, token)}>
                <Circle radius={TOKEN_RADIUS} fill={fill} stroke={border} strokeWidth={2} shadowColor="black" shadowBlur={6} shadowOpacity={0.7} />
                {cImg ? (
                  <Group clipFunc={(ctx: SceneContext) => { ctx.arc(0, 0, TOKEN_RADIUS - 2, 0, Math.PI * 2, false) }}>
                    <KonvaImage image={cImg} x={-(TOKEN_RADIUS-2)} y={-(TOKEN_RADIUS-2)} width={(TOKEN_RADIUS-2)*2} height={(TOKEN_RADIUS-2)*2} />
                  </Group>
                ) : (
                  <Text text={ROLE_LABELS[token.number]} fontSize={8} fontStyle="bold" fill="white" align="center" verticalAlign="middle" width={TOKEN_RADIUS*2} height={TOKEN_RADIUS*2} x={-TOKEN_RADIUS} y={-TOKEN_RADIUS} />
                )}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
