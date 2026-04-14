export type ToolMode = 'select' | 'pencil' | 'arrow' | 'eraser' | 'ward' | 'pink_ward'

export interface PlayerToken {
  id: string
  team: 'blue' | 'red'
  number: 1 | 2 | 3 | 4 | 5
  x: number
  y: number
  championName?: string | null
}

export interface Ward {
  id: string
  type: 'ward' | 'pink'
  x: number
  y: number
}

export interface DrawingLine {
  id: string
  type: 'pencil' | 'arrow'
  points: number[]
  color: string
  strokeWidth: number
}

export interface CanvasData {
  tokens: PlayerToken[]
  wards: Ward[]
  drawings: DrawingLine[]
}

export interface PlanFolder {
  id: string
  team_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
  files?: PlanFile[]
}

export interface PlanFile {
  id: string
  folder_id: string
  team_id: string
  name: string
  canvas_data: CanvasData
  position: number
  created_at: string
  updated_at: string
}
