/**
 * Page Import - 3 cartes : parties (JSON), timeline, à venir
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileJson, AlertCircle, CheckCircle, Clock, HelpCircle } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { importExaltyMatches } from '../../../lib/team/exaltyMatchImporter'
import {
  parseTimeline,
  getTimelineDemoSummary,
  getSnapshotsAtMinutes,
} from '../../../lib/team/exaltyTimelineParser'
import { supabase } from '../../../lib/supabase'

export const ImportPage = () => {
  const { team, players = [], refetch: refetchTeam } = useTeam()
  const { matches = [], refetch: refetchMatches } = useTeamMatches(team?.id)

  // Card 1: Import parties
  const [filesGames, setFilesGames] = useState([])
  const [importingGames, setImportingGames] = useState(false)
  const [errorGames, setErrorGames] = useState(null)
  const [successGames, setSuccessGames] = useState(null)
  const fileInputGamesRef = useRef(null)

  // Card 2: Import timeline — support multi-fichiers avec détection auto par nom (game_id) ou par ordre
  const [filesTimeline, setFilesTimeline] = useState([])
  const [parsedTimelines, setParsedTimelines] = useState([]) // [{ file, parsed, demo, gameId, matchId, matchBy }]
  const [timelineMatchId, setTimelineMatchId] = useState('') // pour le mode 1 seul fichier
  const [savingTimeline, setSavingTimeline] = useState(false)
  const [timelineSaveMsg, setTimelineSaveMsg] = useState(null)
  const fileInputTimelineRef = useRef(null)

  const handleFileChangeGames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const items = Array.from(e.target?.files || []) as File[]
    const jsons = items.filter((f: File) => f.name.endsWith('.json'))
    if (jsons.length > 0) {
      setFilesGames(jsons)
      setErrorGames(null)
    }
    e.target.value = ''
  }

  const handleDropGames = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer?.files || []) as File[]
    const jsons = items.filter((f: File) => f.name.endsWith('.json'))
    if (jsons.length > 0) {
      setFilesGames(jsons)
      setErrorGames(null)
    }
  }, [])

  const handleImportGames = async () => {
    if (!team?.id || filesGames.length === 0) return
    setImportingGames(true)
    setErrorGames(null)
    setSuccessGames(null)
    try {
      const teamPlayers = players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        secondary_account: p.secondary_account,
        position: p.position,
      }))
      const originals = []
      for (const f of filesGames) {
        const text = await f.text()
        const json = JSON.parse(text)
        originals.push(...(Array.isArray(json) ? json : [json]))
      }
      const res = await importExaltyMatches(originals, team.id, teamPlayers)
      if (res.errors?.length > 0) {
        setErrorGames(res.errors.join(' — '))
        setSuccessGames(null)
      } else {
        setErrorGames(null)
        setSuccessGames(
          `${res.imported} match(es) importé(s)${res.skipped > 0 ? `, ${res.skipped} déjà présents` : ''}`
        )
      }
      if (res.imported > 0) {
        await refetchMatches()
        refetchTeam?.()
      }
      setFilesGames([])
    } catch (e) {
      setErrorGames(e.message || "Erreur lors de l'import")
    } finally {
      setImportingGames(false)
    }
  }

  /** Parse un fichier timeline et retourne { parsed, demo, gameId } */
  async function parseOneTimelineFile(file) {
    if (!file) return null
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

  /** Associe chaque timeline à un match : d'abord par game_id (nom/JSON), sinon par ordre (1er fichier = 1er match, etc.) */
  function resolveTimelineMatches(items, matchesList) {
    if (!items.length || !matchesList?.length) return items
    return items.map((item, index) => {
      let matchId = null
      let matchBy = null
      if (item.gameId) {
        const m = matchesList.find((m) => String(m.game_id) === String(item.gameId))
        if (m) {
          matchId = m.id
          matchBy = 'nom'
        }
      }
      if (!matchId && index < matchesList.length) {
        matchId = matchesList[index].id
        matchBy = 'ordre'
      }
      return { ...item, matchId, matchBy }
    })
  }

  const handleFileChangeTimeline = (e) => {
    const items = Array.from(e.target?.files || [])
    if (items.length > 0) {
      setFilesTimeline(items)
      setTimelineSaveMsg(null)
      Promise.all(items.map((f) => parseOneTimelineFile(f))).then((results) => {
        const withFile = results
          .map((r, i) => (r ? { file: items[i], ...r } : null))
          .filter(Boolean)
        const resolved = resolveTimelineMatches(withFile, matches)
        setParsedTimelines(resolved)
        if (resolved.length === 1 && resolved[0].matchId) setTimelineMatchId(resolved[0].matchId)
        else if (resolved.length === 1) setTimelineMatchId('')
      })
    } else {
      setParsedTimelines([])
      setTimelineMatchId('')
    }
    e.target.value = ''
  }

  const handleDropTimeline = useCallback(
    (e) => {
      e.preventDefault()
      const items = Array.from(e.dataTransfer?.files || [])
      if (items.length > 0) {
        setFilesTimeline(items)
        setTimelineSaveMsg(null)
        Promise.all(items.map((f) => parseOneTimelineFile(f))).then((results) => {
          const withFile = results
            .map((r, i) => (r ? { file: items[i], ...r } : null))
            .filter(Boolean)
          const resolved = resolveTimelineMatches(withFile, matches)
          setParsedTimelines(resolved)
          if (resolved.length === 1 && resolved[0].matchId) setTimelineMatchId(resolved[0].matchId)
          else if (resolved.length === 1) setTimelineMatchId('')
        })
      } else {
        setParsedTimelines([])
        setTimelineMatchId('')
      }
    },
    [matches]
  )

  // Re-résoudre les matchs quand la liste des matchs change (ex. après import de parties)
  useEffect(() => {
    if (parsedTimelines.length === 0 || !matches?.length) return
    const resolved = resolveTimelineMatches(
      parsedTimelines.map(({ file, parsed, demo, gameId }) => ({ file, parsed, demo, gameId })),
      matches
    )
    setParsedTimelines(resolved)
    if (resolved.length === 1 && resolved[0].matchId) setTimelineMatchId(resolved[0].matchId)
  }, [matches?.length])

  const handleSaveTimelineForMatch = async () => {
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
      setTimelineSaveMsg({
        ok: true,
        text: 'Timeline enregistrée pour ce match. Consultez l’onglet "Stats timeline" sur la page du match.',
      })
      refetchMatches()
    } catch (e) {
      setTimelineSaveMsg({ ok: false, text: e.message || 'Erreur lors de l’enregistrement.' })
    } finally {
      setSavingTimeline(false)
    }
  }

  const handleSaveAllTimelines = async () => {
    const toSave = parsedTimelines.filter((t) => t.matchId)
    if (toSave.length === 0) return
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
      setTimelineSaveMsg({
        ok: true,
        text: `${toSave.length} timeline(s) enregistrée(s) pour les matchs correspondants.`,
      })
      refetchMatches()
    } catch (e) {
      setTimelineSaveMsg({ ok: false, text: e.message || 'Erreur lors de l’enregistrement.' })
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

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="font-display text-3xl font-bold mb-2">Import</h2>
      <p className="text-gray-400 mb-8">
        Importez vos données (parties, timeline) en glissant les fichiers dans les cartes
        ci-dessous.
      </p>

      {players?.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-400" />
          <span>
            Ajoutez vos joueurs (pseudo format: Nom#Tag) pour que l'import des parties associe les
            bons joueurs.
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1">
        {/* Card 1: Importer des parties */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent-blue/20 rounded-lg">
              <FileJson size={24} className="text-accent-blue" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Importer des parties</h3>
              <p className="text-sm text-gray-500">Fichiers JSON Exalty (fin de partie)</p>
            </div>
          </div>
          <input
            ref={fileInputGamesRef}
            type="file"
            accept=".json"
            multiple
            onChange={handleFileChangeGames}
            className="hidden"
          />
          <div
            onDrop={handleDropGames}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputGamesRef.current?.click?.()}
            className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center hover:border-accent-blue/50 transition-colors cursor-pointer mb-4"
          >
            <Upload size={32} className="mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400 text-sm">
              {filesGames.length > 0
                ? `${filesGames.length} fichier(s) prêt(s)`
                : 'Glissez vos JSON ici ou cliquez'}
            </p>
            {filesGames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {filesGames.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-dark-bg rounded">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {errorGames && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={16} className="text-red-400" />
              {errorGames}
            </div>
          )}
          {successGames && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-400" />
              {successGames}
            </div>
          )}
          <button
            onClick={handleImportGames}
            disabled={importingGames || filesGames.length === 0}
            className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {importingGames ? (
              <>
                <span className="animate-spin">⟳</span>
                Import en cours...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Importer les parties
              </>
            )}
          </button>
        </div>

        {/* Card 2: Importer la timeline */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock size={24} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Importer la timeline</h3>
              <p className="text-sm text-gray-500">Données timeline des games (à configurer)</p>
            </div>
          </div>
          <input
            ref={fileInputTimelineRef}
            type="file"
            accept=".json,.txt"
            multiple
            onChange={handleFileChangeTimeline}
            className="hidden"
          />
          <div
            onDrop={handleDropTimeline}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputTimelineRef.current?.click?.()}
            className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer mb-4"
          >
            <Upload size={32} className="mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400 text-sm">
              {filesTimeline.length > 0
                ? `${filesTimeline.length} fichier(s) déposé(s)`
                : 'Glissez un fichier timeline (.json ou .txt) ici ou cliquez'}
            </p>
            {filesTimeline.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {filesTimeline.map((f, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-dark-bg rounded">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {parsedTimelines.length > 0 ? (
            <div className="rounded-lg border border-dark-border bg-dark-bg/50 p-4 text-sm space-y-4">
              <h4 className="font-semibold text-purple-300">
                {parsedTimelines.length === 1
                  ? 'Démo — Stats extraites de la timeline'
                  : `${parsedTimelines.length} timelines — association automatique`}
              </h4>
              {parsedTimelines.length > 1 && (
                <>
                  <p className="text-gray-400 text-xs">
                    Chaque fichier associé par nom (ex. timeline1.txt → Game #1) ou par ordre (1er
                    fichier = match le plus récent).
                  </p>
                  <ul className="space-y-2">
                    {parsedTimelines.map((t, i) => {
                      const m = t.matchId && matches.find((x) => x.id === t.matchId)
                      return (
                        <li key={i} className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-300">{t.file.name}</span>
                          <span className="text-gray-500">→</span>
                          {m ? (
                            <span className="text-purple-200">
                              Game #{m.game_id} {m.our_win ? '(V)' : '(D)'}
                              <span className="text-gray-500 text-xs ml-1">
                                ({t.matchBy === 'nom' ? 'nom' : 'ordre'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-400 text-xs">Aucun match</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={handleSaveAllTimelines}
                    disabled={savingTimeline || parsedTimelines.every((t) => !t.matchId)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {savingTimeline
                      ? 'Enregistrement…'
                      : `Enregistrer les ${parsedTimelines.filter((t) => t.matchId).length} timeline(s)`}
                  </button>
                </>
              )}
              {parsedTimelines.length === 1 && parsedTimelines[0].demo?.gameId != null && (
                <p className="text-purple-200/90">
                  <span className="text-gray-500">Game ID associé :</span>{' '}
                  <code className="bg-dark-card px-1.5 py-0.5 rounded">
                    {parsedTimelines[0]?.demo?.gameId}
                  </code>
                  {typeof parsedTimelines[0]?.demo?.gameId === 'string' &&
                    parsedTimelines[0].demo.gameId.match(/^\d+$/) && (
                      <span className="text-gray-500 text-xs ml-2">
                        (détecté depuis le nom du fichier)
                      </span>
                    )}
                </p>
              )}
              {parsedTimelines[0]?.demo?.gameId === '13' && (
                <p className="text-amber-200/80 text-xs">
                  Mode test : timeline13 = timeline de la game 1 (premier match). Le match est
                  présélectionné pour valider le format.
                </p>
              )}
              {parsedTimelines[0]?.demo?.gameId != null &&
                parsedTimelines[0].demo.gameId !== '13' && (
                  <p className="text-gray-500 text-xs">
                    Associer au match correspondant dans la liste ci-dessous.
                  </p>
                )}
              {parsedTimelines[0]?.demo?.gameId == null && (
                <p className="text-amber-200/80 text-xs">
                  Aucun game ID dans le JSON. Renommer le fichier avec l’ID (ex.
                  timeline_7704801020.txt) pour lier la timeline à un match.
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-gray-300">
                <div>
                  <span className="text-gray-500">Durée</span>
                  <br />
                  {parsedTimelines[0]?.demo?.duree}
                </div>
                <div>
                  <span className="text-gray-500">Frames</span>
                  <br />
                  {parsedTimelines[0]?.demo?.frames}
                </div>
                <div>
                  <span className="text-gray-500">Événements</span>
                  <br />
                  {parsedTimelines[0]?.demo?.evenements}
                </div>
                <div>
                  <span className="text-gray-500">Kills</span>
                  <br />
                  {parsedTimelines[0]?.demo?.kills}
                </div>
                <div>
                  <span className="text-gray-500">Dragons</span>
                  <br />
                  {parsedTimelines[0]?.demo?.dragons} ({parsedTimelines[0]?.demo?.typesDragons})
                </div>
                <div>
                  <span className="text-gray-500">Baron</span>
                  <br />
                  {parsedTimelines[0]?.demo?.baron}
                </div>
                <div>
                  <span className="text-gray-500">Heralds</span>
                  <br />
                  {parsedTimelines[0]?.demo?.heralds}
                </div>
                <div>
                  <span className="text-gray-500">Tours</span>
                  <br />
                  {parsedTimelines[0]?.demo?.tours}
                </div>
                <div>
                  <span className="text-gray-500">Inhibiteurs</span>
                  <br />
                  {parsedTimelines[0]?.demo?.inhibs}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Kills par joueur (participantId)</p>
                <pre className="bg-dark-card p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(parsedTimelines[0]?.demo?.killsParJoueur, null, 0)}
                </pre>
              </div>
              {parsedTimelines[0]?.demo?.objectifsDragons?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Objectifs dragons (ordre chrono)</p>
                  <ul className="list-disc list-inside text-gray-400">
                    {parsedTimelines[0]?.demo?.objectifsDragons.map((d, i) => (
                      <li key={i}>
                        {d.label} à {d.timeMin} min (joueur {d.killerId})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {parsedTimelines[0]?.demo?.toursDetruites?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Tours détruites</p>
                  <ul className="list-disc list-inside text-gray-400">
                    {parsedTimelines[0]?.demo?.toursDetruites.map((t, i) => (
                      <li key={i}>
                        {t.label} à {t.timeMin} min (équipe {t.teamId} perd la tour)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {parsedTimelines.length === 1 && (
                <div className="border-t border-dark-border pt-4 mt-4">
                  <p className="text-gray-500 text-sm mb-2">Associer cette timeline à un match :</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timelineMatchId}
                      onChange={(e) => setTimelineMatchId(e.target.value)}
                      className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white min-w-[200px]"
                    >
                      <option value="">Choisir un match…</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          Game #{m.game_id} — {m.our_win ? 'Victoire' : 'Défaite'} (
                          {m.game_creation
                            ? new Date(m.game_creation).toLocaleDateString('fr-FR')
                            : ''}
                          )
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveTimelineForMatch}
                      disabled={savingTimeline || !timelineMatchId}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {savingTimeline ? 'Enregistrement…' : 'Enregistrer la timeline pour ce match'}
                    </button>
                  </div>
                </div>
              )}
              {timelineSaveMsg && (
                <p
                  className={`mt-2 text-sm ${timelineSaveMsg.ok ? 'text-green-400' : 'text-red-400'}`}
                >
                  {timelineSaveMsg.text}
                </p>
              )}
              <p className="text-gray-500 text-xs border-t border-dark-border pt-2 mt-4">
                Ce qu’on peut en faire : courbes or/XP par équipe, timeline des objectifs,
                kills/morts/assists par participant, CS/jungle par frame, position (heatmap).
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Format Exalty/Riot : JSON avec <code className="text-gray-400">frames</code>{' '}
              (timestamp, participantFrames, events). Dépose un fichier pour voir la démo des stats.
            </p>
          )}
        </div>

        {/* Card 3: À venir */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 opacity-90">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <HelpCircle size={24} className="text-gray-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">À venir</h3>
              <p className="text-sm text-gray-500">Autre type d'import selon vos besoins</p>
            </div>
          </div>
          <div className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">Disponible prochainement</p>
          </div>
        </div>
      </div>
    </div>
  )
}
