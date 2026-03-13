import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { fetchSyncRank } from '../../../lib/riotSync'
import { useToast } from '../../../contexts/ToastContext'
import { OPGG_TO_RIOT, generateOpggLink, generateDpmLink } from '../../../lib/team/linkGenerators'

const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP', 'FLEX']

const REGIONS = [
  { value: 'euw1', label: 'EUW — Europe West' },
  { value: 'eun1', label: 'EUNE — Europe Nordic & East' },
  { value: 'na1', label: 'NA — North America' },
  { value: 'kr', label: 'KR — Korea' },
  { value: 'br1', label: 'BR — Brazil' },
  { value: 'la1', label: 'LAN — Latin America North' },
  { value: 'la2', label: 'LAS — Latin America South' },
  { value: 'oc1', label: 'OCE — Oceania' },
  { value: 'tr1', label: 'TR — Turkey' },
  { value: 'ru', label: 'RU — Russia' },
  { value: 'jp1', label: 'JP — Japan' },
]

interface PlayerData {
  player_name?: string
  pseudo?: string
  secondary_account?: string
  position?: string
  player_type?: string
  lolpro_link?: string
  rank?: string
  region?: string
  opgg_link?: string
  [key: string]: unknown
}

interface PlayerModalProps {
  player: PlayerData | null
  onSave: (data: PlayerData) => void
  onClose: () => void
}

