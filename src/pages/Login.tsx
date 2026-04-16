import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type View = 'login' | 'signup' | 'forgot'

export const Login = () => {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, resetPasswordForEmail } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Format email : "test" → test@test.com, "shayn" → shayn@prompt-parfait.local
      let emailToUse = email.trim()
      if (!emailToUse.includes('@')) {
        emailToUse = emailToUse === 'test' ? 'test@test.com' : `${emailToUse}@prompt-parfait.local`
      }

      const { error } = view === 'signup'
        ? await signUp(emailToUse, password)
        : await signIn(emailToUse, password)

      if (error) {
        setError((error as { message?: string }).message || 'Erreur inconnue')
      } else {
        navigate(redirectTo || '/')
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const emailToUse = email.trim()
      if (!emailToUse.includes('@')) {
        setError('Entrez une adresse email valide.')
        return
      }
      const { error } = await resetPasswordForEmail(emailToUse)
      if (error) {
        setError((error as { message?: string }).message || 'Erreur inconnue')
      } else {
        setResetSent(true)
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  // ── Vue : mot de passe oublié ──────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-dark-card border border-dark-border rounded-lg p-8">
            <button
              onClick={() => { setView('login'); setError(''); setResetSent(false) }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={15} />
              Retour à la connexion
            </button>

            <h1 className="font-display text-2xl font-bold mb-2 text-center">
              Mot de passe oublié
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              Entrez votre email et on vous envoie un lien pour réinitialiser votre mot de passe.
            </p>

            {resetSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Check size={22} className="text-emerald-400" />
                </div>
                <p className="text-sm text-gray-300">
                  Email envoyé à <span className="text-white font-medium">{email}</span>.
                  <br />Vérifiez votre boîte mail (et vos spams).
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
                    placeholder="vous@exemple.com"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Vue : connexion / inscription ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-dark-card border border-dark-border rounded-lg p-8">
          <h1 className="font-display text-3xl font-bold mb-6 text-center">
            {view === 'signup' ? 'Créer un compte' : 'Connexion'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email ou nom d'utilisateur</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
                placeholder="test ou test@test.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Mot de passe</label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError('') }}
                    className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <input
                type="password"
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? '…' : view === 'signup' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </form>

          <button
            onClick={() => { setView(view === 'signup' ? 'login' : 'signup'); setError('') }}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {view === 'signup' ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
          </button>
        </div>
      </div>
    </div>
  )
}
