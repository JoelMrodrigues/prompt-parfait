import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus, Camera, Swords, Users, Trophy, Gamepad2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Team } from '../../../contexts/TeamContext'

export const TEAM_TYPES = [
  { id: 'scrim',  label: 'Scrims',  icon: Swords,   color: 'text-accent-blue', selBorder: 'border-accent-blue', selBg: 'bg-accent-blue/15' },
  { id: 'flex',   label: 'Flex',    icon: Users,    color: 'text-emerald-400', selBorder: 'border-emerald-400', selBg: 'bg-emerald-500/15' },
  { id: 'soloq',  label: 'Solo Q',  icon: Trophy,   color: 'text-amber-400',   selBorder: 'border-amber-400',   selBg: 'bg-amber-500/15' },
  { id: 'fun',    label: 'Fun',     icon: Gamepad2, color: 'text-pink-400',    selBorder: 'border-pink-400',    selBg: 'bg-pink-500/15' },
] as const

export function CreateTeamModal({
  onClose,
  onCreate,
  onUpdateTeam,
}: {
  onClose: () => void
  onCreate: (name: string, type: string) => Promise<Team>
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<Team>
}) {
  const logoInputRef                  = useRef<HTMLInputElement>(null)
  const [name, setName]               = useState('')
  const [teamType, setTeamType]       = useState<string>('scrim')
  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const newTeam = await onCreate(name.trim(), teamType)

      if (logoFile && supabase) {
        const ext  = logoFile.name.split('.').pop() || 'jpg'
        const path = `${newTeam.id}/logo.${ext}`
        const buf  = await logoFile.arrayBuffer()
        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(path, buf, { upsert: true, contentType: logoFile.type })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(path)
          await onUpdateTeam(newTeam.id, { logo_url: urlData.publicUrl })
        }
      }

      onClose()
    } catch (err) {
      setError('Erreur lors de la création.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-sm">

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Nouvelle équipe</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors hover:border-accent-blue/60 ${
                logoPreview ? 'border-dark-border bg-white' : 'border-dark-border bg-dark-bg'
              }`}
            >
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                : <Camera size={20} className="text-gray-500" />
              }
            </button>
            <p className="text-xs text-gray-500">Logo (optionnel)</p>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          {/* Nom */}
          <input
            autoFocus
            type="text"
            placeholder="Nom de l'équipe"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />

          {/* Type */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Type d'équipe</p>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_TYPES.map(({ id, label, icon: Icon, color, selBorder, selBg }) => {
                const selected = teamType === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTeamType(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      selected
                        ? `${selBorder} ${selBg} ${color} font-medium`
                        : 'border-dark-border text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium disabled:opacity-50 hover:bg-accent-blue/90 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Créer
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
