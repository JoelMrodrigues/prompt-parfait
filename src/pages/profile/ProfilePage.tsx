/**
 * Page Profil utilisateur — modifier display_name, voir email
 */
import { useState } from 'react'
import { UserCircle, Save, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { upsertProfile } from '../../services/supabase/profileQueries'

export const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await upsertProfile(user.id, { display_name: displayName.trim() })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto pt-8 px-4">
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
          <p className="font-semibold text-white">{profile?.display_name ?? user?.email?.split('@')[0]}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-600 mt-1">Upload de photo de profil — bientôt disponible</p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider mb-5">
          Informations
        </h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom affiché
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre pseudo"
              maxLength={32}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Affiché dans le header et les autres membres de votre équipe.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full bg-dark-bg/50 border border-dark-border/50 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              {"Modifiable depuis les Paramètres du compte."}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

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
    </div>
  )
}
