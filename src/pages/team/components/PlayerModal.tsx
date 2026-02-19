import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { fetchSyncRank } from '../../../lib/riotSync'
import { useToast } from '../../../contexts/ToastContext'

const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

export const PlayerModal = ({ player, onSave, onClose }) => {
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast()
  const [playerName, setPlayerName] = useState(player?.player_name || '')
  const [pseudo, setPseudo] = useState(player?.pseudo || '')
  const [secondaryAccount, setSecondaryAccount] = useState(player?.secondary_account || '')
  const [region, setRegion] = useState('euw')
  const [role, setRole] = useState(player?.position || 'TOP')
  const [lolpro, setLolpro] = useState(player?.lolpro_link || '')
  const [rank, setRank] = useState(player?.rank || '')
  const [syncing, setSyncing] = useState(false)

  const generateOpggLink = (p, r) => {
    if (!p || !r) return ''
    return `https://op.gg/fr/lol/summoners/${r}/${encodeURIComponent(p.replace(/#/g, '-'))}`
  }

  const generateDpmLink = (p) => {
    if (!p) return ''
    return `https://dpm.lol/${encodeURIComponent(p.replace(/#/g, '-'))}?queue=solo`
  }

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
      if (player.opgg_link) {
        const match = player.opgg_link.match(/summoners\/([^/]+)\//)
        if (match) setRegion(match[1])
      }
      setRole(player.position || 'TOP')
      setLolpro(player.lolpro_link || '')
      setRank(player.rank || '')
      setTopChampions(getTopChampions())
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl font-bold">
            {player ? 'Modifier le joueur' : 'Ajouter un joueur'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom du joueur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ex: John Doe"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Pseudo du joueur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Ex: SummonerName"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Compte secondaire <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              type="text"
              value={secondaryAccount}
              onChange={(e) => setSecondaryAccount(e.target.value)}
              placeholder="Ex: AltAccount#EUW"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
              required
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {pseudo && (
            <div className="space-y-2 p-3 bg-dark-bg/50 border border-dark-border rounded-lg">
              {region && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">OP.gg:</span>
                  <a
                    href={opgg}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue hover:underline truncate max-w-[200px]"
                  >
                    {opgg}
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">dpm.lol:</span>
                <a
                  href={dpm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-blue hover:underline truncate max-w-[200px]"
                >
                  {dpm}
                </a>
              </div>
              <button
                type="button"
                onClick={handleSyncRank}
                disabled={syncing || !pseudo || (!pseudo.includes('#') && !pseudo.includes('/'))}
                className="w-full mt-2 px-4 py-2 bg-accent-blue/20 border border-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors disabled:opacity-50 text-sm"
              >
                {syncing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Sync rank...
                  </span>
                ) : (
                  '⟳ Synchroniser le rank'
                )}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Lol Pro <span className="text-gray-400 text-xs">(facultatif)</span>
            </label>
            <input
              type="url"
              value={lolpro}
              onChange={(e) => setLolpro(e.target.value)}
              placeholder="https://www.lolpros.gg/player/..."
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Rang <span className="text-gray-400 text-xs">(ex: Master 364 LP)</span>
            </label>
            <input
              type="text"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="Master 364 LP"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Top 5 Champions <span className="text-gray-400 text-xs">(facultatif)</span>
            </label>
            <div className="space-y-2">
              {topChampions.map((champ, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={champ.name || ''}
                    onChange={(e) => updateChampion(index, 'name', e.target.value)}
                    placeholder="Nom du champion"
                    className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    value={champ.winrate || ''}
                    onChange={(e) =>
                      updateChampion(
                        index,
                        'winrate',
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="WR %"
                    min="0"
                    max="100"
                    className="w-20 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeChampion(index)}
                    className="px-3 py-2 bg-red-500/20 border border-red-500 rounded-lg hover:bg-red-500/30 transition-colors text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
              {topChampions.length < 5 && (
                <button
                  type="button"
                  onClick={addChampion}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border border-dashed rounded-lg hover:border-accent-blue transition-colors text-sm text-gray-400"
                >
                  + Ajouter un champion
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-dark-bg border border-dark-border text-white rounded-lg font-semibold hover:bg-dark-card transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-accent-blue text-white rounded-lg font-semibold hover:bg-accent-blue/90 transition-all"
            >
              {player ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
