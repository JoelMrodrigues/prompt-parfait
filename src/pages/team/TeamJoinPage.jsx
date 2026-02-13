/**
 * Page d'invitation : rejoindre une équipe via le lien partagé
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../hooks/useTeam'

export const TeamJoinPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { joinTeamByToken } = useTeam()
  const [status, setStatus] = useState('idle') // idle | joining | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Lien d\'invitation invalide')
    }
  }, [token])

  const handleJoin = async () => {
    if (!user || !token) return
    setStatus('joining')
    setMessage('')
    const result = await joinTeamByToken(token)
    if (result.success) {
      setStatus('success')
      setMessage(`Vous avez rejoint l'équipe ${result.teamName} !`)
      setTimeout(() => navigate('/team/overview'), 1500)
    } else {
      setStatus('error')
      setMessage(result.error || 'Une erreur est survenue')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center">
          <p className="text-red-400 mb-4">Lien d'invitation invalide ou manquant.</p>
          <button
            onClick={() => navigate('/team')}
            className="text-accent-blue hover:underline"
          >
            Retour à l'équipe
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-blue/20 flex items-center justify-center">
            <UserPlus className="text-accent-blue" size={32} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white mb-2">
              Rejoindre une équipe
            </h2>
            <p className="text-gray-400 text-sm">
              Connectez-vous pour accepter l'invitation et accéder aux données de l'équipe.
            </p>
          </div>
          <button
            onClick={() => navigate(`/login?redirect=/team/join/${token}`)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            <LogIn size={20} />
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent-blue/20 flex items-center justify-center">
          <UserPlus className="text-accent-blue" size={32} />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white mb-2">
            Rejoindre l'équipe
          </h2>
          <p className="text-gray-400 text-sm">
            Vous avez été invité à rejoindre une équipe. Cliquez ci-dessous pour accéder aux joueurs, matchs et statistiques.
          </p>
        </div>
        {status === 'success' && (
          <p className="text-green-400 text-sm">{message}</p>
        )}
        {status === 'error' && (
          <p className="text-red-400 text-sm">{message}</p>
        )}
        {status !== 'success' && (
          <button
            onClick={handleJoin}
            disabled={status === 'joining'}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'joining' ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                En cours…
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Rejoindre l'équipe
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
