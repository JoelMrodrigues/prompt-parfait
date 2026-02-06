/**
 * Page Champion Pool - Gestion des champions par joueur
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTeam } from '../../../hooks/useTeam'
import { loadChampions } from '../../../lib/championLoader'
import { useChampionPool } from './hooks/useChampionPool'
import { PlayerFilterSidebar } from './components/PlayerFilterSidebar'
import { ChampionRoleFilter } from './components/ChampionRoleFilter'
import { ChampionGrid } from './components/ChampionGrid'
import { TierTable } from './components/TierTable'
import { FILTER_TO_CHAMPION_ROLE } from './utils/roleToChampionRole'
import { TIER_KEYS } from './constants/tiers'
import { Save, Search } from 'lucide-react'

const emptyTiers = () => Object.fromEntries(TIER_KEYS.map((k) => [k, []]))

export const ChampionPoolPage = () => {
  const { players = [], refetch } = useTeam()
  const { saveAllChampionPools, buildTiersFromPlayers } = useChampionPool()
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [champions, setChampions] = useState([])
  const [activeTier, setActiveTier] = useState(null)
  const [tiersByPlayer, setTiersByPlayer] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const hasHydrated = useRef(false)

  useEffect(() => {
    if (players.length > 0 && selectedPlayerId === null) {
      setSelectedPlayerId(players[0].id)
    }
  }, [players, selectedPlayerId])

  useEffect(() => {
    loadChampions().then(setChampions)
  }, [])

  useEffect(() => {
    if (hasHydrated.current || players.length === 0 || champions.length === 0) return
    hasHydrated.current = true
    setTiersByPlayer(buildTiersFromPlayers(players, champions))
  }, [players, champions, buildTiersFromPlayers])

  const tiers = tiersByPlayer[selectedPlayerId] || emptyTiers()

  const addChampionToTier = useCallback(
    (champ, tier) => {
      if (!selectedPlayerId) return
      const playerTiers = { ...(tiersByPlayer[selectedPlayerId] || emptyTiers()) }
      const list = playerTiers[tier] || []
      if (list.some((c) => c.id === champ.id)) return
      playerTiers[tier] = [...list, champ]
      setTiersByPlayer((prev) => ({ ...prev, [selectedPlayerId]: playerTiers }))
    },
    [selectedPlayerId, tiersByPlayer]
  )

  const removeChampionFromTier = useCallback(
    (champ, tier) => {
      if (!selectedPlayerId) return
      const playerTiers = { ...(tiersByPlayer[selectedPlayerId] || emptyTiers()) }
      playerTiers[tier] = (playerTiers[tier] || []).filter((c) => c.id !== champ.id)
      setTiersByPlayer((prev) => ({ ...prev, [selectedPlayerId]: playerTiers }))
    },
    [selectedPlayerId, tiersByPlayer]
  )

  const handleDrop = useCallback(
    (champ, targetTier) => {
      if (!selectedPlayerId) return
      const playerTiers = { ...(tiersByPlayer[selectedPlayerId] || emptyTiers()) }
      // Retirer des autres colonnes (au cas où on déplace depuis une colonne)
      TIER_KEYS.forEach((k) => {
        playerTiers[k] = (playerTiers[k] || []).filter((c) => c.id !== champ.id)
      })
      if (!playerTiers[targetTier].some((c) => c.id === champ.id)) {
        playerTiers[targetTier] = [...playerTiers[targetTier], champ]
      }
      setTiersByPlayer((prev) => ({ ...prev, [selectedPlayerId]: playerTiers }))
    },
    [selectedPlayerId, tiersByPlayer]
  )

  const handleColumnSelect = useCallback((tier) => {
    setActiveTier((prev) => (prev === tier ? null : tier))
  }, [])

  const championIdsInTiers = useMemo(() => {
    return TIER_KEYS.flatMap((k) => (tiers[k] || []).map((c) => c.id))
  }, [tiers])

  const filteredChampions = useMemo(() => {
    let result = champions
    if (selectedRoleFilter) {
      const championRole = FILTER_TO_CHAMPION_ROLE[selectedRoleFilter]
      result = result.filter((c) => c.roles?.includes(championRole))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q)
      )
    }
    return result
  }, [champions, selectedRoleFilter, searchQuery])

  return (
    <div className="flex w-full -ml-6 -mr-6">
      {/* Sidebar filtre joueurs (à gauche) */}
      <PlayerFilterSidebar
        players={players}
        selectedId={selectedPlayerId}
        onSelect={setSelectedPlayerId}
      />

      {/* Zone principale */}
      <div className="flex-1 min-w-0 pl-6 pr-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold mb-2">Pool de Champions</h2>
            <p className="text-gray-400">
              Gérez les champions joués et maîtrisés par vos joueurs. Glissez-déposez ou
              sélectionnez une colonne puis cliquez sur un champion.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setSaving(true)
              setSaveMessage(null)
              try {
                await saveAllChampionPools(tiersByPlayer)
                await refetch()
                setSaveMessage('Pool sauvegardé !')
                setTimeout(() => setSaveMessage(null), 3000)
              } catch (err) {
                console.error('Erreur sauvegarde pool:', err)
                setSaveMessage(`Erreur: ${err.message}`)
              } finally {
                setSaving(false)
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            <Save size={18} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
        {saveMessage && (
          <p className={`text-sm mb-4 ${saveMessage.startsWith('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
            {saveMessage}
          </p>
        )}

        {/* Tableau S A B C */}
        <TierTable
          tiers={tiers}
          activeTier={activeTier}
          onColumnSelect={handleColumnSelect}
          onDrop={handleDrop}
          onRemove={removeChampionFromTier}
        />

        {/* Champions avec filtre par rôle */}
        <div className="mt-8">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="font-display text-lg font-semibold text-white">Tous les champions</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Rechercher un champion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 w-48 sm:w-56 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
                  />
                </div>
                <ChampionRoleFilter
                  selectedRole={selectedRoleFilter}
                  onSelect={setSelectedRoleFilter}
                />
              </div>
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <ChampionGrid
              champions={filteredChampions}
              activeTier={activeTier}
              onAddChampion={addChampionToTier}
              championIdsInTiers={championIdsInTiers}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
