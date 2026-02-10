/**
 * Page Import - 3 cartes : parties (JSON), timeline, à venir
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileJson, AlertCircle, CheckCircle, X, Clock, HelpCircle } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { useTeamMatches } from '../../../hooks/useTeamMatches'
import { importExaltyMatches } from '../../../lib/team/exaltyMatchImporter'
import { parseTimeline, getTimelineDemoSummary, getSnapshotsAtMinutes } from '../../../lib/team/exaltyTimelineParser'
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

  // Card 2: Import timeline
  const [filesTimeline, setFilesTimeline] = useState([])
  const [importingTimeline, setImportingTimeline] = useState(false)
  const [parsedTimeline, setParsedTimeline] = useState(null)
  const [timelineDemo, setTimelineDemo] = useState(null)
  const [timelineMatchId, setTimelineMatchId] = useState('')
  const [savingTimeline, setSavingTimeline] = useState(false)
  const [timelineSaveMsg, setTimelineSaveMsg] = useState(null)
  const fileInputTimelineRef = useRef(null)

  // TEST UNIQUEMENT : timeline13 = timeline de la game 1 (premier match) pour valider le format
  useEffect(() => {
    if (timelineDemo?.gameId === '13' && matches?.length > 0 && !timelineMatchId) {
      setTimelineMatchId(matches[0].id)
    }
  }, [timelineDemo?.gameId, matches, timelineMatchId])

  const handleFileChangeGames = (e) => {
    const items = Array.from(e.target?.files || [])
    const jsons = items.filter((f) => f.name.endsWith('.json'))
    if (jsons.length > 0) {
      setFilesGames(jsons)
      setErrorGames(null)
    }
    e.target.value = ''
  }

  const handleDropGames = useCallback((e) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer?.files || [])
    const jsons = items.filter((f) => f.name.endsWith('.json'))
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
      setErrorGames(e.message || 'Erreur lors de l\'import')
    } finally {
      setImportingGames(false)
    }
  }

  const handleFileChangeTimeline = (e) => {
    const items = Array.from(e.target?.files || [])
    if (items.length > 0) {
      setFilesTimeline(items)
      setTimelineSaveMsg(null)
      parseFirstTimelineFile(items[0]).then((result) => {
        if (result) {
          setParsedTimeline(result.parsed)
          setTimelineDemo(result.demo)
        } else {
          setParsedTimeline(null)
          setTimelineDemo(null)
        }
      })
    } else {
      setParsedTimeline(null)
      setTimelineDemo(null)
    }
    e.target.value = ''
  }

  const handleDropTimeline = useCallback((e) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer?.files || [])
    if (items.length > 0) {
      setFilesTimeline(items)
      setTimelineSaveMsg(null)
      parseFirstTimelineFile(items[0]).then((result) => {
        if (result) {
          setParsedTimeline(result.parsed)
          setTimelineDemo(result.demo)
        } else {
          setParsedTimeline(null)
          setTimelineDemo(null)
        }
      })
    } else {
      setParsedTimeline(null)
      setTimelineDemo(null)
    }
  }, [])

  async function parseFirstTimelineFile(file) {
    if (!file) return null
    try {
      const text = await file.text()
      const parsed = parseTimeline(text, { filename: file.name })
      if (!parsed) return null
      return { parsed, demo: getTimelineDemoSummary(parsed) }
    } catch {
      return null
    }
  }

  const handleSaveTimelineForMatch = async () => {
    if (!parsedTimeline || !timelineMatchId) return
    setSavingTimeline(true)
    setTimelineSaveMsg(null)
    try {
      const snapshot = getSnapshotsAtMinutes(parsedTimeline, [5, 10, 15, 20, 25])
      const { error } = await supabase
        .from('team_match_timeline')
        .upsert({ match_id: timelineMatchId, snapshot }, { onConflict: 'match_id' })
      if (error) throw error
      setTimelineSaveMsg({ ok: true, text: 'Timeline enregistrée pour ce match. Consultez l’onglet "Stats timeline" sur la page du match.' })
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
        Importez vos données (parties, timeline) en glissant les fichiers dans les cartes ci-dessous.
      </p>

      {players?.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-400" />
          <span>Ajoutez vos joueurs (pseudo format: Nom#Tag) pour que l'import des parties associe les bons joueurs.</span>
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
          {timelineDemo ? (
            <div className="rounded-lg border border-dark-border bg-dark-bg/50 p-4 text-sm space-y-4">
              <h4 className="font-semibold text-purple-300">Démo — Stats extraites de la timeline</h4>
              {timelineDemo.gameId != null && (
                <p className="text-purple-200/90">
                  <span className="text-gray-500">Game ID associé :</span> <code className="bg-dark-card px-1.5 py-0.5 rounded">{timelineDemo.gameId}</code>
                  {typeof timelineDemo.gameId === 'string' && timelineDemo.gameId.match(/^\d+$/) && (
                    <span className="text-gray-500 text-xs ml-2">(détecté depuis le nom du fichier)</span>
                  )}
                </p>
              )}
              {timelineDemo.gameId === '13' && (
                <p className="text-amber-200/80 text-xs">Mode test : timeline13 = timeline de la game 1 (premier match). Le match est présélectionné pour valider le format.</p>
              )}
              {timelineDemo.gameId != null && timelineDemo.gameId !== '13' && (
                <p className="text-gray-500 text-xs">Associer au match correspondant dans la liste ci-dessous.</p>
              )}
              {timelineDemo.gameId == null && (
                <p className="text-amber-200/80 text-xs">Aucun game ID dans le JSON. Renommer le fichier avec l’ID (ex. timeline_7704801020.txt) pour lier la timeline à un match.</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-gray-300">
                <div><span className="text-gray-500">Durée</span><br />{timelineDemo.duree}</div>
                <div><span className="text-gray-500">Frames</span><br />{timelineDemo.frames}</div>
                <div><span className="text-gray-500">Événements</span><br />{timelineDemo.evenements}</div>
                <div><span className="text-gray-500">Kills</span><br />{timelineDemo.kills}</div>
                <div><span className="text-gray-500">Dragons</span><br />{timelineDemo.dragons} ({timelineDemo.typesDragons})</div>
                <div><span className="text-gray-500">Baron</span><br />{timelineDemo.baron}</div>
                <div><span className="text-gray-500">Heralds</span><br />{timelineDemo.heralds}</div>
                <div><span className="text-gray-500">Tours</span><br />{timelineDemo.tours}</div>
                <div><span className="text-gray-500">Inhibiteurs</span><br />{timelineDemo.inhibs}</div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Kills par joueur (participantId)</p>
                <pre className="bg-dark-card p-2 rounded text-xs overflow-x-auto">{JSON.stringify(timelineDemo.killsParJoueur, null, 0)}</pre>
              </div>
              {timelineDemo.objectifsDragons?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Objectifs dragons (ordre chrono)</p>
                  <ul className="list-disc list-inside text-gray-400">
                    {timelineDemo.objectifsDragons.map((d, i) => (
                      <li key={i}>{d.label} à {d.timeMin} min (joueur {d.killerId})</li>
                    ))}
                  </ul>
                </div>
              )}
              {timelineDemo.toursDetruites?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Tours détruites</p>
                  <ul className="list-disc list-inside text-gray-400">
                    {timelineDemo.toursDetruites.map((t, i) => (
                      <li key={i}>{t.label} à {t.timeMin} min (équipe {t.teamId} perd la tour)</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t border-dark-border pt-4 mt-4">
                <p className="text-gray-500 text-sm mb-2">Associer cette timeline à un match (pour afficher les stats à 5/10/15/20/25 min sur la page du match) :</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={timelineMatchId}
                    onChange={(e) => setTimelineMatchId(e.target.value)}
                    className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white min-w-[200px]"
                  >
                    <option value="">Choisir un match…</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        Game #{m.game_id} — {m.our_win ? 'Victoire' : 'Défaite'} ({m.game_creation ? new Date(m.game_creation).toLocaleDateString('fr-FR') : ''})
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
                {timelineSaveMsg && (
                  <p className={`mt-2 text-sm ${timelineSaveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                    {timelineSaveMsg.text}
                  </p>
                )}
              </div>
              <p className="text-gray-500 text-xs border-t border-dark-border pt-2 mt-4">
                Ce qu’on peut en faire : courbes or/XP par équipe, timeline des objectifs, kills/morts/assists par participant, CS/jungle par frame, position (heatmap).
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Format Exalty/Riot : JSON avec <code className="text-gray-400">frames</code> (timestamp, participantFrames, events). Dépose un fichier pour voir la démo des stats.
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
