/**
 * ImportPage — Option A : LCU Direct Import | Option B : Import JSON
 * ⚡ Option A nécessite npm run dev (backend local :3001) + League of Legends ouvert
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, FileJson, AlertCircle, CheckCircle, Clock, HelpCircle,
  ChevronDown, ChevronUp, ExternalLink, Swords, Trophy, Sparkles,
  MousePointerClick, LayoutList, Wifi, WifiOff, RefreshCw, Download,
  CheckSquare, Square, User, Activity, XCircle, Zap,
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches, invalidateFullCache } from '../hooks/useTeamMatches'
import { useTeamBlocks } from '../hooks/useTeamBlocks'
import { importExaltyMatches } from '../../../lib/team/exaltyMatchImporter'
import {
  parseTimeline,
  getTimelineDemoSummary,
  getSnapshotsAtMinutes,
} from '../../../lib/team/exaltyTimelineParser'
import { supabase } from '../../../lib/supabase'
import { detectBlocks } from '../../../lib/team/blockDetector'
import { AutoBlockProposal } from '../matchs/components/AutoBlockProposal'
import { CreateBlockModal } from '../matchs/components/CreateBlockModal'
import type { DetectedBlock } from '../../../types/matchBlocks'

const BACKEND_LOCAL = 'http://localhost:3001'

// ─── Types LCU ────────────────────────────────────────────────────────────────

interface Summoner {
  displayName: string
  summonerLevel: number
  profileIconId: number
  puuid: string
  port: number
}

interface LcuGame {
  gameId: number
  gameCreation: number
  gameDuration: number
  gameMode: string
  participants: { summonerName: string }[]
  _raw: any
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m${s.toString().padStart(2, '0')}`
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ files, onFiles, accept, color }: {
  files: File[]
  onFiles: (files: File[]) => void
  accept: string
  color: 'blue' | 'amber' | 'purple'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const borderColor = { blue: 'hover:border-accent-blue/50', amber: 'hover:border-amber-500/50', purple: 'hover:border-purple-500/50' }[color]

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer?.files || []) as File[]
    if (items.length > 0) onFiles(items)
  }, [onFiles])

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple onChange={(e) => {
        const items = Array.from(e.target?.files || []) as File[]
        if (items.length > 0) onFiles(items)
        e.target.value = ''
      }} className="hidden" />
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed border-dark-border rounded-xl p-6 text-center ${borderColor} transition-colors cursor-pointer`}
      >
        <Upload size={28} className="mx-auto text-gray-500 mb-2" />
        <p className="text-gray-400 text-sm">
          {files.length > 0 ? `${files.length} fichier(s) prêt(s)` : `Glissez vos fichiers ici ou cliquez`}
        </p>
        <p className="text-gray-600 text-xs mt-1">{accept.replace(/,/g, ' · ')}</p>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {files.map((f, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-dark-bg rounded-lg text-gray-400">{f.name}</span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Guide d'import (accordion) ──────────────────────────────────────────────

function ImportGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-bg/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle size={16} className="text-accent-blue" />
          <span className="font-semibold text-white">Comment ça marche ?</span>
          <span className="text-xs text-gray-500">Guide d'import</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-dark-border px-5 pb-5 pt-4 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            Deux méthodes pour importer vos scrims et tournois. Choisissez celle qui correspond à votre setup.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A — LCU Direct */}
            <div className="bg-dark-bg/50 border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">Option A</span>
                <span className="text-sm font-semibold text-white">LCU Direct Import</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Recommandé</span>
              </div>
              <p className="text-xs text-gray-500">Connecte-toi directement à League of Legends sur ton PC.</p>
              <ol className="space-y-2">
                {([
                  { text: 'Lance npm run dev dans le terminal (backend local requis)' },
                  { text: 'Ouvre League of Legends sur ton PC' },
                  { text: <>Trouve le fichier <code className="bg-dark-card px-1 rounded text-gray-300">lockfile</code> dans le dossier d'installation League (<code className="bg-dark-card px-1 rounded text-gray-300">C:\Riot Games\League of Legends\lockfile</code>)</> },
                  { text: 'Colle le contenu du lockfile ci-dessous et clique "Se connecter"' },
                  { text: 'Sélectionne les parties à importer dans la liste et clique Importer' },
                ] as { text: React.ReactNode }[]).map(({ text }, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-gray-400">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[10px] text-gray-600 pt-2 border-t border-dark-border">
                ⚡ Importe le match <span className="text-gray-400">et</span> la timeline en un seul clic
              </p>
            </div>

            {/* Option B — JSON */}
            <div className="bg-dark-bg/50 border border-accent-blue/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-blue/20 text-accent-blue">Option B</span>
                <span className="text-sm font-semibold text-white">Import JSON</span>
              </div>
              <p className="text-xs text-gray-500">Exporte manuellement les parties depuis LCU Explorer.</p>
              <ol className="space-y-2">
                {([
                  { text: <>Ouvre <span className="text-white font-medium">LCU Explorer</span> pendant ou juste après la partie</> },
                  { text: <>Navigue vers <code className="bg-dark-card px-1 rounded text-gray-300">/lol-match-history/v1/games</code> et repère l'ID de la partie</> },
                  { text: <>Exporte le JSON et renomme-le <code className="bg-dark-card px-1 rounded text-gray-300">Scrim1.json</code> (scrim) ou <code className="bg-dark-card px-1 rounded text-gray-300">tr1.json</code> (tournoi)</> },
                  { text: 'Glisse le(s) fichier(s) dans la zone de dépôt ci-dessous' },
                ] as { text: React.ReactNode }[]).map(({ text }, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-gray-400">
                    <span className="w-4 h-4 rounded-full bg-accent-blue/20 text-accent-blue text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[10px] text-gray-600 pt-2 border-t border-dark-border">
                📁 Formats acceptés : <code>.json</code> · <code>.txt</code> · <code>.csv</code> — plusieurs fichiers en même temps
              </p>
            </div>
          </div>

          {/* Ce qui est importé */}
          <div className="bg-dark-bg/30 border border-dark-border rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Ce qui est importé automatiquement</p>
            <div className="flex flex-wrap gap-2">
              {['KDA par joueur', 'Champions joués', 'Rôles', 'Dégâts & Or', 'CS & Vision', 'Victoire / Défaite', 'Durée de partie'].map((item) => (
                <span key={item} className="text-[11px] px-2.5 py-1 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mode d'import JSON ───────────────────────────────────────────────────────

type ImportMode = 'simple' | 'auto' | 'manual'

const IMPORT_MODES: { id: ImportMode; label: string; Icon: React.ElementType; desc: string }[] = [
  { id: 'simple', label: 'Simple',  Icon: LayoutList,        desc: 'Import sans groupement' },
  { id: 'auto',   label: 'Auto',    Icon: Sparkles,          desc: 'Détection auto des sessions' },
  { id: 'manual', label: 'Manuel',  Icon: MousePointerClick, desc: 'Sélection manuelle des parties' },
]

// ─── Carte d'import JSON (Scrim + Tournament) ─────────────────────────────────

function MatchImportCard({
  type, players, teamId, allMatches, onImported, onBlocksRefetch,
}: {
  type: 'scrim' | 'tournament'
  players: any[]
  teamId: string
  allMatches: any[]
  onImported: () => void
  onBlocksRefetch: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('simple')
  const [parsedGameIds, setParsedGameIds] = useState<number[]>([])
  const [detectedBlocks, setDetectedBlocks] = useState<DetectedBlock[]>([])
  const [manualSelected, setManualSelected] = useState<Set<number>>(new Set())
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [showProposal, setShowProposal] = useState(false)

  const isScrim = type === 'scrim'
  const icon = isScrim ? <Swords size={22} className="text-accent-blue" /> : <Trophy size={22} className="text-amber-400" />
  const label = isScrim ? 'Import Scrim' : 'Import Tournament'
  const modelFile = isScrim ? 'Scrim1.json' : 'tr1.json'
  const borderHover = isScrim ? 'hover:border-accent-blue/40' : 'hover:border-amber-500/40'
  const btnColor = isScrim ? 'bg-accent-blue hover:bg-accent-blue/90' : 'bg-amber-500 hover:bg-amber-500/90'
  const helpStepColor = isScrim ? 'text-accent-blue' : 'text-amber-400'

  const handleImport = async () => {
    if (!teamId || files.length === 0) return
    setImporting(true)
    setError(null)
    setSuccess(null)
    setDetectedBlocks([])
    setManualSelected(new Set())
    setShowProposal(false)
    try {
      const teamPlayers = players.map((p) => ({ id: p.id, pseudo: p.pseudo, secondary_account: p.secondary_account, position: p.position }))
      const originals: any[] = []
      for (const f of files) {
        const text = await f.text()
        const json = JSON.parse(text)
        originals.push(...(Array.isArray(json) ? json : [json]))
      }
      const res = await importExaltyMatches(originals, teamId, teamPlayers, type)
      if (res.errors?.length > 0) {
        setError(res.errors.join(' — '))
      } else {
        setSuccess(`${res.imported} partie(s) importée(s)${res.skipped > 0 ? ` · ${res.skipped} déjà présente(s)` : ''}`)
        if (res.imported > 0) {
          const gameIds = originals.map((m) => Number(m.gameId || m.metadata?.matchId || 0)).filter(Boolean)
          setParsedGameIds(gameIds)
          const forDetect = originals.map((m) => ({ id: String(m.gameId ?? ''), game_id: Number(m.gameId ?? 0), game_creation: m.gameCreation ?? null, game_duration: m.gameDuration ?? null }))
          if (importMode === 'auto') { const detected = detectBlocks(forDetect); setDetectedBlocks(detected); setShowProposal(true) }
          else if (importMode === 'manual') { setManualSelected(new Set(forDetect.map((m) => m.game_id))); setShowProposal(true) }
          onImported()
        }
      }
      setFiles([])
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  const resolveMatchIds = (gameIds: number[]) =>
    allMatches.filter((m) => gameIds.includes(Number(m.game_id))).map((m) => m.id as string)

  return (
    <div className={`bg-dark-card border border-dark-border rounded-2xl p-6 ${borderHover} transition-colors`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${isScrim ? 'bg-accent-blue/15' : 'bg-amber-500/15'}`}>{icon}</div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-white">{label}</h3>
          <p className="text-sm text-gray-500">Fichier JSON · Modèle : <code className="text-gray-400">{modelFile}</code></p>
        </div>
        <button onClick={() => setShowHelp((v) => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-dark-bg transition-colors">
          <HelpCircle size={13} />Aide{showHelp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mode de groupement</p>
        <div className="flex gap-2">
          {IMPORT_MODES.map(({ id, label: mLabel, Icon, desc }) => (
            <button key={id} onClick={() => { setImportMode(id); setShowProposal(false) }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border text-xs font-medium transition-colors ${importMode === id ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue' : 'border-dark-border text-gray-500 hover:text-gray-300 bg-dark-bg/40'}`}
              title={desc}>
              <Icon size={13} />{mLabel}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">{IMPORT_MODES.find((m) => m.id === importMode)?.desc}</p>
      </div>

      {showHelp && (
        <div className="mb-5 p-4 bg-dark-bg/60 border border-dark-border rounded-xl text-sm space-y-2">
          <p className="font-medium text-gray-300">Comment obtenir le fichier ?</p>
          <ol className="space-y-1.5 text-gray-400">
            <li className="flex gap-2"><span className={`${helpStepColor} font-bold shrink-0`}>1.</span>Jouez votre {isScrim ? 'scrim' : 'tournoi'} sur League of Legends.</li>
            <li className="flex gap-2"><span className={`${helpStepColor} font-bold shrink-0`}>2.</span>Ouvrez <span className="text-white font-medium">LCU Explorer</span> et récupérez l'ID de partie depuis <code className="bg-dark-card px-1 rounded">/lol-match-history/v1/games</code>.</li>
            <li className="flex gap-2"><span className={`${helpStepColor} font-bold shrink-0`}>3.</span>Exportez le JSON et nommez-le <code className="bg-dark-card px-1 rounded">{modelFile}</code>.</li>
            <li className="flex gap-2"><span className={`${helpStepColor} font-bold shrink-0`}>4.</span>Importez le fichier ici. Vous pouvez en déposer plusieurs.</li>
          </ol>
          <p className="text-xs text-gray-600 pt-1 border-t border-dark-border">Formats acceptés : <code>.json</code> · <code>.txt</code> · <code>.csv</code></p>
        </div>
      )}

      <DropZone files={files} onFiles={setFiles} accept=".json,.txt,.csv" color={isScrim ? 'blue' : 'amber'} />

      {error && <div className="mt-3 p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={15} className="text-red-400 shrink-0" />{error}</div>}
      {success && <div className="mt-3 p-3 bg-green-500/15 border border-green-500/40 rounded-xl flex items-center gap-2 text-sm"><CheckCircle size={15} className="text-green-400 shrink-0" />{success}</div>}

      <button onClick={handleImport} disabled={importing || files.length === 0}
        className={`mt-4 w-full py-2.5 ${btnColor} text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors`}>
        {importing ? <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full inline-block" />Import en cours...</> : <><CheckCircle size={16} />Importer en {isScrim ? 'Scrim' : 'Tournament'}</>}
      </button>

      {importMode === 'auto' && showProposal && (
        detectedBlocks.length > 0
          ? <AutoBlockProposal teamId={teamId} detected={detectedBlocks} allMatches={allMatches} onDone={() => { setShowProposal(false); onBlocksRefetch() }} />
          : <div className="mt-4 p-3 bg-dark-bg/50 border border-dark-border rounded-xl text-xs text-gray-500 text-center">Aucun groupe détecté (parties trop espacées dans le temps).</div>
      )}

      {importMode === 'manual' && showProposal && parsedGameIds.length > 0 && (
        <div className="mt-4 p-4 bg-dark-bg/50 border border-accent-blue/20 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-accent-blue"><MousePointerClick size={12} className="inline mr-1" />Sélectionnez les parties à grouper</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {allMatches.filter((m) => parsedGameIds.includes(Number(m.game_id))).map((m) => {
              const dateStr = m.game_creation ? new Date(m.game_creation).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
              const checked = manualSelected.has(Number(m.game_id))
              return (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-dark-bg transition-colors">
                  <input type="checkbox" checked={checked} onChange={() => setManualSelected((prev) => { const next = new Set(prev); if (next.has(Number(m.game_id))) next.delete(Number(m.game_id)); else next.add(Number(m.game_id)); return next })} className="accent-accent-blue" />
                  <span className={`text-xs font-medium ${m.our_win ? 'text-green-400' : 'text-red-400'}`}>{m.our_win ? 'V' : 'D'}</span>
                  <span className="text-xs text-gray-400 flex-1">{dateStr}</span>
                </label>
              )
            })}
          </div>
          <button onClick={() => setCreateModalOpen(true)} disabled={manualSelected.size === 0} className="w-full py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
            Créer un bloc avec {manualSelected.size} partie{manualSelected.size > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {createModalOpen && (
        <CreateBlockModal teamId={teamId} prefillMatchIds={resolveMatchIds([...manualSelected])} onClose={() => setCreateModalOpen(false)}
          onSaved={() => { setCreateModalOpen(false); setShowProposal(false); onBlocksRefetch() }} />
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const ImportPage = () => {
  const { team, players = [], refetch: refetchTeam } = useTeam()
  const { matches = [], refetch: refetchMatches } = useTeamMatches(team?.id)
  const { refetch: refetchBlocks } = useTeamBlocks(team?.id)

  // ── État Option B (JSON) ────────────────────────────────────────────────────
  const [showLCUGuide, setShowLCUGuide] = useState(false)
  const [filesTimeline, setFilesTimeline] = useState<File[]>([])
  const [parsedTimelines, setParsedTimelines] = useState<any[]>([])
  const [timelineMatchId, setTimelineMatchId] = useState('')
  const [savingTimeline, setSavingTimeline] = useState(false)
  const [timelineSaveMsg, setTimelineSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showHelpTimeline, setShowHelpTimeline] = useState(false)

  // ── État Option A (LCU) ─────────────────────────────────────────────────────
  const [lockfile, setLockfile] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [summoner, setSummoner] = useState<Summoner | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [lockfileOpen, setLockfileOpen] = useState(true)
  const [games, setGames] = useState<LcuGame[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [lcuMatchType, setLcuMatchType] = useState<'scrim' | 'tournament'>('scrim')
  const [lcuImporting, setLcuImporting] = useState(false)
  const [lcuImportResult, setLcuImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  type TlStatus = { status: 'idle' | 'loading' | 'success' | 'no-match' | 'error'; message?: string; summary?: { durationMin: number; kills: number; dragons: number } }
  const [tlStatuses, setTlStatuses] = useState<Record<number, TlStatus>>({})
  const [downloadingTlId, setDownloadingTlId] = useState<number | null>(null)

  // ── Handlers Option B (JSON Timeline) ──────────────────────────────────────

  async function parseOneTimelineFile(file: File) {
    try {
      const text = await file.text()
      const parsed = parseTimeline(text, { filename: file.name })
      if (!parsed) return null
      const demo = getTimelineDemoSummary(parsed)
      const gameId = demo?.gameId != null ? String(demo.gameId) : null
      return { parsed, demo, gameId }
    } catch { return null }
  }

  function resolveTimelineMatches(items: any[], matchesList: any[]) {
    if (!items.length || !matchesList?.length) return items
    return items.map((item, index) => {
      let matchId = null, matchBy = null
      if (item.gameId) { const m = matchesList.find((m) => String(m.game_id) === String(item.gameId)); if (m) { matchId = m.id; matchBy = 'nom' } }
      if (!matchId && index < matchesList.length) { matchId = matchesList[index].id; matchBy = 'ordre' }
      return { ...item, matchId, matchBy }
    })
  }

  const handleFilesTimeline = useCallback((items: File[]) => {
    setFilesTimeline(items)
    setTimelineSaveMsg(null)
    Promise.all(items.map((f) => parseOneTimelineFile(f))).then((results) => {
      const withFile = results.map((r, i) => (r ? { file: items[i], ...r } : null)).filter(Boolean)
      const resolved = resolveTimelineMatches(withFile, matches)
      setParsedTimelines(resolved)
      if (resolved.length === 1 && resolved[0].matchId) setTimelineMatchId(resolved[0].matchId)
      else if (resolved.length === 1) setTimelineMatchId('')
    })
  }, [matches])

  useEffect(() => {
    if (parsedTimelines.length === 0 || !matches?.length) return
    const resolved = resolveTimelineMatches(parsedTimelines.map(({ file, parsed, demo, gameId }) => ({ file, parsed, demo, gameId })), matches)
    setParsedTimelines(resolved)
    if (resolved.length === 1 && resolved[0].matchId) setTimelineMatchId(resolved[0].matchId)
  }, [matches?.length])

  const handleSaveTimeline = async () => {
    const single = parsedTimelines[0]
    if (!single?.parsed || !timelineMatchId) return
    setSavingTimeline(true)
    setTimelineSaveMsg(null)
    try {
      const snapshot = getSnapshotsAtMinutes(single.parsed, [5, 10, 15, 20, 25])
      const { error } = await supabase.from('team_match_timeline').upsert({ match_id: timelineMatchId, snapshot }, { onConflict: 'match_id' })
      if (error) throw error
      setTimelineSaveMsg({ ok: true, text: 'Timeline enregistrée. Consultez "Stats timeline" sur la page du match.' })
      refetchMatches()
    } catch (e: any) {
      setTimelineSaveMsg({ ok: false, text: e.message || "Erreur lors de l'enregistrement." })
    } finally { setSavingTimeline(false) }
  }

  const handleSaveAllTimelines = async () => {
    const toSave = parsedTimelines.filter((t) => t.matchId)
    if (!toSave.length) return
    setSavingTimeline(true)
    setTimelineSaveMsg(null)
    try {
      for (const t of toSave) {
        const snapshot = getSnapshotsAtMinutes(t.parsed, [5, 10, 15, 20, 25])
        const { error } = await supabase.from('team_match_timeline').upsert({ match_id: t.matchId, snapshot }, { onConflict: 'match_id' })
        if (error) throw error
      }
      setTimelineSaveMsg({ ok: true, text: `${toSave.length} timeline(s) enregistrée(s).` })
      refetchMatches()
    } catch (e: any) {
      setTimelineSaveMsg({ ok: false, text: e.message || 'Erreur.' })
    } finally { setSavingTimeline(false) }
  }

  // ── Handlers Option A (LCU) ─────────────────────────────────────────────────

  async function handleConnect() {
    if (!lockfile.trim()) return
    setConnecting(true)
    setConnectError(null)
    setSummoner(null)
    setGames([])
    setSelected(new Set())
    try {
      const res = await fetch(`${BACKEND_LOCAL}/api/lcu/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lockfile: lockfile.trim() }) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSummoner({ ...data.summoner, port: data.port })
      setLockfileOpen(false)
    } catch (err: any) {
      setConnectError(err.message || 'Erreur de connexion')
    } finally { setConnecting(false) }
  }

  async function handleLoadGames() {
    if (!summoner) return
    setLoadingGames(true)
    setGamesError(null)
    setGames([])
    setSelected(new Set())
    setLcuImportResult(null)
    try {
      const res = await fetch(`${BACKEND_LOCAL}/api/lcu/matches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password: lockfile.trim().split(':')[3], puuid: summoner.puuid }) })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setGames(data.games)
      if (data.games.length === 0) setGamesError('Aucune custom game trouvée dans l\'historique.')
    } catch (err: any) {
      setGamesError(err.message || 'Erreur lors du chargement des games')
    } finally { setLoadingGames(false) }
  }

  async function handleLcuImport() {
    if (!selected.size || !team?.id || !players?.length || !summoner) return
    setLcuImporting(true)
    setLcuImportResult(null)
    try {
      const password = lockfile.trim().split(':')[3]
      const selectedGames = games.filter(g => selected.has(g.gameId))
      const fullGames: any[] = []
      for (const g of selectedGames) {
        try {
          const res = await fetch(`${BACKEND_LOCAL}/api/lcu/game`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password, gameId: g.gameId }) })
          const data = await res.json()
          fullGames.push(data.success && data.game ? data.game : g._raw)
        } catch { fullGames.push(g._raw) }
      }
      const result = await importExaltyMatches(fullGames, team.id, players, lcuMatchType)
      setLcuImportResult(result)
      setSelected(new Set())
    } catch (err: any) {
      setLcuImportResult({ imported: 0, skipped: 0, errors: [err.message] })
    } finally { setLcuImporting(false) }
  }

  async function handleDownloadJson(game: LcuGame, e: React.MouseEvent) {
    e.stopPropagation()
    if (!summoner) return
    setDownloadingId(game.gameId)
    try {
      const password = lockfile.trim().split(':')[3]
      const res = await fetch(`${BACKEND_LOCAL}/api/lcu/game`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password, gameId: game.gameId }) })
      const data = await res.json()
      const json = data.success && data.game ? data.game : game._raw
      const date = new Date(game.gameCreation).toISOString().slice(0, 10)
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `game_${game.gameId}_${date}.json`; a.click()
      URL.revokeObjectURL(url)
    } finally { setDownloadingId(null) }
  }

  async function handleDownloadTimeline(game: LcuGame) {
    if (!summoner) return
    const password = lockfile.trim().split(':')[3]
    setDownloadingTlId(game.gameId)
    try {
      const res = await fetch(`${BACKEND_LOCAL}/api/lcu/timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password, gameId: game.gameId }) })
      const data = await res.json()
      const json = data.success && data.timeline ? data.timeline : {}
      const date = new Date(game.gameCreation).toISOString().slice(0, 10)
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `timeline_${game.gameId}_${date}.json`; a.click()
      URL.revokeObjectURL(url)
    } finally { setDownloadingTlId(null) }
  }

  async function handleImportTimeline(game: LcuGame) {
    if (!summoner || !team?.id || !players?.length) return
    const password = lockfile.trim().split(':')[3]
    setTlStatuses(prev => ({ ...prev, [game.gameId]: { status: 'loading' } }))
    try {
      const [tlRes, gameRes] = await Promise.all([
        fetch(`${BACKEND_LOCAL}/api/lcu/timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password, gameId: game.gameId }) }),
        fetch(`${BACKEND_LOCAL}/api/lcu/game`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port: summoner.port, password, gameId: game.gameId }) }),
      ])
      const [tlData, gameData] = await Promise.all([tlRes.json(), gameRes.json()])
      if (!tlData.success) throw new Error(tlData.error || 'Erreur LCU timeline')
      const parsed = parseTimeline(tlData.timeline)
      if (!parsed) throw new Error('Format timeline invalide (frames manquantes)')
      const snapshot = getSnapshotsAtMinutes(parsed)
      let { data: matchRow } = await supabase!.from('team_matches').select('id').eq('team_id', team.id).eq('game_id', game.gameId).maybeSingle()
      if (!matchRow) {
        const fullGame = gameData.success && gameData.game ? gameData.game : game._raw
        const importRes = await importExaltyMatches([fullGame], team.id, players, lcuMatchType)
        if (importRes.errors.length && !importRes.imported) throw new Error(`Import match échoué : ${importRes.errors[0]}`)
        const { data: newRow } = await supabase!.from('team_matches').select('id').eq('team_id', team.id).eq('game_id', game.gameId).maybeSingle()
        matchRow = newRow
      }
      if (!matchRow) throw new Error('Match introuvable après import')
      const { error: upsertErr } = await supabase!.from('team_match_timeline').upsert({ match_id: matchRow.id, snapshot }, { onConflict: 'match_id' })
      if (upsertErr) throw new Error(upsertErr.message)
      setTlStatuses(prev => ({ ...prev, [game.gameId]: { status: 'success', summary: { durationMin: parsed.summary?.durationMin ?? 0, kills: parsed.summary?.kills ?? 0, dragons: parsed.summary?.dragons ?? 0 } } }))
    } catch (err: any) {
      setTlStatuses(prev => ({ ...prev, [game.gameId]: { status: 'error', message: err.message } }))
    }
  }

  function toggleSelect(gameId: number) {
    setSelected(prev => { const next = new Set(prev); next.has(gameId) ? next.delete(gameId) : next.add(gameId); return next })
  }

  function toggleAll() {
    setSelected(prev => prev.size === games.length ? new Set() : new Set(games.map(g => g.gameId)))
  }

  const handleImported = async () => {
    if (team?.id) invalidateFullCache(team.id)
    await refetchMatches()
    refetchTeam?.()
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 px-2">

      {/* Header équipe */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className={`shrink-0 w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden ${team.logo_url ? 'border-dark-border bg-white' : 'border-dark-border bg-dark-bg/80'}`}>
            {team.logo_url
              ? <img src={team.logo_url} alt={team.team_name} className="w-full h-full object-contain p-1.5" />
              : <span className="text-xl font-bold text-gray-600">{(team.team_name || 'E').charAt(0)}</span>}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white leading-tight">{team.team_name}</h1>
            <h2 className="font-display text-xl font-semibold text-gray-300 mt-0.5">Import</h2>
            <p className="text-gray-500 text-sm mt-0.5">Importez vos parties d'équipe pour alimenter les statistiques</p>
          </div>
        </div>
      </div>

      {/* Guide d'import */}
      <ImportGuide />

      {/* ═══════════════════════════════════════════════════════════════════════
          OPTION A — LCU Direct Import
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Option A
          </span>
          <Zap size={16} className="text-emerald-400" />
          <h2 className="font-display text-lg font-bold text-white">LCU Direct Import</h2>
          <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Recommandé — le plus rapide
          </span>
          <span className="ml-auto text-xs text-gray-600">⚠️ Nécessite npm run dev + League of Legends ouvert</span>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">

          {/* Step 1 — Lockfile */}
          <div className="rounded-2xl border border-dark-border bg-dark-card/40 overflow-hidden">
            <button type="button" onClick={() => setLockfileOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-dark-bg/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold flex items-center justify-center">1</span>
                <span className="font-semibold text-white text-sm">Colle ton lockfile</span>
                {summoner && <span className="text-xs text-emerald-400 ml-1">✓ Connecté</span>}
              </div>
              {lockfileOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>
            {lockfileOpen && (
              <div className="px-5 pb-5 space-y-3 border-t border-dark-border/50">
                <p className="text-xs text-gray-500 pt-3">
                  Chemin du lockfile → <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-300">C:\Riot Games\League of Legends\lockfile</code>
                  <br />Ouvre le fichier avec Notepad et copie tout le contenu.
                </p>
                <textarea value={lockfile} onChange={e => setLockfile(e.target.value)}
                  placeholder="LeagueClient:12345:63569:motdepasse:https" rows={2}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent-blue/50 resize-none" />
                {connectError && (
                  <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                    <AlertCircle size={16} className="shrink-0" />{connectError}
                  </div>
                )}
                <button type="button" onClick={handleConnect} disabled={!lockfile.trim() || connecting}
                  className="px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-50 hover:bg-accent-blue/90 transition-colors flex items-center gap-2">
                  {connecting && <RefreshCw size={14} className="animate-spin" />}
                  {connecting ? 'Connexion…' : 'Se connecter au LCU'}
                </button>
              </div>
            )}
          </div>

          {/* Indicateur connexion + Step 2 */}
          {summoner && (
            <div className="rounded-2xl border border-dark-border bg-dark-card/40 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-border/50">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold flex items-center justify-center">2</span>
                  <span className="font-semibold text-white text-sm">Custom games disponibles</span>
                  {games.length > 0 && <span className="text-xs text-gray-500">{games.length} games</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Wifi size={12} />{summoner.displayName}
                  </div>
                  <button type="button" onClick={handleLoadGames} disabled={loadingGames}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-bg/60 border border-dark-border text-gray-300 text-xs font-medium disabled:opacity-50 hover:text-white transition-colors">
                    <RefreshCw size={12} className={loadingGames ? 'animate-spin' : ''} />
                    {loadingGames ? 'Chargement…' : 'Charger les games'}
                  </button>
                </div>
              </div>

              {gamesError && (
                <div className="flex items-center gap-2 text-amber-400 text-sm px-5 py-3">
                  <AlertCircle size={15} className="shrink-0" />{gamesError}
                </div>
              )}

              {games.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-5 py-2.5 bg-dark-bg/30 border-b border-dark-border/40">
                    <button type="button" onClick={toggleAll}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                      {selected.size === games.length ? <CheckSquare size={14} className="text-accent-blue" /> : <Square size={14} />}
                      {selected.size === games.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <span className="text-xs text-gray-500">{selected.size} sélectionné(s)</span>
                  </div>
                  <div className="divide-y divide-dark-border/30">
                    {games.map(g => {
                      const isSelected = selected.has(g.gameId)
                      return (
                        <div key={g.gameId} role="row"
                          className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-accent-blue/5' : 'hover:bg-dark-bg/30'}`}
                          onClick={() => toggleSelect(g.gameId)}>
                          <div className={`shrink-0 ${isSelected ? 'text-accent-blue' : 'text-gray-600'}`}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">Custom Game · {formatDuration(g.gameDuration)}</p>
                            <p className="text-xs text-gray-500 truncate">{formatDate(g.gameCreation)} · {g.participants.slice(0, 5).map(p => p.summonerName).join(', ')}</p>
                          </div>
                          <span className="text-xs text-gray-600 shrink-0">#{g.gameId}</span>
                          <button type="button" onClick={(e) => handleDownloadJson(g, e)} disabled={downloadingId === g.gameId}
                            title="Télécharger le JSON" className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-accent-blue hover:bg-accent-blue/10 transition-colors disabled:opacity-40">
                            {downloadingId === g.gameId ? <RefreshCw size={13} className="animate-spin" /> : <FileJson size={13} />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {games.length === 0 && !gamesError && !loadingGames && (
                <p className="text-gray-500 text-sm px-5 py-6 text-center">Clique sur "Charger les games" pour voir les custom games disponibles.</p>
              )}
            </div>
          )}

          {/* Step 3 — Import */}
          {games.length > 0 && selected.size > 0 && (
            <div className="rounded-2xl border border-dark-border bg-dark-card/40 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold flex items-center justify-center">3</span>
                <span className="font-semibold text-white text-sm">Importer {selected.size} game(s)</span>
              </div>
              <div className="flex gap-2">
                {([{ id: 'scrim' as const, label: 'Scrim', icon: Swords }, { id: 'tournament' as const, label: 'Tournoi', icon: Trophy }]).map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setLcuMatchType(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${lcuMatchType === id ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' : 'bg-dark-bg/50 border-dark-border text-gray-400 hover:text-white'}`}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>
              {!team && <p className="text-amber-400 text-xs">⚠️ Aucune équipe active — impossible d'importer.</p>}
              <button type="button" onClick={handleLcuImport} disabled={lcuImporting || !team}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-50 hover:bg-accent-blue/90 transition-colors">
                {lcuImporting && <RefreshCw size={14} className="animate-spin" />}
                <Download size={14} />
                {lcuImporting ? 'Import en cours…' : `Importer dans Supabase (${lcuMatchType})`}
              </button>
              {lcuImportResult && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${lcuImportResult.errors.length ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                  <p className="font-semibold">{lcuImportResult.imported} importée(s) · {lcuImportResult.skipped} ignorée(s){lcuImportResult.errors.length > 0 && ` · ${lcuImportResult.errors.length} erreur(s)`}</p>
                  {lcuImportResult.errors.map((e, i) => <p key={i} className="text-xs mt-1 text-rose-400">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Timelines LCU */}
          {games.length > 0 && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-purple-500/20">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">4</span>
                <Activity size={14} className="text-purple-400" />
                <span className="font-semibold text-white text-sm">Timelines LCU</span>
                <span className="text-xs text-gray-500 ml-1">— indépendant de l'import</span>
              </div>
              <div className="divide-y divide-purple-500/10">
                {games.map(g => {
                  const tl = tlStatuses[g.gameId] ?? { status: 'idle' }
                  return (
                    <div key={g.gameId} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">Custom Game · {formatDuration(g.gameDuration)}</p>
                        <p className="text-xs text-gray-500 truncate">{formatDate(g.gameCreation)} · #{g.gameId}</p>
                      </div>
                      {tl.status === 'success' && tl.summary && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                          <span>{tl.summary.durationMin} min</span><span>·</span>
                          <span>{tl.summary.kills} kills</span><span>·</span>
                          <span>{tl.summary.dragons} 🐉</span>
                        </div>
                      )}
                      {tl.status === 'success' && <CheckCircle size={15} className="text-emerald-400 shrink-0" />}
                      {tl.status === 'error' && <span className="text-xs text-rose-400 shrink-0 max-w-[160px] truncate" title={tl.message}><XCircle size={13} className="inline mr-1" />{tl.message}</span>}
                      <button type="button" onClick={() => handleDownloadTimeline(g)} disabled={downloadingTlId === g.gameId}
                        title="Télécharger le JSON timeline" className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-40">
                        {downloadingTlId === g.gameId ? <RefreshCw size={13} className="animate-spin" /> : <FileJson size={13} />}
                      </button>
                      <button type="button" onClick={() => handleImportTimeline(g)} disabled={tl.status === 'loading' || !team}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-40">
                        {tl.status === 'loading' ? <><RefreshCw size={12} className="animate-spin" /> Chargement…</> : tl.status === 'success' ? <><RefreshCw size={12} /> Ré-importer</> : <><Activity size={12} /> Importer timeline</>}
                      </button>
                    </div>
                  )
                })}
              </div>
              {!team && <p className="text-amber-400 text-xs px-5 pb-3">⚠️ Aucune équipe active.</p>}
            </div>
          )}

          {/* Connexion status si non connecté */}
          {!summoner && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border w-fit ${summoner ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-gray-500 bg-dark-card border-dark-border'}`}>
              <WifiOff size={12} />Non connecté au LCU
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          OPTION B — Import JSON
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-dark-border/60 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
            Option B
          </span>
          <FileJson size={16} className="text-accent-blue" />
          <h2 className="font-display text-lg font-bold text-white">Import JSON</h2>
          <span className="ml-auto text-xs text-gray-600">Via LCU Explorer — export manuel</span>
        </div>

        {/* Guide LCU Explorer */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden mb-5">
          <button onClick={() => setShowLCUGuide((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-bg/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center">
                <HelpCircle size={16} className="text-accent-blue" />
              </div>
              <span className="font-semibold text-white">Comment ça marche — Guide LCU Explorer</span>
            </div>
            {showLCUGuide ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {showLCUGuide && (
            <div className="px-6 pb-6 border-t border-dark-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                {[
                  { n: '1', title: 'Jouez votre partie', desc: 'Jouez un scrim ou un tournoi sur League of Legends avec votre équipe.' },
                  { n: '2', title: 'Récupérez le JSON via LCU Explorer', custom: true },
                  { n: '3', title: 'Importez ici', desc: 'Glissez les fichiers dans les sections ci-dessous selon le type de partie.' },
                ].map(({ n, title, desc, custom }) => (
                  <div key={n} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0 text-accent-blue text-sm font-bold">{n}</div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">{title}</p>
                      {custom ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500">Pendant ou après la partie, ouvrez LCU Explorer :</p>
                          <div className="space-y-1 text-xs text-gray-500">
                            <p>→ <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-300">/lol-match-history/v1/games</code> → copiez l'ID</p>
                            <p>→ <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-300">/lol-match-history/v1/games/{'{id}'}</code> → Export JSON</p>
                          </div>
                          <div className="flex flex-wrap gap-3 pt-1">
                            <a href="https://github.com/nicholasgasior/lcu-explorer/releases" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline font-medium">
                              <ExternalLink size={11} />Télécharger LCU Explorer
                            </a>
                          </div>
                        </div>
                      ) : <p className="text-xs text-gray-500">{desc}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Modèles de fichiers attendus</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[{ label: 'Scrim', file: 'Scrim1.json', color: 'text-accent-blue', bg: 'bg-accent-blue/10' }, { label: 'Tournament', file: 'tr1.json', color: 'text-amber-400', bg: 'bg-amber-500/10' }, { label: 'Timeline', file: 'timeline1.json', color: 'text-purple-400', bg: 'bg-purple-500/10' }].map(({ label, file, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
                      <FileJson size={18} className={color} />
                      <div><p className={`text-xs font-semibold ${color}`}>{label}</p><code className="text-xs text-gray-400">{file}</code></div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">Formats acceptés : <code>.json</code> · <code>.txt</code> · <code>.csv</code></p>
              </div>
            </div>
          )}
        </div>

        {players?.length === 0 && (
          <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center gap-3 mb-5">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <span className="text-sm">Ajoutez vos joueurs (pseudo format : Nom#Tag) pour que l'import associe les bons joueurs.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <MatchImportCard type="scrim" players={players} teamId={team.id} allMatches={matches} onImported={handleImported} onBlocksRefetch={refetchBlocks} />
          <MatchImportCard type="tournament" players={players} teamId={team.id} allMatches={matches} onImported={handleImported} onBlocksRefetch={refetchBlocks} />

          {/* Import Timeline JSON */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-500/15"><Clock size={22} className="text-purple-400" /></div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-white">Import Timeline</h3>
                <p className="text-sm text-gray-500">Modèle : <code className="text-gray-400">timeline1.json</code></p>
              </div>
              <button onClick={() => setShowHelpTimeline((v) => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-dark-bg transition-colors">
                <HelpCircle size={13} />Aide{showHelpTimeline ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            {showHelpTimeline && (
              <div className="mb-5 p-4 bg-dark-bg/60 border border-dark-border rounded-xl text-sm space-y-2">
                <p className="font-medium text-gray-300">À quoi sert la timeline ?</p>
                <p className="text-gray-400 text-xs">Capture l'état minute par minute : or, XP, CS, objectifs, kills. Permet d'analyser les avantages dans le temps (5/10/15/20/25 min).</p>
                <ol className="space-y-1 text-gray-400 text-xs">
                  <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">1.</span>Via LCU Explorer, récupérez la timeline de la partie.</li>
                  <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">2.</span>Nommez le fichier avec l'ID de game pour association auto.</li>
                  <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">3.</span>Importez d'abord les parties, puis déposez la timeline ici.</li>
                </ol>
              </div>
            )}
            <DropZone files={filesTimeline} onFiles={handleFilesTimeline} accept=".json,.txt" color="purple" />
            {parsedTimelines.length > 0 && (
              <div className="mt-4 rounded-xl border border-dark-border bg-dark-bg/50 p-4 text-sm space-y-3">
                <h4 className="font-semibold text-purple-300 text-sm">{parsedTimelines.length === 1 ? 'Timeline détectée' : `${parsedTimelines.length} timelines — association auto`}</h4>
                {parsedTimelines.length > 1 && (
                  <>
                    <ul className="space-y-1.5">
                      {parsedTimelines.map((t, i) => {
                        const m = t.matchId && matches.find((x: any) => x.id === t.matchId)
                        return (
                          <li key={i} className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-mono text-gray-300">{t.file.name}</span>
                            <span className="text-gray-600">→</span>
                            {m ? <span className="text-purple-300">Game #{m.game_id} {m.our_win ? '(V)' : '(D)'} <span className="text-gray-500">({t.matchBy})</span></span> : <span className="text-amber-400">Aucun match</span>}
                          </li>
                        )
                      })}
                    </ul>
                    <button type="button" onClick={handleSaveAllTimelines} disabled={savingTimeline || parsedTimelines.every((t) => !t.matchId)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium disabled:opacity-50 w-full">
                      {savingTimeline ? 'Enregistrement…' : `Enregistrer ${parsedTimelines.filter((t) => t.matchId).length} timeline(s)`}
                    </button>
                  </>
                )}
                {parsedTimelines.length === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                      {[['Durée', parsedTimelines[0]?.demo?.duree], ['Frames', parsedTimelines[0]?.demo?.frames], ['Kills', parsedTimelines[0]?.demo?.kills], ['Dragons', parsedTimelines[0]?.demo?.dragons]].map(([label, val]) => (
                        <div key={label as string} className="bg-dark-card rounded-lg p-2"><span className="text-gray-500 block">{label}</span><span className="font-medium">{val ?? '—'}</span></div>
                      ))}
                    </div>
                    <div className="border-t border-dark-border pt-3">
                      <p className="text-gray-500 text-xs mb-2">Associer à un match :</p>
                      <select value={timelineMatchId} onChange={(e) => setTimelineMatchId(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white mb-2">
                        <option value="">Choisir un match…</option>
                        {matches.map((m: any) => (
                          <option key={m.id} value={m.id}>Game #{m.game_id} — {m.our_win ? 'Victoire' : 'Défaite'}{m.game_creation ? ` · ${new Date(m.game_creation).toLocaleDateString('fr-FR')}` : ''}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleSaveTimeline} disabled={savingTimeline || !timelineMatchId}
                        className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium disabled:opacity-50">
                        {savingTimeline ? 'Enregistrement…' : 'Enregistrer la timeline'}
                      </button>
                    </div>
                  </>
                )}
                {timelineSaveMsg && <p className={`text-xs ${timelineSaveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{timelineSaveMsg.text}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
