/**
 * Page de mise à jour du mot de passe — cible du lien Supabase reset-password
 * Supabase injecte la session via le hash de l'URL, on peut ensuite appeler updateUser
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const UpdatePasswordPage = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase émet un événnement PASSWORD_RECOVERY quand le token hash est valide
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    // Si déjà une session active (rechargement de page), on considère prêt
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const strength = (() => {
    if (password.length === 0) return null
    if (password.length < 6) return 'weak'
    if (password.length < 10 || !/[0-9]/.test(password)) return 'medium'
    return 'strong'
  })()

  const strengthLabel = { weak: 'Faible', medium: 'Moyen', strong: 'Fort' }
  const strengthColor = { weak: 'bg-red-500', medium: 'bg-amber-400', strong: 'bg-emerald-400' }
  const strengthWidth = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' }
  const strengthText = { weak: 'text-red-400', medium: 'text-amber-400', strong: 'text-emerald-400' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-dark-card border border-dark-border rounded-xl px-5 py-2.5">
            <div className="w-6 h-6 rounded-lg bg-accent-blue/80" />
            <span className="font-display text-lg font-bold text-white">
              Void<span className="text-accent-blue">.pro</span>
            </span>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          {/* Bande accent */}
          <div className="h-1 bg-gradient-to-r from-accent-blue via-purple-500 to-purple-400" />

          <div className="p-8">
            {success ? (
              /* ── État succès ── */
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Check size={28} className="text-emerald-400" />
                </div>
                <h1 className="font-display text-2xl font-bold text-white mb-2">Mot de passe mis à jour</h1>
                <p className="text-gray-400 text-sm">Vous allez être redirigé vers l'accueil…</p>
              </div>
            ) : (
              <>
                {/* Icône */}
                <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-accent-blue/10 border border-accent-blue/25 flex items-center justify-center">
                  <KeyRound size={26} className="text-accent-blue" />
                </div>

                <h1 className="font-display text-2xl font-bold text-white text-center mb-2">
                  Nouveau mot de passe
                </h1>
                <p className="text-gray-400 text-sm text-center mb-8">
                  Choisissez un mot de passe sécurisé pour votre compte.
                </p>

                {!sessionReady && (
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-6">
                    <Loader2 size={16} className="animate-spin" />
                    Vérification du lien…
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 caractères"
                        disabled={!sessionReady || loading}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 pr-11 text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Jauge de force */}
                    {strength && (
                      <div className="mt-2.5">
                        <div className="h-1 bg-dark-bg rounded-full overflow-hidden mb-1">
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthColor[strength]} ${strengthWidth[strength]}`} />
                        </div>
                        <p className={`text-xs ${strengthText[strength]}`}>
                          Force : {strengthLabel[strength]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirmation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Retapez votre mot de passe"
                        disabled={!sessionReady || loading}
                        className={`w-full bg-dark-bg border rounded-xl px-4 py-2.5 pr-11 text-white placeholder-gray-600 focus:outline-none disabled:opacity-50 transition-colors ${
                          confirm && confirm !== password
                            ? 'border-red-500/50 focus:border-red-500/70'
                            : confirm && confirm === password
                            ? 'border-emerald-500/40 focus:border-emerald-500/60'
                            : 'border-dark-border focus:border-accent-blue/60'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirm && confirm !== password && (
                      <p className="text-xs text-red-400 mt-1.5">Les mots de passe ne correspondent pas.</p>
                    )}
                    {confirm && confirm === password && (
                      <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                        <Check size={11} /> Correspond
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                      <AlertCircle size={15} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !sessionReady || !password || !confirm}
                    className="w-full py-3 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
