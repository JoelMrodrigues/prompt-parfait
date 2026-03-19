/**
 * Page Import — 3 sections : Scrim | Tournament | Timeline
 * Guide LCU Explorer inclus
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileJson, AlertCircle, CheckCircle, Clock, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Swords, Trophy, Sparkles, MousePointerClick, LayoutList } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
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

// ─── Composant drop zone réutilisable ─────────────────────────────────────────

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
          {files.length > 0
            ? `${files.length} fichier(s) prêt(s)`
            : `Glissez vos fichiers ici ou cliquez`}
        </p>
        <p className="text-gray-600 text-xs mt-1">{accept.replace(/,/g, ' · ')}</p>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {files.map((f, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-dark-bg rounded-lg text-gray-400">
                {f.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Carte d'import commune (Scrim + Tournament) ──────────────────────────────

type ImportMode = 'simple' | 'auto' | 'manual'

const IMPORT_MODES: { id: ImportMode; label: string; Icon: React.ElementType; desc: string }[] = [
  { id: 'simple', label: 'Simple',  Icon: LayoutList,        desc: 'Import sans groupement' },
  { id: 'auto',   label: 'Auto',    Icon: Sparkles,          desc: 'Détection auto des sessions' },
  { id: 'manual', label: 'Manuel',  Icon: MousePointerClick, desc: 'Sélection manuelle des parties' },
]

function MatchImportCard({
  type,
  players,
  teamId,
  allMatches,
  onImported,
  onBlocksRefetch,
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

  // Post-import state
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
      const teamPlayers = players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        secondary_account: p.secondary_account,
        position: p.position,
      }))
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
        setSuccess(
          `${res.imported} partie(s) importée(s)${res.skipped > 0 ? ` · ${res.skipped} déjà présente(s)` : ''}`
        )
        if (res.imported > 0) {
          // Sauvegarder les game_id parsés pour les modes auto/manuel
          const gameIds = originals.map((m) => Number(m.gameId || m.metadata?.matchId || 0)).filter(Boolean)
          setParsedGameIds(gameIds)

          // Construire des objets légers pour blockDetector
          const forDetect = originals.map((m) => ({
            id: String(m.gameId ?? ''),
            game_id: Number(m.gameId ?? 0),
            game_creation: m.gameCreation ?? null,
            game_duration: m.gameDuration ?? null,
          }))

          if (importMode === 'auto') {
            const detected = detectBlocks(forDetect)
            setDetectedBlocks(detected)
            setShowProposal(true)
          } else if (importMode === 'manual') {
            const allIds = new Set(forDetect.map((m) => m.game_id))
            setManualSelected(allIds)
            setShowProposal(true)
          }

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

  // Pour le mode Manuel : résoudre game_ids → UUIDs Supabase
  const resolveMatchIds = (gameIds: number[]) => {
    return allMatches
      .filter((m) => gameIds.includes(Number(m.game_id)))
      .map((m) => m.id as string)
  }

  return (
    <div className={`bg-dark-card border border-dark-border rounded-2xl p-6 ${borderHover} transition-colors`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${isScrim ? 'bg-accent-blue/15' : 'bg-amber-500/15'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-white">{label}</h3>
          <p className="text-sm text-gray-500">Fichier JSON · Modèle : <code className="text-gray-400">{modelFile}</code></p>
        </div>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-dark-bg transition-colors"
        >
          <HelpCircle size={13} />
          Aide
          {showHelp ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Mode d'import */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mode de groupement</p>
        <div className="flex gap-2">
          {IMPORT_MODES.map(({ id, label: mLabel, Icon, desc }) => (
            <button
              key={id}
              onClick={() => { setImportMode(id); setShowProposal(false) }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-xl border text-xs font-medium transition-colors ${
                importMode === id
                  ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue'
                  : 'border-dark-border text-gray-500 hover:text-gray-300 bg-dark-bg/40'
              }`}
              title={desc}
            >
              <Icon size={13} />
              {mLabel}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          {IMPORT_MODES.find((m) => m.id === importMode)?.desc}
        </p>
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

      {error && (
        <div className="mt-3 p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-3 bg-green-500/15 border border-green-500/40 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          {success}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing || files.length === 0}
        className={`mt-4 w-full py-2.5 ${btnColor} text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors`}
      >
        {importing ? (
          <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full inline-block" />Import en cours...</>
        ) : (
          <><CheckCircle size={16} />Importer en {isScrim ? 'Scrim' : 'Tournament'}</>
        )}
      </button>

      {/* ── Mode Auto : proposition de blocs ── */}
      {importMode === 'auto' && showProposal && (
        detectedBlocks.length > 0 ? (
          <AutoBlockProposal
            teamId={teamId}
            detected={detectedBlocks}
            allMatches={allMatches}
            onDone={() => { setShowProposal(false); onBlocksRefetch() }}
          />
        ) : (
          <div className="mt-4 p-3 bg-dark-bg/50 border border-dark-border rounded-xl text-xs text-gray-500 text-center">
            Aucun groupe détecté (parties trop espacées dans le temps).
          </div>
        )
      )}

      {/* ── Mode Manuel : sélection + création bloc ── */}
      {importMode === 'manual' && showProposal && parsedGameIds.length > 0 && (
        <div className="mt-4 p-4 bg-dark-bg/50 border border-accent-blue/20 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-accent-blue">
            <MousePointerClick size={12} className="inline mr-1" />
            Sélectionnez les parties à grouper
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {allMatches
              .filter((m) => parsedGameIds.includes(Number(m.game_id)))
              .map((m) => {
                const dateStr = m.game_creation
                  ? new Date(m.game_creation).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : ''
                const checked = manualSelected.has(Number(m.game_id))
                return (
                  <label key={m.id} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-dark-bg transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setManualSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(Number(m.game_id))) next.delete(Number(m.game_id))
                          else next.add(Number(m.game_id))
                          return next
                        })
                      }}
                      className="accent-accent-blue"
                    />
                    <span className={`text-xs font-medium ${m.our_win ? 'text-green-400' : 'text-red-400'}`}>
                      {m.our_win ? 'V' : 'D'}
                    </span>
                    <span className="text-xs text-gray-400 flex-1">{dateStr}</span>
                  </label>
                )
              })}
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            disabled={manualSelected.size === 0}
            className="w-full py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            Créer un bloc avec {manualSelected.size} partie{manualSelected.size > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Modal création bloc (mode Manuel) */}
      {createModalOpen && (
        <CreateBlockModal
          teamId={teamId}
          prefillMatchIds={resolveMatchIds([...manualSelected])}
          onClose={() => setCreateModalOpen(false)}
          onSaved={() => {
            setCreateModalOpen(false)
            setShowProposal(false)
            onBlocksRefetch()
          }}
        />
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const ImportPage = () => {
  const { team, players = [], refetch: refetchTeam } = useTeam()
  const { matches = [], refetch: refetchMatches } = useTeamMatches(team?.id)
  const { refetch: refetchBlocks } = useTeamBlocks(team?.id)

  const [showLCUGuide, setShowLCUGuide] = useState(false)

  // Timeline state
  const [filesTimeline, setFilesTimeline] = useState<File[]>([])
  const [parsedTimelines, setParsedTimelines] = useState<any[]>([])
  const [timelineMatchId, setTimelineMatchId] = useState('')
  const [savingTimeline, setSavingTimeline] = useState(false)
  const [timelineSaveMsg, setTimelineSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showHelpTimeline, setShowHelpTimeline] = useState(false)

  async function parseOneTimelineFile(file: File) {
    try {
      const text = await file.text()
      const parsed = parseTimeline(text, { filename: file.name })
      if (!parsed) return null
      const demo = getTimelineDemoSummary(parsed)
      const gameId = demo?.gameId != null ? String(demo.gameId) : null
      return { parsed, demo, gameId }
    } catch {
      return null
    }
  }

  function resolveTimelineMatches(items: any[], matchesList: any[]) {
    if (!items.length || !matchesList?.length) return items
    return items.map((item, index) => {
      let matchId = null
      let matchBy = null
      if (item.gameId) {
        const m = matchesList.find((m) => String(m.game_id) === String(item.gameId))
        if (m) { matchId = m.id; matchBy = 'nom' }
      }
      if (!matchId && index < matchesList.length) {
        matchId = matchesList[index].id; matchBy = 'ordre'
      }
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
    const resolved = resolveTimelineMatches(
      parsedTimelines.map(({ file, parsed, demo, gameId }) => ({ file, parsed, demo, gameId })),
      matches
    )
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
      const { error } = await supabase
        .from('team_match_timeline')
        .upsert({ match_id: timelineMatchId, snapshot }, { onConflict: 'match_id' })
      if (error) throw error
      setTimelineSaveMsg({ ok: true, text: 'Timeline enregistrée. Consultez "Stats timeline" sur la page du match.' })
      refetchMatches()
    } catch (e: any) {
      setTimelineSaveMsg({ ok: false, text: e.message || 'Erreur lors de l\'enregistrement.' })
    } finally {
      setSavingTimeline(false)
    }
  }

  const handleSaveAllTimelines = async () => {
    const toSave = parsedTimelines.filter((t) => t.matchId)
    if (!toSave.length) return
    setSavingTimeline(true)
    setTimelineSaveMsg(null)
    try {
      for (const t of toSave) {
        const snapshot = getSnapshotsAtMinutes(t.parsed, [5, 10, 15, 20, 25])
        const { error } = await supabase
          .from('team_match_timeline')
          .upsert({ match_id: t.matchId, snapshot }, { onConflict: 'match_id' })
        if (error) throw error
      }
      setTimelineSaveMsg({ ok: true, text: `${toSave.length} timeline(s) enregistrée(s).` })
      refetchMatches()
    } catch (e: any) {
      setTimelineSaveMsg({ ok: false, text: e.message || 'Erreur.' })
    } finally {
      setSavingTimeline(false)
    }
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  const handleImported = async () => {
    await refetchMatches()
    refetchTeam?.()
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 px-2">

      {/* Header */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className={`shrink-0 w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden ${team.logo_url ? 'border-dark-border bg-white' : 'border-dark-border bg-dark-bg/80'}`}>
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.team_name} className="w-full h-full object-contain p-1.5" />
            ) : (
              <span className="text-xl font-bold text-gray-600">{(team.team_name || 'E').charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white leading-tight">{team.team_name}</h1>
            <h2 className="font-display text-xl font-semibold text-gray-300 mt-0.5">Import</h2>
            <p className="text-gray-500 text-sm mt-0.5">Importez vos parties d'équipe pour alimenter les statistiques</p>
          </div>
        </div>
      </div>

      {/* Guide LCU Explorer */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowLCUGuide((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-bg/30 transition-colors"
        >
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
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0 text-accent-blue text-sm font-bold">1</div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Jouez votre partie</p>
                  <p className="text-xs text-gray-500">Jouez un scrim ou un tournoi sur League of Legends avec votre équipe.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0 text-accent-blue text-sm font-bold">2</div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white">Récupérez le JSON via LCU Explorer</p>
                  <p className="text-xs text-gray-500">Pendant ou après la partie, ouvrez LCU Explorer :</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>→ <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-300">/lol-match-history/v1/games</code> → copiez l'ID de partie</p>
                    <p>→ <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-300">/lol-match-history/v1/games/<span className="text-accent-blue">{'{id}'}</span></code> → Export JSON → <code className="bg-dark-bg px-1 rounded">scrim1.json</code></p>
                    <p className="text-gray-600">→ Timeline (optionnel) : <code className="bg-dark-bg px-1.5 py-0.5 rounded text-gray-500">/lol-match-history/v1/games/<span className="text-gray-500">{'{id}'}</span>/timeline</code></p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href="https://github.com/nicholasgasior/lcu-explorer/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline font-medium"
                    >
                      <ExternalLink size={11} />
                      Télécharger LCU Explorer
                    </a>
                    <a
                      href="https://github.com/Pupix/lcu-connector"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                    >
                      <ExternalLink size={11} />
                      Alternative : LCU Connector
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0 text-accent-blue text-sm font-bold">3</div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Importez ici</p>
                  <p className="text-xs text-gray-500">Glissez les fichiers dans les sections ci-dessous selon le type de partie. L'import est instantané.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 bg-dark-bg/60 border border-dark-border rounded-xl">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Modèles de fichiers attendus</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Scrim', file: 'Scrim1.json', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
                  { label: 'Tournament', file: 'tr1.json', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Timeline', file: 'timeline1.json', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map(({ label, file, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-3`}>
                    <FileJson size={18} className={color} />
                    <div>
                      <p className={`text-xs font-semibold ${color}`}>{label}</p>
                      <code className="text-xs text-gray-400">{file}</code>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">Formats acceptés : <code>.json</code> · <code>.txt</code> · <code>.csv</code></p>
            </div>
          </div>
        )}
      </div>

      {players?.length === 0 && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center gap-3">
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <span className="text-sm">Ajoutez vos joueurs (pseudo format : Nom#Tag) pour que l'import associe les bons joueurs.</span>
        </div>
      )}

      {/* 3 sections d'import */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Import Scrim */}
        <MatchImportCard type="scrim" players={players} teamId={team.id} allMatches={matches} onImported={handleImported} onBlocksRefetch={refetchBlocks} />

        {/* Import Tournament */}
        <MatchImportCard type="tournament" players={players} teamId={team.id} allMatches={matches} onImported={handleImported} onBlocksRefetch={refetchBlocks} />

        {/* Import Timeline */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-purple-500/15">
              <Clock size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold text-white">Import Timeline</h3>
              <p className="text-sm text-gray-500">Modèle : <code className="text-gray-400">timeline1.json</code></p>
            </div>
            <button
              onClick={() => setShowHelpTimeline((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-dark-bg transition-colors"
            >
              <HelpCircle size={13} />
              Aide
              {showHelpTimeline ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>

          {showHelpTimeline && (
            <div className="mb-5 p-4 bg-dark-bg/60 border border-dark-border rounded-xl text-sm space-y-2">
              <p className="font-medium text-gray-300">À quoi sert la timeline ?</p>
              <p className="text-gray-400 text-xs">Capture l'état minute par minute : or, XP, CS, objectifs, kills. Permet d'analyser les avantages dans le temps (5/10/15/20/25 min).</p>
              <p className="font-medium text-gray-300">Comment l'obtenir ?</p>
              <ol className="space-y-1 text-gray-400 text-xs">
                <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">1.</span>Via LCU Explorer, récupérez la timeline de la partie.</li>
                <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">2.</span>Nommez le fichier avec l'ID de game pour association auto (ex. <code className="bg-dark-card px-1 rounded">timeline1.json</code>).</li>
                <li className="flex gap-2"><span className="text-purple-400 font-bold shrink-0">3.</span>Importez d'abord les parties, puis déposez la timeline ici.</li>
              </ol>
            </div>
          )}

          <DropZone files={filesTimeline} onFiles={handleFilesTimeline} accept=".json,.txt" color="purple" />

          {parsedTimelines.length > 0 && (
            <div className="mt-4 rounded-xl border border-dark-border bg-dark-bg/50 p-4 text-sm space-y-3">
              <h4 className="font-semibold text-purple-300 text-sm">
                {parsedTimelines.length === 1 ? 'Timeline détectée' : `${parsedTimelines.length} timelines — association auto`}
              </h4>

              {parsedTimelines.length > 1 && (
                <>
                  <ul className="space-y-1.5">
                    {parsedTimelines.map((t, i) => {
                      const m = t.matchId && matches.find((x: any) => x.id === t.matchId)
                      return (
                        <li key={i} className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono text-gray-300">{t.file.name}</span>
                          <span className="text-gray-600">→</span>
                          {m ? (
                            <span className="text-purple-300">Game #{m.game_id} {m.our_win ? '(V)' : '(D)'} <span className="text-gray-500">({t.matchBy})</span></span>
                          ) : (
                            <span className="text-amber-400">Aucun match</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={handleSaveAllTimelines}
                    disabled={savingTimeline || parsedTimelines.every((t) => !t.matchId)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium disabled:opacity-50 w-full"
                  >
                    {savingTimeline ? 'Enregistrement…' : `Enregistrer ${parsedTimelines.filter((t) => t.matchId).length} timeline(s)`}
                  </button>
                </>
              )}

              {parsedTimelines.length === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                    {[
                      ['Durée', parsedTimelines[0]?.demo?.duree],
                      ['Frames', parsedTimelines[0]?.demo?.frames],
                      ['Kills', parsedTimelines[0]?.demo?.kills],
                      ['Dragons', parsedTimelines[0]?.demo?.dragons],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-dark-card rounded-lg p-2">
                        <span className="text-gray-500 block">{label}</span>
                        <span className="font-medium">{val ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dark-border pt-3">
                    <p className="text-gray-500 text-xs mb-2">Associer à un match :</p>
                    <select
                      value={timelineMatchId}
                      onChange={(e) => setTimelineMatchId(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white mb-2"
                    >
                      <option value="">Choisir un match…</option>
                      {matches.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          Game #{m.game_id} — {m.our_win ? 'Victoire' : 'Défaite'}{m.game_creation ? ` · ${new Date(m.game_creation).toLocaleDateString('fr-FR')}` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveTimeline}
                      disabled={savingTimeline || !timelineMatchId}
                      className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {savingTimeline ? 'Enregistrement…' : 'Enregistrer la timeline'}
                    </button>
                  </div>
                </>
              )}

              {timelineSaveMsg && (
                <p className={`text-xs ${timelineSaveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {timelineSaveMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