export const PlayerModal = ({ player, onSave, onClose }: PlayerModalProps) => {
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast()
  const [playerName, setPlayerName] = useState(player?.player_name || '')
  const [pseudo, setPseudo] = useState(player?.pseudo || '')
  const [secondaryAccount, setSecondaryAccount] = useState(player?.secondary_account || '')
  const [region, setRegion] = useState('euw1')
  const [role, setRole] = useState(player?.position || 'TOP')
  const [playerType, setPlayerType] = useState<'starter' | 'sub'>(player?.player_type === 'sub' ? 'sub' : 'starter')
  const [lolpro, setLolpro] = useState(player?.lolpro_link || '')
  const [rank, setRank] = useState(player?.rank || '')
  const [syncing, setSyncing] = useState(false)

  const opgg = generateOpggLink(pseudo, region)
  const dpm = generateDpmLink(pseudo)

  const getTopChampions = () => {
    if (!player?.top_champions) return []
    if (typeof player.top_champions === 'string') {
      try {
        return JSON.parse(player.top_champions)
      } catch {
        return []
      }
    }
    return player.top_champions || []
  }

  const [topChampions, setTopChampions] = useState(getTopChampions())

  useEffect(() => {
    if (player) {
      setPlayerName(player.player_name || '')
      setPseudo(player.pseudo || '')
      setSecondaryAccount(player.secondary_account || '')
      setRole(player.position || 'TOP')
      setPlayerType(player.player_type === 'sub' ? 'sub' : 'starter')
      setLolpro(player.lolpro_link || '')
      setRank(player.rank || '')
      setTopChampions(getTopChampions())

      // Priorité : player.region (Riot format) → parser opgg_link (rétro-compat) → défaut euw1
      if (player.region) {
        setRegion(player.region)
      } else if (player.opgg_link) {
        const match = player.opgg_link.match(/summoners\/([^/]+)\//)
        if (match) {
          const opggRegion = match[1]
          setRegion(OPGG_TO_RIOT[opggRegion] || 'euw1')
        }
      }
    }
  }, [player])

  const handleSyncRank = async () => {
    const p = pseudo.trim()
    if (!p || (!p.includes('#') && !p.includes('/'))) {
      toastInfo('Pseudo au format GameName#TagLine requis pour la sync')
      return
    }
    setSyncing(true)
    try {
      const { rank: r } = await fetchSyncRank(p)
      setRank(r || '')
      if (r) toastSuccess('Rank synchronisé: ' + r)
      else toastInfo('Aucun rank Solo Q trouvé')
    } catch (err) {
      toastError('Erreur sync: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!playerName || !pseudo || !region) {
      toastError('Veuillez remplir tous les champs obligatoires (Nom, Pseudo, Région)')
      return
    }
    onSave({
      player_name: playerName,
      pseudo,
      secondary_account: secondaryAccount.trim() || null,
      position: role,
      player_type: playerType,
      region,
      opgg_link: generateOpggLink(pseudo, region) || null,
      lolpro_link: lolpro || null,
      rank: rank || null,
      top_champions: topChampions.length > 0 ? topChampions : null,
      player_order: player?.player_order || 1,
    })
  }

  const addChampion = () => {
    if (topChampions.length < 5) setTopChampions([...topChampions, { name: '', winrate: null }])
  }
  const removeChampion = (i) => setTopChampions(topChampions.filter((_, idx) => idx !== i))
  const updateChampion = (i, field, value) => {
    const updated = [...topChampions]
    updated[i] = { ...updated[i], [field]: value }
    setTopChampions(updated)
  }

  const ROLE_COLORS: Record<string, string> = {
    TOP: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    JNG: 'text-green-400 border-green-500/40 bg-green-500/10',
    MID: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    BOT: 'text-red-400 border-red-500/40 bg-red-500/10',
    SUP: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    FLEX: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
  }
  const ROLE_ACTIVE: Record<string, string> = {
    TOP: 'bg-blue-500 border-blue-500 text-white',
    JNG: 'bg-green-500 border-green-500 text-white',
    MID: 'bg-yellow-500 border-yellow-500 text-white',
    BOT: 'bg-red-500 border-red-500 text-white',
    SUP: 'bg-purple-500 border-purple-500 text-white',
    FLEX: 'bg-teal-500 border-teal-500 text-white',
  }

  const modal = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-dark-border rounded-t-2xl">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {player ? 'Modifier le joueur' : 'Ajouter un joueur'}
            </h2>
            {player && (
              <p className="text-xs text-gray-500 mt-0.5">{player.player_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Section Identité */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Identité</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ex: John Doe"
                    maxLength={50}
                    className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Pseudo Riot ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Summoner#EUW"
                    maxLength={50}
                    className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Région <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white"
                    required
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Compte secondaire</label>
                  <input
                    type="text"
                    value={secondaryAccount}
                    onChange={(e) => setSecondaryAccount(e.target.value)}
                    placeholder="Alt#EUW"
                    maxLength={50}
                    className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Rôle & Type */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Rôle & Profil</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {ROLES.map((r) => {
                const isActive = role === r
                const label = r === 'BOT' ? 'ADC' : r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                      isActive
                        ? (ROLE_ACTIVE[r] || 'bg-accent-blue border-accent-blue text-white')
                        : (ROLE_COLORS[r] || 'text-gray-400 border-dark-border bg-dark-bg hover:border-gray-500')
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="flex h-[38px] rounded-lg overflow-hidden border border-dark-border w-48">
              <button
                type="button"
                onClick={() => setPlayerType('starter')}
                className={`flex-1 text-xs font-semibold transition-colors ${
                  playerType === 'starter' ? 'bg-accent-blue text-white' : 'bg-dark-bg text-gray-500 hover:text-white'
                }`}
              >
                Titulaire
              </button>
              <button
                type="button"
                onClick={() => setPlayerType('sub')}
                className={`flex-1 text-xs font-semibold transition-colors ${
                  playerType === 'sub' ? 'bg-gray-600 text-white' : 'bg-dark-bg text-gray-500 hover:text-white'
                }`}
              >
                Sub
              </button>
            </div>
          </div>

          {/* Section Rang & Sync */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Rang</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="Ex: Master 364 LP"
                maxLength={30}
                className="px-3 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
              />
              <button
                type="button"
                onClick={handleSyncRank}
                disabled={syncing || !pseudo || (!pseudo.includes('#') && !pseudo.includes('/'))}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue/15 border border-accent-blue/40 rounded-lg text-sm text-accent-blue hover:bg-accent-blue/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                <span className={syncing ? 'animate-spin inline-block' : ''}>⟳</span>
                {syncing ? 'Sync…' : 'Synchroniser le rang'}
              </button>
            </div>
            {pseudo && (
              <div className="flex gap-3 mt-2">
                {region && (
                  <a href={opgg} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-accent-blue transition-colors truncate">
                    OP.gg ↗
                  </a>
                )}
                <a href={dpm} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-accent-blue transition-colors truncate">
                  dpm.lol ↗
                </a>
              </div>
            )}
          </div>

          {/* Section Pool champions */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
              Pool de champions <span className="text-gray-600 normal-case text-[10px]">(facultatif — max 5)</span>
            </p>
            <div className="space-y-2">
              {topChampions.map((champ, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={champ.name || ''}
                    onChange={(e) => updateChampion(index, 'name', e.target.value)}
                    placeholder="Nom du champion"
                    className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
                  />
                  <input
                    type="number"
                    value={champ.winrate || ''}
                    onChange={(e) => updateChampion(index, 'winrate', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="WR %"
                    min="0" max="100"
                    className="w-20 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white text-center placeholder-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeChampion(index)}
                    className="px-3 py-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              {topChampions.length < 5 && (
                <button
                  type="button"
                  onClick={addChampion}
                  className="w-full px-4 py-2 bg-dark-bg border border-dashed border-dark-border rounded-lg hover:border-accent-blue/50 transition-colors text-sm text-gray-500 hover:text-gray-300"
                >
                  + Ajouter un champion
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-dark-bg border border-dark-border text-gray-300 rounded-xl font-medium hover:text-white hover:bg-dark-border transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-accent-blue text-white rounded-xl font-semibold hover:bg-accent-blue/90 transition-all"
            >
              {player ? 'Enregistrer' : 'Ajouter le joueur'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}
