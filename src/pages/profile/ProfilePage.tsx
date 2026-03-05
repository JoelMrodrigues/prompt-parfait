/**
 * Page Profil utilisateur — infos, sécurité, danger zone
 */
import { useState, useEffect, useRef } from 'react'
import { UserCircle, Save, Check, Mail, KeyRound, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { upsertProfile } from '../../services/supabase/profileQueries'
import { supabase } from '../../lib/supabase'

export const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth()

  // Infos
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // Sécurité
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      await upsertProfile(user.id, { display_name: displayName.trim() })
      await refreshProfile()
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email || !supabase) return
    setResetLoading(true)
    setResetError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err: any) {
      setResetError(err.message || "Erreur lors de l'envoi")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pt-8 px-4 pb-12">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-1">Profil</h2>
        <p className="text-gray-400">Gérez les informations de votre compte</p>
      </div>

      {/* Avatar */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6 flex items-center gap-5">
        <div className="relative">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              className="w-16 h-16 rounded-full object-cover border-2 border-dark-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-dark-bg border-2 border-dark-border flex items-center justify-center">
              <UserCircle size={40} className="text-gray-500" />
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-white">
            {profile?.display_name ?? user?.email?.split('@')[0]}
          </p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-600 mt-1">Upload de photo de profil — bientôt disponible</p>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider mb-5">
          Informations
        </h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom affiché</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre pseudo"
              maxLength={32}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Affiché dans le header et visible par les membres de votre équipe.
            </p>
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/90 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {saved ? (
              <>
                <Check size={16} />
                Sauvegardé
              </>
            ) : (
              <>
                <Save size={16} />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sécurité */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider mb-5">
          Sécurité
        </h3>

        {/* Email */}
        <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border mb-3">
          <div className="p-2 bg-accent-blue/15 rounded-lg">
            <Mail size={17} className="text-accent-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">Adresse email</p>
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border">
          <div className="p-2 bg-dark-card rounded-lg">
            <KeyRound size={17} className="text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Mot de passe</p>
            <p className="text-sm text-gray-400">Recevez un lien de réinitialisation par email</p>
          </div>
          <button
            onClick={handleResetPassword}
            disabled={resetLoading || resetSent}
            className="shrink-0 px-3 py-2 text-xs font-medium border border-dark-border rounded-lg hover:border-accent-blue hover:text-white text-gray-400 transition-colors disabled:opacity-50"
          >
            {resetSent ? 'Email envoyé' : resetLoading ? 'Envoi...' : 'Réinitialiser'}
          </button>
        </div>

        {resetSent && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
            <Check size={14} />
            Email envoyé à {user?.email}. Vérifiez votre boîte mail.
          </div>
        )}
        {resetError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={14} />
            {resetError}
          </div>
        )}
      </div>

      {/* Zone danger */}
      <div className="bg-dark-card border border-red-500/20 rounded-xl p-6">
        <h3 className="font-semibold text-sm text-red-400/70 uppercase tracking-wider mb-4">
          Zone danger
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">Supprimer le compte</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {"Suppression définitive de toutes vos données. Contactez le support."}
            </p>
          </div>
          <button
            disabled
            className="px-3 py-2 text-xs font-medium border border-red-500/30 rounded-lg text-red-500/50 cursor-not-allowed"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
