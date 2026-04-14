/**
 * PlansSidebar — gestion des dossiers et fichiers de plans.
 * Les menus contextuels sont rendus via createPortal pour éviter
 * le clipping par overflow:hidden des conteneurs accordéon.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Folder, FilePlus, FolderPlus,
  ChevronRight, MoreHorizontal, Trash2, Pencil,
  FileText, PanelLeftOpen, PanelLeftClose, Map,
} from 'lucide-react'
import type { PlanFolder, PlanFile } from '../types'

interface Props {
  folders: PlanFolder[]
  selectedFileId: string | null
  onSelectFile: (file: PlanFile) => void
  onCreateFolder: (name: string) => Promise<void>
  onRenameFolder: (folderId: string, name: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onCreateFile: (folderId: string, name: string) => Promise<void>
  onRenameFile: (fileId: string, name: string) => Promise<void>
  onDeleteFile: (fileId: string) => Promise<void>
}

// ─── Context menu portal ─────────────────────────────────────────────────────
interface MenuPos { x: number; y: number }

interface ContextMenuProps {
  pos: MenuPos
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; dividerBefore?: boolean }[]
  onClose: () => void
}

function ContextMenu({ pos, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Ajuster pour ne pas déborder en bas
  const menuH = items.length * 34 + 16
  const viewH = window.innerHeight
  const top = pos.y + menuH > viewH ? pos.y - menuH : pos.y

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -6 }}
      transition={{ duration: 0.13, ease: [0.2, 0, 0, 1] }}
      style={{ position: 'fixed', left: pos.x, top, zIndex: 9999 }}
      className="w-44 bg-[#0f1623]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] py-1.5 overflow-hidden"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.dividerBefore && <div className="mx-3 my-1.5 h-px bg-white/8" />}
          <button
            onClick={() => { item.onClick(); onClose() }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
              item.danger
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-gray-300 hover:text-white hover:bg-white/6'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </motion.div>,
    document.body,
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function PlansSidebar({
  folders, selectedFileId,
  onSelectFile, onCreateFolder, onRenameFolder, onDeleteFolder,
  onCreateFile, onRenameFile, onDeleteFile,
}: Props) {
  const [open, setOpen]                   = useState(true)
  const [openFolders, setOpenFolders]     = useState<Record<string, boolean>>({})
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileFolder, setNewFileFolder] = useState<string | null>(null)
  const [newFileName, setNewFileName]     = useState('')
  const [renaming, setRenaming] = useState<{ type: 'folder' | 'file'; id: string; value: string } | null>(null)

  // Menu portal state
  const [activeMenu, setActiveMenu] = useState<{ id: string; pos: MenuPos } | null>(null)

  function openMenu(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setActiveMenu({ id, pos: { x: r.right + 4, y: r.top - 4 } })
  }

  const closeMenu = useCallback(() => setActiveMenu(null), [])

  function toggleFolder(id: string) {
    setOpenFolders((p) => ({ ...p, [id]: !p[id] }))
  }

  async function submitCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    await onCreateFolder(newFolderName.trim())
    setNewFolderName(''); setNewFolderMode(false)
  }

  async function submitCreateFile(e: React.FormEvent) {
    e.preventDefault()
    if (!newFileFolder || !newFileName.trim()) return
    await onCreateFile(newFileFolder, newFileName.trim())
    setNewFileName(''); setNewFileFolder(null)
  }

  async function submitRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renaming?.value.trim()) return
    if (renaming.type === 'folder') await onRenameFolder(renaming.id, renaming.value.trim())
    else await onRenameFile(renaming.id, renaming.value.trim())
    setRenaming(null)
  }

  // ─── Collapsed strip ────────────────────────────────────────────────────
  if (!open) {
    return (
      <motion.aside
        key="closed"
        initial={{ width: '14rem' }}
        animate={{ width: '2.75rem' }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 flex flex-col items-center border-r border-white/6 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0c1320 0%, #0a1019 100%)' }}
      >
        <div className="flex flex-col items-center py-3 gap-1.5">
          <button
            onClick={() => setOpen(true)}
            title="Ouvrir les plans"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-600 hover:text-accent-blue hover:bg-accent-blue/12 transition-all"
          >
            <PanelLeftOpen size={15} />
          </button>
          <div className="w-5 h-px bg-white/6 my-1" />
          <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center">
            <Map size={13} className="text-accent-blue/70" />
          </div>
        </div>
      </motion.aside>
    )
  }

  // ─── Full sidebar ────────────────────────────────────────────────────────
  return (
    <>
      <motion.aside
        key="open"
        initial={{ width: '2.75rem' }}
        animate={{ width: '15rem' }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 flex flex-col border-r border-white/6 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0c1320 0%, #0a1019 100%)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-white/6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.15) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Map size={13} className="text-accent-blue" />
            </div>
            <span className="flex-1 text-[13px] font-semibold text-white tracking-tight">Plans</span>
            <button
              onClick={() => { setNewFolderMode(true); closeMenu() }}
              title="Nouveau dossier"
              className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-accent-blue hover:bg-accent-blue/12 rounded-lg transition-all shrink-0"
            >
              <FolderPlus size={13} />
            </button>
            <button
              onClick={() => setOpen(false)}
              title="Réduire"
              className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/8 rounded-lg transition-all shrink-0"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 scrollbar-thin">

          {/* New folder form */}
          <AnimatePresence>
            {newFolderMode && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                onSubmit={submitCreateFolder}
                className="overflow-hidden mb-1"
              >
                <div className="flex gap-1.5 p-1">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && (setNewFolderMode(false), setNewFolderName(''))}
                    placeholder="Nom du dossier…"
                    className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(59,130,246,0.6)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <button type="submit"
                    className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                  >
                    OK
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {folders.length === 0 && !newFolderMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-10 px-3 text-center"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}
              >
                <FolderPlus size={18} className="text-accent-blue/50" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Aucun dossier</p>
                <button
                  onClick={() => setNewFolderMode(true)}
                  className="text-xs text-accent-blue hover:text-blue-300 transition-colors font-medium"
                >
                  Créer le premier →
                </button>
              </div>
            </motion.div>
          )}

          {/* Folder list */}
          {folders.map((folder, folderIdx) => {
            const isFolderOpen = !!openFolders[folder.id]
            const files        = folder.files ?? []

            return (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: folderIdx * 0.04, duration: 0.2 }}
              >
                {/* Folder row */}
                <div
                  onClick={() => toggleFolder(folder.id)}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer select-none transition-all ${
                    isFolderOpen
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/4'
                  }`}
                  style={isFolderOpen ? { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' } : { border: '1px solid transparent' }}
                >
                  <motion.div
                    animate={{ rotate: isFolderOpen ? 90 : 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="shrink-0"
                  >
                    <ChevronRight size={11} className={isFolderOpen ? 'text-accent-blue/70' : 'text-gray-700'} />
                  </motion.div>

                  {isFolderOpen
                    ? <FolderOpen size={13} className="text-accent-blue shrink-0" />
                    : <Folder size={13} className="text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" />
                  }

                  {/* Inline rename */}
                  {renaming?.type === 'folder' && renaming.id === folder.id ? (
                    <form onSubmit={submitRename} className="flex-1 min-w-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renaming.value}
                        onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                        onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                        className="flex-1 min-w-0 bg-dark-bg border border-accent-blue rounded-md px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button type="submit" className="shrink-0 px-1.5 py-0.5 bg-accent-blue text-white rounded-md text-xs font-bold">✓</button>
                    </form>
                  ) : (
                    <span className="flex-1 min-w-0 text-xs font-medium tracking-tight truncate">{folder.name}</span>
                  )}

                  {files.length > 0 && !renaming && (
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(156,163,175,0.8)' }}
                    >
                      {files.length}
                    </span>
                  )}

                  {/* Menu trigger */}
                  <button
                    onClick={(e) => openMenu(`folder-${folder.id}`, e)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-600 hover:text-white rounded-lg transition-all shrink-0"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <MoreHorizontal size={12} />
                  </button>
                </div>

                {/* Files accordion */}
                <AnimatePresence initial={false}>
                  {isFolderOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'visible' }}
                    >
                      <div className="ml-5 mt-1 mb-1 space-y-0.5 pl-2"
                        style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {files.map((file) => {
                          const isSelected = file.id === selectedFileId

                          return (
                            <div
                              key={file.id}
                              onClick={() => onSelectFile(file)}
                              className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer select-none transition-all ${
                                isSelected ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                              }`}
                              style={isSelected
                                ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)' }
                                : { border: '1px solid transparent', background: 'transparent' }
                              }
                              onMouseEnter={(e) => {
                                if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                              }}
                            >
                              {isSelected && (
                                <motion.div
                                  layoutId="file-indicator"
                                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                                  style={{ background: 'linear-gradient(180deg, #3b82f6, #6366f1)' }}
                                />
                              )}

                              <FileText size={11} className="shrink-0" />

                              {renaming?.type === 'file' && renaming.id === file.id ? (
                                <form onSubmit={submitRename} className="flex-1 min-w-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    autoFocus
                                    value={renaming.value}
                                    onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                                    className="flex-1 min-w-0 bg-dark-bg border border-accent-blue rounded-md px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                  />
                                  <button type="submit" className="shrink-0 px-1.5 py-0.5 bg-accent-blue text-white rounded-md text-xs font-bold">✓</button>
                                </form>
                              ) : (
                                <span className="flex-1 min-w-0 text-xs truncate font-medium">{file.name}</span>
                              )}

                              {/* File menu trigger */}
                              <button
                                onClick={(e) => openMenu(`file-${file.id}`, e)}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-600 hover:text-white rounded-lg transition-all shrink-0"
                              >
                                <MoreHorizontal size={11} />
                              </button>
                            </div>
                          )
                        })}

                        {/* New file input */}
                        <AnimatePresence>
                          {newFileFolder === folder.id ? (
                            <motion.form
                              key="new-file-form"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              onSubmit={submitCreateFile}
                              style={{ overflow: 'visible' }}
                            >
                              <div className="flex gap-1 py-1">
                                <input
                                  autoFocus
                                  value={newFileName}
                                  onChange={(e) => setNewFileName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Escape' && setNewFileFolder(null)}
                                  placeholder="Nom…"
                                  className="flex-1 min-w-0 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors"
                                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                                <button type="submit"
                                  className="shrink-0 px-2 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                                >OK</button>
                              </div>
                            </motion.form>
                          ) : (
                            <button
                              key="new-file-btn"
                              onClick={() => { setNewFileFolder(folder.id); setNewFileName('') }}
                              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-700 hover:text-gray-400 rounded-xl transition-all"
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                            >
                              <FilePlus size={11} />
                              <span>Nouveau fichier</span>
                            </button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-2 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { setNewFolderMode(true); closeMenu() }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-gray-600 hover:text-gray-300 transition-all"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <FolderPlus size={12} />
            <span className="font-medium">Nouveau dossier</span>
          </button>
        </div>
      </motion.aside>

      {/* Context menus via portal */}
      <AnimatePresence>
        {activeMenu && (() => {
          const id = activeMenu.id

          if (id.startsWith('folder-')) {
            const folderId = id.replace('folder-', '')
            const folder   = folders.find((f) => f.id === folderId)
            if (!folder) return null
            return (
              <ContextMenu
                key={id}
                pos={activeMenu.pos}
                onClose={closeMenu}
                items={[
                  {
                    label: 'Nouveau fichier',
                    icon: <FilePlus size={12} className="text-accent-blue" />,
                    onClick: () => { setNewFileFolder(folderId); setOpenFolders((p) => ({ ...p, [folderId]: true })) },
                  },
                  {
                    label: 'Renommer',
                    icon: <Pencil size={12} className="text-gray-500" />,
                    onClick: () => setRenaming({ type: 'folder', id: folderId, value: folder.name }),
                  },
                  {
                    label: 'Supprimer',
                    icon: <Trash2 size={12} />,
                    onClick: () => onDeleteFolder(folderId),
                    danger: true,
                    dividerBefore: true,
                  },
                ]}
              />
            )
          }

          if (id.startsWith('file-')) {
            const fileId = id.replace('file-', '')
            const file   = folders.flatMap((f) => f.files ?? []).find((f) => f.id === fileId)
            if (!file) return null
            return (
              <ContextMenu
                key={id}
                pos={activeMenu.pos}
                onClose={closeMenu}
                items={[
                  {
                    label: 'Renommer',
                    icon: <Pencil size={12} className="text-gray-500" />,
                    onClick: () => setRenaming({ type: 'file', id: fileId, value: file.name }),
                  },
                  {
                    label: 'Supprimer',
                    icon: <Trash2 size={12} />,
                    onClick: () => onDeleteFile(fileId),
                    danger: true,
                    dividerBefore: true,
                  },
                ]}
              />
            )
          }

          return null
        })()}
      </AnimatePresence>
    </>
  )
}
