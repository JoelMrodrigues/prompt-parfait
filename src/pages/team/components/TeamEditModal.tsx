/**
 * Modal d'édition de l'équipe — Nom · Logo · Couleur accent
 * Autonome : utilise useTeam() et useToast() directement.
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Camera, Loader2, Trash2, Swords, Trophy, Users, Gamepad2 } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../../../contexts/ToastContext'
import { supabase } from '../../../lib/supabase'

// ── Color extraction (canvas, no external lib) ──────────────────────────────

async function extractDominantColor(imgUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 50
        canvas.height = 50
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, 50, 50)
        const data = ctx.getImageData(0, 0, 50, 50).data
        const colorMap: Record<string, number> = {}
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 100) continue
          if (r > 210 && g > 210 && b > 210) continue
          if (r < 30 && g < 30 && b < 30) continue
          const rb = Math.round(r / 32) * 32
          const gb = Math.round(g / 32) * 32
          const bb = Math.round(b / 32) * 32
          if (Math.max(rb, gb, bb) - Math.min(rb, gb, bb) < 30) continue
          const key = `${rb} ${gb} ${bb}`
          colorMap[key] = (colorMap[key] || 0) + 1
        }
        const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1])
        resolve(sorted.length ? sorted[0][0] : null)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imgUrl
  })
}

function applyAccentColor(rgbStr: string) {
  document.documentElement.style.setProperty('--color-accent', rgbStr)
}

// ── Team types ───────────────────────────────────────────────────────────────

const TEAM_TYPES = [
  { id: 'scrim', label: 'Scrim', icon: Swords, color: 'text-accent-blue', border: 'border-accent-blue/40', selBorder: 'border-accent-blue', selBg: 'bg-accent-blue/15' },
  { id: 'soloq', label: 'Solo Q', icon: Trophy, color: 'text-amber-400', border: 'border-amber-500/30', selBorder: 'border-amber-400', selBg: 'bg-amber-500/15' },
  { id: 'flex', label: 'Flex', icon: Users, color: 'text-emerald-400', border: 'border-emerald-500/30', selBorder: 'border-emerald-400', selBg: 'bg-emerald-500/15' },
  { id: 'fun', label: 'Fun', icon: Gamepad2, color: 'text-pink-400', border: 'border-pink-500/30', selBorder: 'border-pink-400', selBg: 'bg-pink-500/15' },
] as const

// ── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: 'Bleu', rgb: '99 102 241' },
  { label: 'Violet', rgb: '139 92 246' },
  { label: 'Cyan', rgb: '6 182 212' },
  { label: 'Vert', rgb: '16 185 129' },
  { label: 'Orange', rgb: '249 115 22' },
  { label: 'Rose', rgb: '236 72 153' },
]

// ── Component ────────────────────────────────────────────────────────────────

export function TeamEditModal({ onClose }: { onClose: () => void }) {
  const { team, updateTeam, deleteTeam, isTeamOwner } = useTeam()
  const { error: toastError, success: toastSuccess } = useToast()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [teamName, setTeamName] = useState(team?.team_name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [suggestedColor, setSuggestedColor] = useState<string | null>(null)
  const [colorApplying, setColorApplying] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [typeSaving, setTypeSaving] = useState(false)

  useEffect(() => {
    setTeamName(team?.team_name || '')
  }, [team?.team_name])

  const handleSaveName = async () => {
    if (!team?.id || !teamName.trim() || nameSaving) return
    setNameSaving(true)
    try {
      await updateTeam(team.id, { team_name: teamName.trim() })
      toastSuccess('Nom mis à jour !')
    } catch (e: any) {
      toastError(`Erreur : ${e.message}`)
    } finally {
      setNameSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!team?.id || !supabase) return
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${team.id}/logo.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(path, arrayBuffer, { upsert: true, contentType: file.type })
      if (uploadError) {
        toastError(`Erreur upload : ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(path)
      await updateTeam(team.id, { logo_url: urlData.publicUrl })
      toastSuccess('Logo mis à jour !')
      const color = await extractDominantColor(urlData.publicUrl)
      if (color) setSuggestedColor(color)
    } catch (e: any) {
      toastError(`Erreur : ${e.message}`)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleApplyColor = async (rgbStr: string) => {
    if (!team?.id) return
    setColorApplying(true)
    applyAccentColor(rgbStr)
    try {
      await updateTeam(team.id, { accent_color: rgbStr })
      toastSuccess('Couleur appliquée !')
      setSuggestedColor(null)
    } catch {
      toastError("Couleur appliquée localement mais non sauvegardée (colonne accent_color manquante).")
    } finally {
      setColorApplying(false)
    }
  }

  const handleSaveType = async (typeId: string) => {
    if (!team?.id || typeSaving || team.team_type === typeId) return
    setTypeSaving(true)
    try {
      await updateTeam(team.id, { team_type: typeId })
      toastSuccess('Type mis à jour !')
    } catch (e: any) {
      toastError(`Erreur : ${e.message}`)
    } finally {
      setTypeSaving(false)
    }
  }

  if (!team) return null

  const modal = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="font-display text-lg font-bold text-white">Paramètres de l'équipe</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Logo */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Logo</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={!isTeamOwner || logoUploading}
                onClick={() => logoInputRef.current?.click()}
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${
                  team.logo_url ? 'border-dark-border bg-white' : 'border-dashed border-dark-border bg-dark-bg/80'
                } ${isTeamOwner ? 'cursor-pointer hover:border-accent-blue/60' : 'cursor-default'}`}
              >
                {logoUploading ? (
                  <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
                ) : team.logo_url ? (
                  <img src={team.logo_url} alt={team.team_name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-500" />
                )}
              </button>
              <div className="flex-1">
                <button
                  type="button"
                  disabled={!isTeamOwner || logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-accent-blue/50 transition-colors disabled:opacity-50"
                >
                  {logoUploading ? 'Upload en cours…' : 'Changer le logo'}
                </button>
                <p className="text-xs text-gray-600 mt-1">PNG, JPG ou SVG recommandé</p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
            />
            {/* Suggested color */}
            {suggestedColor && (
              <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-dark-bg border border-dark-border">
                <div
                  className="w-5 h-5 rounded shrink-0 border border-white/20"
                  style={{ backgroundColor: `rgb(${suggestedColor})` }}
                />
                <span className="text-xs text-gray-400 flex-1">Couleur détectée du logo</span>
                <button
                  type="button"
                  onClick={() => handleApplyColor(suggestedColor)}
                  disabled={colorApplying}
                  className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium disabled:opacity-50"
                >
                  {colorApplying ? '…' : 'Appliquer'}
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestedColor(null)}
                  className="text-gray-600 hover:text-gray-400"
                  aria-label="Rejeter la couleur suggérée"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Nom */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Nom de l'équipe</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                disabled={!isTeamOwner}
                maxLength={50}
                className="flex-1 px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={!isTeamOwner || nameSaving || !teamName.trim() || teamName.trim() === team.team_name}
                className="px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-40"
              >
                {nameSaving ? '…' : 'OK'}
              </button>
            </div>
          </div>

          {/* Type d'équipe */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Type d'équipe</p>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_TYPES.map((t) => {
                const Icon = t.icon
                const selected = (team.team_type || 'scrim') === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isTeamOwner || typeSaving}
                    onClick={() => handleSaveType(t.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all disabled:opacity-50 ${
                      selected
                        ? `${t.selBg} ${t.selBorder}`
                        : `bg-dark-bg/60 ${t.border} hover:border-gray-500`
                    }`}
                  >
                    <Icon size={16} className={t.color} />
                    <span className={`text-[11px] font-semibold ${selected ? t.color : 'text-gray-400'}`}>
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Couleur accent */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Couleur du thème</p>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.rgb}
                  type="button"
                  onClick={() => handleApplyColor(preset.rgb)}
                  disabled={colorApplying || !isTeamOwner}
                  title={preset.label}
                  className="group relative w-full aspect-square rounded-lg border-2 border-transparent hover:border-white/30 transition-all disabled:opacity-50 overflow-hidden"
                  style={{ backgroundColor: `rgb(${preset.rgb})` }}
                >
                  {team.accent_color === preset.rgb && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Sélectionne la couleur d'accentuation du site pour cette équipe.
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 space-y-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            Fermer
          </button>

          {isTeamOwner && (
            <div className="border-t border-dark-border pt-3">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-red-500/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                  Supprimer l'équipe
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
                  <p className="text-xs text-red-400 text-center font-medium">
                    Supprimer <span className="font-bold">{team.team_name}</span> ? Cette action est irréversible.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-lg text-xs text-gray-400 hover:text-white bg-dark-bg border border-dark-border transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true)
                        try {
                          await deleteTeam(team.id)
                          onClose()
                        } catch (e: any) {
                          toastError(`Erreur : ${e.message}`)
                          setDeleting(false)
                          setDeleteConfirm(false)
                        }
                      }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Suppression…' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}
