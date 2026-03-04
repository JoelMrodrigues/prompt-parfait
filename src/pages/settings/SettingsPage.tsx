/**
 * Page Paramètres — compte utilisateur
 */
import { useState } from 'react'
import { Mail, KeyRound, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export const SettingsPage = () => {
  const { user } = useAuth()
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

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
      setResetError(err.message || 'Erreur lors de l\'envoi')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pt-8 px-4">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-1">Paramètres</h2>
        <p className="text-gray-400">Gérez la sécurité de votre compte</p>
      </div>

      {/* Section compte */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider mb-5">
          Compte
        </h3>

        {/* Email */}
        <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border mb-4">
          <div className="p-2 bg-accent-blue/15 rounded-lg">
            <Mail size={18} className="text-accent-blue" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Adresse email</p>
            <p className="text-sm font-medium text-white">{user?.email}</p>
          </div>
        </div>

        {/* Reset password */}
        <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border">
          <div className="p-2 bg-dark-card rounded-lg">
            <KeyRound size={18} className="text-gray-500" />
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
