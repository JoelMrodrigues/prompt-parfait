/**
 * Toolbar des outils de dessin pour la page Plans.
 */
import {
  MousePointer2,
  Pencil,
  MoveRight,
  Eraser,
  Eye,
  Undo2,
  Redo2,
  Save,
} from 'lucide-react'
import type { ToolMode } from '../types'
import { DRAW_COLORS } from '../constants'

interface Props {
  tool: ToolMode
  drawColor: string
  strokeWidth: number
  canUndo: boolean
  canRedo: boolean
  saving: boolean
  onTool: (t: ToolMode) => void
  onColor: (c: string) => void
  onStrokeWidth: (w: number) => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onReset: () => void
}

const TOOLS: { id: ToolMode; icon: React.ReactNode; label: string }[] = [
  { id: 'select',    icon: <MousePointer2 size={16} />, label: 'Déplacer (S)' },
  { id: 'pencil',    icon: <Pencil size={16} />,        label: 'Crayon (P)' },
  { id: 'arrow',     icon: <MoveRight size={16} />,     label: 'Flèche (A)' },
  { id: 'eraser',    icon: <Eraser size={16} />,        label: 'Gomme (E)' },
]

export function PlansToolbar({
  tool, drawColor, strokeWidth, canUndo, canRedo, saving,
  onTool, onColor, onStrokeWidth, onUndo, onRedo, onSave, onReset,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-dark-card border border-dark-border rounded-xl flex-wrap">
      {/* Outils */}
      <div className="flex items-center gap-1 border-r border-dark-border pr-2">
        {TOOLS.map(({ id, icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => onTool(id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              tool === id
                ? 'bg-accent-blue text-white'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Poser des wards */}
      <div className="flex items-center gap-1 border-r border-dark-border pr-2">
        <button
          title="Ward (V)"
          onClick={() => onTool('ward')}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            tool === 'ward'
              ? 'bg-accent-blue text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
          }`}
        >
          <span className="text-[10px] font-bold leading-none">
            <Eye size={14} className="text-green-400" />
          </span>
        </button>
        <button
          title="Pink ward (K)"
          onClick={() => onTool('pink_ward')}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            tool === 'pink_ward'
              ? 'bg-accent-blue text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
          }`}
        >
          <Eye size={14} className={tool === 'pink_ward' ? 'text-white' : 'text-pink-400'} />
        </button>
      </div>

      {/* Couleurs */}
      <div className="flex items-center gap-1 border-r border-dark-border pr-2">
        {DRAW_COLORS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => onColor(c.value)}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
              drawColor === c.value ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.value === '#ffffff' ? '#e5e7eb' : c.value }}
          />
        ))}
      </div>

      {/* Épaisseur */}
      <div className="flex items-center gap-1.5 border-r border-dark-border pr-2">
        {[1, 2, 4].map((w) => (
          <button
            key={w}
            title={`Épaisseur ${w}`}
            onClick={() => onStrokeWidth(w)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
              strokeWidth === w
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
            }`}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: w + 6, height: w + 2, minWidth: 7 }}
            />
          </button>
        ))}
      </div>

      {/* Undo / Redo */}
      <div className="flex items-center gap-1 border-r border-dark-border pr-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Y)"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 size={15} />
        </button>
      </div>

      {/* Reset + Save */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onReset}
          title="Réinitialiser la carte"
          className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-dark-bg/60 rounded-lg transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          title="Sauvegarder"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white text-xs font-medium rounded-lg hover:bg-accent-blue/90 disabled:opacity-60 transition-colors"
        >
          <Save size={13} />
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
