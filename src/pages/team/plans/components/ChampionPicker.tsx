/**
 * Picker de champion pour assigner une icône à un token joueur.
 * S'ouvre en modal centré via createPortal.
 */
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Search } from 'lucide-react'
import { CHAMPION_LIST } from '../constants'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'

interface Props {
  tokenId: string
  currentChampion?: string | null
  onSelect: (tokenId: string, championName: string | null) => void
  onClose: () => void
}

export function ChampionPicker({ tokenId, currentChampion, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return CHAMPION_LIST
    const q = search.toLowerCase()
    return CHAMPION_LIST.filter((c) => c.toLowerCase().includes(q))
  }, [search])

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl flex flex-col w-[520px] max-h-[80vh]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <h3 className="text-sm font-semibold text-white">Choisir un champion</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 py-2 border-b border-dark-border">
          <div className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5">
            <Search size={13} className="text-gray-500 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {/* Aucun (reset) */}
            <button
              onClick={() => { onSelect(tokenId, null); onClose() }}
              className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-colors ${
                !currentChampion ? 'ring-2 ring-accent-blue bg-accent-blue/10' : 'hover:bg-dark-bg/60'
              }`}
              title="Aucun champion"
            >
              <div className="w-10 h-10 rounded-md bg-dark-bg border border-dark-border flex items-center justify-center">
                <X size={14} className="text-gray-600" />
              </div>
              <span className="text-[9px] text-gray-600 truncate w-full text-center">Aucun</span>
            </button>

            {filtered.map((champ) => (
              <button
                key={champ}
                onClick={() => { onSelect(tokenId, champ); onClose() }}
                className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-colors ${
                  currentChampion === champ ? 'ring-2 ring-accent-blue bg-accent-blue/10' : 'hover:bg-dark-bg/60'
                }`}
                title={getChampionDisplayName(champ)}
              >
                <img
                  src={getChampionImage(champ)}
                  alt={champ}
                  className="w-10 h-10 rounded-md object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/resources/champions/icons/default.jpg' }}
                />
                <span className="text-[9px] text-gray-400 truncate w-full text-center leading-tight">
                  {getChampionDisplayName(champ)}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-8">Aucun résultat</p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
