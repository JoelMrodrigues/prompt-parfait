/**
 * Coach card — notes coach + champions à travailler + liens VOD joueur
 * Table Supabase : player_coach_notes
 *   (player_id uuid, champ_1 text, champ_2 text, champ_3 text,
 *    coach_text text, player_links text, updated_at timestamptz)
 */
import { useState, useEffect } from 'react'
import { Save, ExternalLink, Shield, Link } from 'lucide-react'
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, accent = '#3b82f6' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="relative rounded-2xl bg-dark-bg border border-dark-border/50 overflow-hidden"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}18` }}
    >
      {/* top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
      <div className="p-5">{children}</div>
    </div>
  )
}

function SectionHeader({ icon, label, sub, color }: { icon: React.ReactNode; label: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="font-semibold text-white text-sm">{label}</span>
      </div>
      {sub && <span className="text-[11px] text-gray-600">{sub}</span>}
    </div>
  )
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
  const [coachFocused, setCoachFocused] = useState(false)

  useEffect(() => {
    if (!playerId || !supabase) { setLoading(false); return undefined }
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
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm py-4">Chargement…</p>
  }

  const links = (playerLinks || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const charCount = coachText.length

  return (
    <div className="space-y-3">
      {/* ── Champions à travailler ── */}
      <Section accent="#8b5cf6">
        <SectionHeader icon={<Shield size={13} />} label="Champions à travailler" sub="Pool Champ → Training" color="#8b5cf6" />
        {trainingChamps.length === 0 ? (
          <div className="flex items-center justify-center py-4 border border-dashed border-dark-border/40 rounded-xl">
            <p className="text-sm text-gray-600 text-center">
              Aucun champion assigné —{' '}
              <span className="text-violet-400">Pool Champ</span> ou{' '}
              <span className="text-violet-400">Coaching → Train Champ</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trainingChamps.map((c) => (
              <div
                key={c.champion_id}
                className="group flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border border-dark-border/60 hover:border-violet-500/40 bg-dark-card transition-colors hover:bg-violet-500/5"
              >
                <div className="relative">
                  <img src={getChampionImage(c.champion_id)} alt={c.champion_id} className="w-8 h-8 rounded-lg object-cover" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-violet-500 rounded-full flex items-center justify-center">
                    <Shield size={6} className="!text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-medium leading-tight">{getChampionDisplayName(c.champion_id) || c.champion_id}</span>
                  <span className="text-[10px] text-violet-400">Training</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Message du coach ── */}
      <Section accent="#3b82f6">
        <SectionHeader icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        } label="Message du coach" color="#3b82f6" />

        {/* Notebook-style textarea */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 60%)',
            boxShadow: coachFocused ? '0 0 0 1px rgba(59,130,246,0.4), 0 4px 20px rgba(59,130,246,0.08)' : '0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* subtle lined background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.8) 27px, rgba(255,255,255,0.8) 28px)',
              backgroundPositionY: '14px',
            }}
          />
          <textarea
            value={coachText}
            onChange={(e) => setCoachText(e.target.value)}
            onFocus={() => setCoachFocused(true)}
            onBlur={() => setCoachFocused(false)}
            placeholder="Points à travailler, objectifs, feedback sur les dernières games…"
            rows={6}
            className="relative w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none resize-none leading-7"
          />
          {/* char count */}
          <div className="absolute bottom-2 right-3 text-[10px] text-gray-700 select-none">
            {charCount > 0 && `${charCount} car.`}
          </div>
        </div>
      </Section>

      {/* ── Liens VOD ── */}
      <Section accent="#10b981">
        <SectionHeader icon={<Link size={13} />} label="Liens VOD / replays" sub="un lien par ligne" color="#10b981" />
        <textarea
          value={playerLinks}
          onChange={(e) => setPlayerLinks(e.target.value)}
          placeholder={"https://youtu.be/...\nhttps://twitch.tv/..."}
          rows={3}
          className="w-full bg-dark-card/60 border border-dark-border/50 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none font-mono transition-colors"
          style={{ boxShadow: 'none' }}
        />
        {links.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {links.map((url, i) => {
              const isYoutube = url.includes('youtu')
              const isTwitch = url.includes('twitch')
              const dotColor = isYoutube ? '#ef4444' : isTwitch ? '#a855f7' : '#10b981'
              const label = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 52)
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-card/60 border border-dark-border/40 hover:border-emerald-500/30 group transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: dotColor }} />
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors truncate flex-1 font-mono">{label}</span>
                  <ExternalLink size={11} className="shrink-0 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                </a>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Sauvegarder ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors overflow-hidden disabled:cursor-not-allowed
            ${saved
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
              : saving
                ? 'bg-accent-blue/50 border border-accent-blue/30 text-white opacity-70'
                : 'bg-accent-blue hover:bg-accent-blue/85 text-off-white border border-transparent'
            }`}
          style={!saved && !saving ? { boxShadow: '0 4px 16px rgba(59,130,246,0.25)' } : {}}
        >
          {saved ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Sauvegardé
            </>
          ) : (
            <>
              <Save size={14} className={saving ? 'animate-spin' : ''} />
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </>
          )}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400/70 animate-pulse">Notes mises à jour</span>
        )}
      </div>
    </div>
  )
}
