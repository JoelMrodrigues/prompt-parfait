/**
 * Coach card — notes coach + champions à travailler + liens VOD joueur
 * Table Supabase : player_coach_notes
 *   (player_id uuid, champ_1 text, champ_2 text, champ_3 text,
 *    coach_text text, player_links text, updated_at timestamptz)
 */
import { useState, useEffect } from 'react'
import { Save, ExternalLink, Shield } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'
import { fetchTrainingPool } from '../../../../services/supabase/championQueries'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachNote {
  id?: string
  player_id: string
  coach_text: string | null
  player_links: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachCard({ playerId }: { playerId: string }) {
  const [note, setNote] = useState<CoachNote>({ player_id: playerId, coach_text: null, player_links: null })
  const [trainingChamps, setTrainingChamps] = useState<{ id: string; champion_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [coachText, setCoachText] = useState('')
  const [playerLinks, setPlayerLinks] = useState('')

  useEffect(() => {
    if (!playerId || !supabase) { setLoading(false); return }
    let cancelled = false
    Promise.all([
      supabase.from('player_coach_notes').select('*').eq('player_id', playerId).maybeSingle(),
      fetchTrainingPool(playerId),
    ]).then(([{ data }, { data: trainingData }]) => {
      if (cancelled) return
      if (data) {
        setNote(data)
        setCoachText(data.coach_text || '')
        setPlayerLinks(data.player_links || '')
      }
      if (trainingData) setTrainingChamps(trainingData as any)
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
      {/* Champions à travailler — sync Training pool */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-violet-500" />
            <h4 className="font-semibold text-white text-sm">Champions à travailler</h4>
          </div>
          <span className="text-xs text-gray-500">Gérez depuis Pool Champ → Training ou Coaching</span>
        </div>
        {trainingChamps.length === 0 ? (
          <p className="text-sm text-gray-600 bg-dark-bg border border-dashed border-dark-border rounded-xl p-4 text-center">
            Aucun champion assigné. Ajoutez-en depuis l&apos;onglet <span className="text-accent-blue">Coaching → Train Champ</span> ou <span className="text-accent-blue">Pool Champ</span>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trainingChamps.map((c) => (
              <div key={c.champion_id} className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 bg-dark-bg border border-dark-border rounded-xl">
                <img src={getChampionImage(c.champion_id)} alt={c.champion_id} className="w-9 h-9 rounded-lg object-cover border border-dark-border" />
                <div className="flex flex-col">
                  <span className="text-sm text-white font-medium leading-tight">{getChampionDisplayName(c.champion_id) || c.champion_id}</span>
                  <span className="text-[10px] text-accent-blue flex items-center gap-0.5"><Shield size={9} /> Training</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
