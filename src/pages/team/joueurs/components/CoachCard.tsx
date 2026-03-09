/**
 * Coach card — notes coach + champions à travailler + liens VOD joueur
 * Table Supabase : player_coach_notes
 *   (player_id uuid, champ_1 text, champ_2 text, champ_3 text,
 *    coach_text text, player_links text, updated_at timestamptz)
 */
import { useState, useEffect } from 'react'
import { Save, X, ChevronDown, ExternalLink } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachNote {
  id?: string
  player_id: string
  champ_1: string | null
  champ_2: string | null
  champ_3: string | null
  coach_text: string | null
  player_links: string | null
}

// ─── Champion picker ──────────────────────────────────────────────────────────

const POPULAR_CHAMPS = [
  'Aatrox','Ahri','Akali','Alistar','Amumu','Ashe','Azir','Bard','Blitzcrank',
  'Caitlyn','Camille','Darius','Diana','Draven','Ekko','Elise','Ezreal','Fiora',
  'Garen','Graves','Hecarim','Irelia','Janna','Jax','Jinx','Kalista','Karma',
  'Katarina','Kayn','Kennen','KogMaw','Leblanc','LeeSin','Leona','Lissandra',
  'Lucian','Lux','Malphite','Maokai','MasterYi','MissFortune','Nautilus',
  'Nidalee','Nunu','Orianna','Pantheon','Pyke','Riven','Ryze','Samira',
  'Sejuani','Senna','Seraphine','Sivir','Sona','Soraka','Syndra','Thresh',
  'Tristana','Tryndamere','Twisted Fate','Twitch','Varus','Vayne','Veigar',
  'Vi','Viktor','Yasuo','Yone','Yuumi','Zed','Ziggs','Zilean','Zyra',
]

function ChampionSlot({ value, onSelect, label }: {
  value: string | null
  onSelect: (champ: string | null) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = POPULAR_CHAMPS.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl hover:border-accent-blue/50 transition-colors text-sm"
      >
        {value ? (
          <>
            <img
              src={getChampionImage(value)}
              alt={value}
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="font-medium text-white flex-1 text-left">
              {getChampionDisplayName(value) || value}
            </span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-lg bg-dark-card border border-dashed border-dark-border flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
            <span className="text-gray-500 flex-1 text-left">{label}</span>
          </>
        )}
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-dark-border">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-dark-bg text-red-400 text-sm"
              >
                <X size={14} />
                Retirer
              </button>
            )}
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onSelect(c); setOpen(false); setSearch('') }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-dark-bg text-sm text-left"
              >
                <img
                  src={getChampionImage(c)}
                  alt={c}
                  className="w-6 h-6 rounded object-cover"
                />
                {getChampionDisplayName(c) || c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachCard({ playerId }: { playerId: string }) {
  const [note, setNote] = useState<CoachNote>({
    player_id: playerId,
    champ_1: null, champ_2: null, champ_3: null,
    coach_text: null, player_links: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [coachText, setCoachText] = useState('')
  const [playerLinks, setPlayerLinks] = useState('')

  useEffect(() => {
    if (!playerId || !supabase) { setLoading(false); return }
    let cancelled = false
    supabase
      .from('player_coach_notes')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setLoading(false); return }
        if (data) {
          setNote(data)
          setCoachText(data.coach_text || '')
          setPlayerLinks(data.player_links || '')
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [playerId])

  const handleSave = async () => {
    if (!supabase) return
    setSaving(true)
    try {
      const payload = {
        player_id: playerId,
        champ_1: note.champ_1,
        champ_2: note.champ_2,
        champ_3: note.champ_3,
        coach_text: coachText || null,
        player_links: playerLinks || null,
        updated_at: new Date().toISOString(),
      }
      if (note.id) {
        await supabase.from('player_coach_notes').update(payload).eq('id', note.id)
      } else {
        const { data } = await supabase.from('player_coach_notes').insert([payload]).select().single()
        if (data) setNote((prev) => ({ ...prev, id: data.id }))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm py-4">Chargement…</p>
  }

  const links = (playerLinks || '').split('\n').map((l) => l.trim()).filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Champions à travailler */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-violet-500" />
          <h4 className="font-semibold text-white text-sm">Champions à travailler</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ChampionSlot
            value={note.champ_1}
            onSelect={(v) => setNote((prev) => ({ ...prev, champ_1: v }))}
            label="Champion 1"
          />
          <ChampionSlot
            value={note.champ_2}
            onSelect={(v) => setNote((prev) => ({ ...prev, champ_2: v }))}
            label="Champion 2"
          />
          <ChampionSlot
            value={note.champ_3}
            onSelect={(v) => setNote((prev) => ({ ...prev, champ_3: v }))}
            label="Champion 3"
          />
        </div>
      </div>

      {/* Message coach */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full bg-accent-blue" />
          <h4 className="font-semibold text-white text-sm">Message du coach</h4>
        </div>
        <textarea
          value={coachText}
          onChange={(e) => setCoachText(e.target.value)}
          placeholder="Points à travailler, objectifs, feedback sur les dernières games…"
          rows={5}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue resize-y min-h-[100px]"
        />
      </div>

      {/* Liens VOD joueur */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full bg-emerald-500" />
          <h4 className="font-semibold text-white text-sm">Liens VOD / replays (joueur)</h4>
          <span className="text-xs text-gray-500">un lien par ligne</span>
        </div>
        <textarea
          value={playerLinks}
          onChange={(e) => setPlayerLinks(e.target.value)}
          placeholder="https://youtu.be/...&#10;https://twitch.tv/..."
          rows={3}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue resize-y min-h-[80px] font-mono"
        />
        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {links.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
              >
                <ExternalLink size={11} />
                {url.length > 50 ? url.slice(0, 50) + '…' : url}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue/20 border border-accent-blue/40 text-accent-blue rounded-xl text-sm font-medium hover:bg-accent-blue/30 transition-all disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Notes sauvegardées</span>}
      </div>
    </div>
  )
}
