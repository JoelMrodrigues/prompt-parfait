/**
 * PlansPage — carte SR interactive pour créer des plans tactiques.
 * Layout identique à AnalysePage : plein écran, pas de scroll.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Map } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { usePlanCanvas } from './usePlanCanvas'
import { MapCanvas } from './components/MapCanvas'
import { PlansToolbar } from './components/PlansToolbar'
import { PlansSidebar } from './components/PlansSidebar'
import { ChampionPicker } from './components/ChampionPicker'
import { DEFAULT_CANVAS_DATA } from './constants'
import type { PlanFile, PlanFolder, PlayerToken } from './types'
import {
  fetchPlanFolders,
  createPlanFolder,
  renamePlanFolder,
  deletePlanFolder,
  createPlanFile,
  renamePlanFile,
  savePlanFile,
  deletePlanFile,
} from '../../../services/supabase/planQueries'

export function PlansPage() {
  const { team }                        = useTeam()
  const [folders, setFolders]           = useState<PlanFolder[]>([])
  const [selectedFile, setSelectedFile] = useState<PlanFile | null>(null)
  const [saving, setSaving]             = useState(false)
  const [pickerToken, setPickerToken]   = useState<PlayerToken | null>(null)

  const pageRef      = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize]     = useState(560)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvas = usePlanCanvas()

  // ─── Désactiver le scroll du parent (même pattern qu'AnalysePage) ──────────
  useEffect(() => {
    let el = pageRef.current?.parentElement
    while (el) {
      const s = window.getComputedStyle(el)
      if (s.overflowY === 'auto' || s.overflow === 'auto') {
        el.style.overflowY = 'hidden'
        const captured = el
        return () => { captured.style.overflowY = '' }
      }
      el = el.parentElement
    }
    return undefined
  }, [])

  // ─── ResizeObserver — calcul de la taille du canvas ──────────────────────
  useEffect(() => {
    if (!canvasAreaRef.current) return undefined
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // Carré : min(largeur - padding, hauteur - toolbar - légende)
      const size = Math.floor(Math.min(width - 32, height - 96))
      setCanvasSize(Math.max(360, Math.min(size, 900)))
    })
    obs.observe(canvasAreaRef.current)
    return () => obs.disconnect()
  }, [])

  // ─── Load folders ─────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    if (!team?.id) return
    setFolders(await fetchPlanFolders(team.id))
  }, [team?.id])

  useEffect(() => { loadFolders() }, [loadFolders])

  // ─── Select file ──────────────────────────────────────────────────────────
  function handleSelectFile(file: PlanFile) {
    setSelectedFile(file)
    canvas.resetToData(file.canvas_data ?? DEFAULT_CANVAS_DATA)
  }

  // ─── Autosave debounced 1500ms ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFile) return undefined
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      savePlanFile(selectedFile.id, canvas.data).catch(() => {})
    }, 1500)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [canvas.data, selectedFile?.id])

  async function handleSave() {
    if (!selectedFile) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSaving(true)
    await savePlanFile(selectedFile.id, canvas.data)
    setSaving(false)
  }

  // ─── Champion picker ──────────────────────────────────────────────────────
  function handleChampionSelect(tokenId: string, championName: string | null) {
    canvas.commit({
      ...canvas.data,
      tokens: canvas.data.tokens.map((t) =>
        t.id === tokenId ? { ...t, championName: championName ?? undefined } : t
      ),
    })
  }

  // ─── Folder/file CRUD ─────────────────────────────────────────────────────
  async function handleCreateFolder(name: string) {
    if (!team?.id) return
    await createPlanFolder(team.id, name)
    await loadFolders()
  }
  async function handleRenameFolder(folderId: string, name: string) {
    await renamePlanFolder(folderId, name)
    await loadFolders()
  }
  async function handleDeleteFolder(folderId: string) {
    if (selectedFile) {
      const folder = folders.find((f) => f.id === folderId)
      if (folder?.files?.some((f) => f.id === selectedFile.id)) {
        setSelectedFile(null); canvas.resetToData(DEFAULT_CANVAS_DATA)
      }
    }
    await deletePlanFolder(folderId)
    await loadFolders()
  }
  async function handleCreateFile(folderId: string, name: string) {
    if (!team?.id) return
    const file = await createPlanFile(folderId, team.id, name, DEFAULT_CANVAS_DATA)
    await loadFolders()
    if (file) handleSelectFile(file)
  }
  async function handleRenameFile(fileId: string, name: string) {
    await renamePlanFile(fileId, name)
    await loadFolders()
    if (selectedFile?.id === fileId) setSelectedFile((p) => p ? { ...p, name } : p)
  }
  async function handleDeleteFile(fileId: string) {
    if (selectedFile?.id === fileId) { setSelectedFile(null); canvas.resetToData(DEFAULT_CANVAS_DATA) }
    await deletePlanFile(fileId)
    await loadFolders()
  }

  return (
    // -m-6 annule le p-6 du TeamLayout, puis on prend tout l'écran
    <div
      ref={pageRef}
      className="-m-6 flex overflow-hidden"
      style={{ height: 'calc(100vh - 5rem)' }}
    >
      {/* Sidebar dossiers */}
      <PlansSidebar
        folders={folders}
        selectedFileId={selectedFile?.id ?? null}
        onSelectFile={handleSelectFile}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onCreateFile={handleCreateFile}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
      />

      {/* Zone canvas — prend tout l'espace restant */}
      <div ref={canvasAreaRef} className="flex-1 flex flex-col overflow-hidden bg-dark-bg">
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="shrink-0 px-4 pt-3 pb-0 space-y-1.5">
              <p className="text-xs text-gray-600 truncate">
                <span className="text-white font-medium">{selectedFile.name}</span>
                {saving && <span className="ml-2 text-accent-blue animate-pulse">Sauvegarde…</span>}
              </p>
              <PlansToolbar
                tool={canvas.tool}
                drawColor={canvas.drawColor}
                strokeWidth={canvas.strokeWidth}
                canUndo={canvas.canUndo}
                canRedo={canvas.canRedo}
                saving={saving}
                onTool={canvas.setTool}
                onColor={canvas.setDrawColor}
                onStrokeWidth={canvas.setStrokeWidth}
                onUndo={canvas.undo}
                onRedo={canvas.redo}
                onSave={handleSave}
                onReset={() => canvas.resetToData(DEFAULT_CANVAS_DATA)}
              />
            </div>

            {/* Canvas centré — flex-1 pour prendre l'espace restant */}
            <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 p-4">
              <MapCanvas
                data={canvas.data}
                tool={canvas.tool}
                drawColor={canvas.drawColor}
                strokeWidth={canvas.strokeWidth}
                size={canvasSize}
                onCommit={canvas.commit}
                onTokenClick={setPickerToken}
              />
            </div>

            {/* Légende */}
            <div className="shrink-0 flex items-center justify-center gap-5 pb-2 text-[11px] text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Bleue</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Rouge</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Ward</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-pink-500 inline-block" />Pink</span>
              <span className="text-gray-700">· Clic sur token (Select) → assigner champion</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center">
              <Map size={28} className="text-gray-600" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Aucun plan sélectionné</p>
              <p className="text-gray-500 text-sm max-w-xs">
                Crée un <span className="text-white font-medium">dossier</span> à gauche,
                puis un <span className="text-white font-medium">fichier</span> dedans pour commencer.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {['🖊 Crayon & Flèche', '👁 Wards verts / roses', '↩ Undo / Redo', '🧩 Champions par token'].map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border text-xs text-gray-500">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {pickerToken && (
        <ChampionPicker
          tokenId={pickerToken.id}
          currentChampion={pickerToken.championName}
          onSelect={handleChampionSelect}
          onClose={() => setPickerToken(null)}
        />
      )}
    </div>
  )
}
