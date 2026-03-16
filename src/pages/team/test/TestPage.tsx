/**
 * TestPage — LCU Direct Import (sandbox isolé)
 * ⚠️ Nécessite que `npm run dev` soit lancé (backend local sur :3001)
 * ⚠️ Nécessite League of Legends ouvert + connecté
 */
import { useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Download, CheckSquare, Square, Swords, Trophy, AlertCircle, ChevronDown, ChevronUp, User, FileJson } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { importExaltyMatches } from '../../../lib/team/exaltyMatchImporter'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Composant principal ──────────────────────────────────────────────────────

export const TestPage = () => {
  const { team, players } = useTeam()

  // Lockfile + connexion
  const [lockfile, setLockfile] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [summoner, setSummoner] = useState<Summoner | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [lockfileOpen, setLockfileOpen] = useState(true)

  // Games
  const [games, setGames] = useState<LcuGame[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)

  // Sélection + import
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [matchType, setMatchType] = useState<'scrim' | 'tournament'>('scrim')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const BACKEND = 'http://localhost:3001'

  // ─── Connexion ──────────────────────────────────────────────────────────────

  async function handleConnect() {
    if (!lockfile.trim()) return
    setConnecting(true)
    setConnectError(null)
    setSummoner(null)
    setGames([])
    setSelected(new Set())
    try {
      const res = await fetch(`${BACKEND}/api/lcu/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockfile: lockfile.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSummoner({ ...data.summoner, port: data.port })
      setLockfileOpen(false)
    } catch (err: any) {
      setConnectError(err.message || 'Erreur de connexion')
    } finally {
      setConnecting(false)
    }
  }

  // ─── Chargement des games ───────────────────────────────────────────────────

  async function handleLoadGames() {
    if (!summoner) return
    setLoadingGames(true)
    setGamesError(null)
    setGames([])
    setSelected(new Set())
    setImportResult(null)
    try {
      const res = await fetch(`${BACKEND}/api/lcu/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: summoner.port,
          password: lockfile.trim().split(':')[3],
          puuid: summoner.puuid,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setGames(data.games)
      if (data.games.length === 0) setGamesError('Aucune custom game trouvée dans l\'historique.')
    } catch (err: any) {
      setGamesError(err.message || 'Erreur lors du chargement des games')
    } finally {
      setLoadingGames(false)
    }
  }

  // ─── Import dans Supabase ───────────────────────────────────────────────────

  async function handleImport() {
    if (!selected.size || !team?.id || !players?.length || !summoner) return
    setImporting(true)
    setImportResult(null)
    try {
      const password = lockfile.trim().split(':')[3]
      const selectedGames = games.filter(g => selected.has(g.gameId))

      // Récupère le détail complet (10 participants) pour chaque game via /lol-match-history/v1/games/{gameId}
      const fullGames: any[] = []
      for (const g of selectedGames) {
        try {
          const res = await fetch(`${BACKEND}/api/lcu/game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port: summoner.port, password, gameId: g.gameId }),
          })
          const data = await res.json()
          if (data.success && data.game) {
            fullGames.push(data.game)
          } else {
            // Fallback sur _raw si l'endpoint échoue
            fullGames.push(g._raw)
          }
        } catch {
          fullGames.push(g._raw)
        }
      }

      const result = await importExaltyMatches(fullGames, team.id, players, matchType)
      setImportResult(result)
      setSelected(new Set())
    } catch (err: any) {
      setImportResult({ imported: 0, skipped: 0, errors: [err.message] })
    } finally {
      setImporting(false)
    }
  }

  // ─── Téléchargement JSON ────────────────────────────────────────────────────

  async function handleDownloadJson(game: LcuGame, e: React.MouseEvent) {
    e.stopPropagation()
    if (!summoner) return
    setDownloadingId(game.gameId)
    try {
      const password = lockfile.trim().split(':')[3]
      const res = await fetch(`${BACKEND}/api/lcu/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: summoner.port, password, gameId: game.gameId }),
      })
      const data = await res.json()
      const json = data.success && data.game ? data.game : game._raw
      const date = new Date(game.gameCreation).toISOString().slice(0, 10)
      const filename = `game_${game.gameId}_${date}.json`
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  function toggleSelect(gameId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(gameId) ? next.delete(gameId) : next.add(gameId)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === games.length ? new Set() : new Set(games.map(g => g.gameId)))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
          SANDBOX
        </div>
        <h1 className="font-display text-2xl font-bold text-white">LCU Direct Import</h1>
        <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${summoner ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-gray-500 bg-dark-card border-dark-border'}`}>
          {summoner ? <Wifi size={12} /> : <WifiOff size={12} />}
          {summoner ? `Connecté — ${summoner.displayName}` : 'Non connecté'}
        </div>
      </div>

      {/* Step 1 — Lockfile */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setLockfileOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-dark-bg/30 transition-colors"
        >
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
              <br />Ouvre le fichier avec un éditeur de texte (Notepad) et copie tout le contenu.
            </p>
            <textarea
              value={lockfile}
              onChange={e => setLockfile(e.target.value)}
              placeholder="LeagueClient:12345:63569:motdepasse:https"
              rows={2}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-accent-blue/50 resize-none"
            />
            {connectError && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                <AlertCircle size={16} className="shrink-0" />
                {connectError}
              </div>
            )}
            <button
              type="button"
              onClick={handleConnect}
              disabled={!lockfile.trim() || connecting}
              className="px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-50 hover:bg-accent-blue/90 transition-colors flex items-center gap-2"
            >
              {connecting && <RefreshCw size={14} className="animate-spin" />}
              {connecting ? 'Connexion…' : 'Se connecter au LCU'}
            </button>
          </div>
        )}
      </div>

      {/* Step 2 — Charger les games */}
      {summoner && (
        <div className="rounded-2xl border border-dark-border bg-dark-card/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-border/50">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-white text-sm">Custom games disponibles</span>
              {games.length > 0 && <span className="text-xs text-gray-500">{games.length} games</span>}
            </div>
            <div className="flex items-center gap-2">
              {/* Summoner info */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <User size={12} />
                {summoner.displayName}
              </div>
              <button
                type="button"
                onClick={handleLoadGames}
                disabled={loadingGames}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-bg/60 border border-dark-border text-gray-300 text-xs font-medium disabled:opacity-50 hover:text-white transition-colors"
              >
                <RefreshCw size={12} className={loadingGames ? 'animate-spin' : ''} />
                {loadingGames ? 'Chargement…' : 'Charger les games'}
              </button>
            </div>
          </div>

          {gamesError && (
            <div className="flex items-center gap-2 text-amber-400 text-sm px-5 py-3">
              <AlertCircle size={15} className="shrink-0" />
              {gamesError}
            </div>
          )}

          {games.length > 0 && (
            <>
              {/* Toolbar sélection */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-dark-bg/30 border-b border-dark-border/40">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {selected.size === games.length
                    ? <CheckSquare size={14} className="text-accent-blue" />
                    : <Square size={14} />}
                  {selected.size === games.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
                <span className="text-xs text-gray-500">{selected.size} sélectionné(s)</span>
              </div>

              {/* Liste des games */}
              <div className="divide-y divide-dark-border/30">
                {games.map(g => {
                  const isSelected = selected.has(g.gameId)
                  return (
                    <div
                      key={g.gameId}
                      role="row"
                      className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-accent-blue/5' : 'hover:bg-dark-bg/30'}`}
                      onClick={() => toggleSelect(g.gameId)}
                    >
                      <div className={`shrink-0 ${isSelected ? 'text-accent-blue' : 'text-gray-600'}`}>
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          Custom Game · {formatDuration(g.gameDuration)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {formatDate(g.gameCreation)} · {g.participants.slice(0, 5).map(p => p.summonerName).join(', ')}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 shrink-0">#{g.gameId}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadJson(g, e)}
                        disabled={downloadingId === g.gameId}
                        title="Télécharger le JSON"
                        className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-accent-blue hover:bg-accent-blue/10 transition-colors disabled:opacity-40"
                      >
                        {downloadingId === g.gameId
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <FileJson size={13} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {games.length === 0 && !gamesError && !loadingGames && (
            <p className="text-gray-500 text-sm px-5 py-6 text-center">
              Clique sur "Charger les games" pour voir les custom games disponibles.
            </p>
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

          {/* Type de match */}
          <div className="flex gap-2">
            {([
              { id: 'scrim' as const, label: 'Scrim', icon: Swords },
              { id: 'tournament' as const, label: 'Tournoi', icon: Trophy },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMatchType(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  matchType === id
                    ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                    : 'bg-dark-bg/50 border-dark-border text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {!team && (
            <p className="text-amber-400 text-xs">⚠️ Aucune équipe active — impossible d'importer.</p>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !team}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-50 hover:bg-accent-blue/90 transition-colors"
          >
            {importing && <RefreshCw size={14} className="animate-spin" />}
            <Download size={14} />
            {importing ? 'Import en cours…' : `Importer dans Supabase (${matchType})`}
          </button>

          {importResult && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${importResult.errors.length ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
              <p className="font-semibold">
                {importResult.imported} importée(s) · {importResult.skipped} ignorée(s)
                {importResult.errors.length > 0 && ` · ${importResult.errors.length} erreur(s)`}
              </p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs mt-1 text-rose-400">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
