/**
 * Page Matchs - Liste des parties, ajout JSON, actualisation
 * Source centralisée des données matchs pour les autres pages équipe
 */
import { useState, useRef, useCallback } from 'react'
import { Plus, RefreshCw, FileJson, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { useTeamMatches } from '../../../hooks/useTeamMatches'
import { parseExaltyMatch } from '../../../lib/team/exaltyMatchParser'
import { importExaltyMatches } from '../../../lib/team/exaltyMatchImporter'
import { getChampionImage } from '../../../lib/championImages'

export const MatchsPage = () => {
  const { team, players = [], refetch: refetchTeam } = useTeam()
  const { matches, loading, refetch } = useTeamMatches(team?.id)
  const [showAddModal, setShowAddModal] = useState(false)
  const [files, setFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const fileInputRef = useRef(null)

  const handleAddMatch = useCallback(() => {
    setShowAddModal(true)
    setFiles([])
    setError(null)
    setSuccessMsg(null)
  }, [])

  const handleFileChange = (e) => {
    const items = Array.from(e.target?.files || [])
    const jsons = items.filter((f) => f.name.endsWith('.json'))
    if (jsons.length > 0) {
      setFiles(jsons)
      setError(null)
    }
    e.target.value = ''
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer?.files || [])
    const jsons = items.filter((f) => f.name.endsWith('.json'))
    if (jsons.length > 0) {
      setFiles(jsons)
      setError(null)
    }
  }, [])

  const handleImport = async () => {
    if (!team?.id || files.length === 0) return
    setImporting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const teamPlayers = players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        secondary_account: p.secondary_account,
        position: p.position,
      }))
      const originals = []
      for (const f of files) {
        const text = await f.text()
        const json = JSON.parse(text)
        originals.push(...(Array.isArray(json) ? json : [json]))
      }
      const res = await importExaltyMatches(originals, team.id, teamPlayers)
      setSuccessMsg(
        `${res.imported} match(es) ajouté(s)${res.skipped > 0 ? `, ${res.skipped} déjà présents` : ''}`
      )
      if (res.imported > 0) {
        await refetch()
        refetchTeam?.()
      }
      setFiles([])
      setTimeout(() => setShowAddModal(false), 1500)
    } catch (e) {
      setError(e.message || 'Erreur lors de l\'import')
    } finally {
      setImporting(false)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setFiles([])
    setError(null)
    setSuccessMsg(null)
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold mb-1">Matchs</h2>
          <p className="text-gray-400">
            Gérez vos parties. Les données sont utilisées pour les stats joueurs et Pool Champ.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={handleAddMatch}
            disabled={players?.length === 0}
            className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Ajouter une partie
          </button>
        </div>
      </div>

      {players?.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-400" />
          <span>Ajoutez d'abord vos joueurs (pseudo format: Nom#Tag) pour pouvoir ajouter des parties.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <FileJson size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 mb-2">Aucun match pour le moment</p>
          <p className="text-gray-500 text-sm mb-6">
            Cliquez sur &quot;+ Ajouter une partie&quot; et importez un fichier JSON Exalty
          </p>
          <button
            onClick={handleAddMatch}
            disabled={players?.length === 0}
            className="px-6 py-3 bg-accent-blue hover:bg-accent-blue/90 rounded-lg font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <Plus size={18} />
            Ajouter une partie
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const participants = m.team_match_participants || []
            return (
              <div
                key={m.id}
                className="bg-dark-card border border-dark-border rounded-lg p-4 hover:border-dark-border/80 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-500">#{m.game_id}</span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        m.our_win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {m.our_win ? 'Victoire' : 'Défaite'}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {m.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}
                    </span>
                  </div>
                  {m.game_creation && (
                    <span className="text-xs text-gray-600">
                      {new Date(m.game_creation).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg rounded-lg"
                    >
                      <img
                        src={getChampionImage(p.champion_name)}
                        alt={p.champion_name}
                        className="w-7 h-7 rounded object-cover"
                      />
                      <span className="text-sm">{p.champion_name}</span>
                      <span className="text-xs text-gray-500">
                        {p.kills}/{p.deaths}/{p.assists}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ajouter une partie */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl font-bold">Ajouter une partie</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center hover:border-accent-blue/50 transition-colors cursor-pointer mb-4"
              onClick={() => fileInputRef.current?.click?.()}
            >
              <FileJson size={40} className="mx-auto text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm">
                {files.length > 0
                  ? `${files.length} fichier(s) sélectionné(s)`
                  : 'Glissez un fichier JSON ici ou cliquez'}
              </p>
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-dark-bg rounded">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} className="text-red-400" />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-400" />
                {successMsg}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || files.length === 0}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Importer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
