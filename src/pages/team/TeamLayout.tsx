/**
 * Layout principal de la page Team
 * Contient Sidebar + Header + Content area.
 * Lance la remontée auto (rang + games + top 5) quand le site est ouvert.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { TeamSidebar } from './TeamSidebar'
import { useTeam } from './hooks/useTeam'
import { useTeamAutoSync } from './hooks/useTeamAutoSync'
import { useSoloqMoodSync } from './hooks/useSoloqMoodSync'
import { useTeamMoodSync } from './hooks/useTeamMoodSync'
import { useTeamMatches } from './hooks/useTeamMatches'
import { ErrorBoundary } from '../../components/common/ErrorBoundary'

export const TeamLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { team, loading } = useTeam()
  useTeamAutoSync()
  useSoloqMoodSync()
  useTeamMoodSync()
  // Pré-fetch en arrière-plan dès l'entrée dans la section équipe.
  // Le cache module-level garantit que MatchsPage, PlayerDetailPage, etc.
  // reçoivent les données instantanément sans re-fetcher.
  useTeamMatches(team?.id)

  // Apply saved team accent color globally
  useEffect(() => {
    const color = team?.accent_color
    if (color) document.documentElement.style.setProperty('--color-accent', color)
  }, [team?.accent_color])

  // Si pas d'équipe, rediriger vers overview (sauf page d'invitation)
  const isJoinPage = location.pathname.startsWith('/team/join/')
  useEffect(() => {
    if (!loading && !team && !isJoinPage && location.pathname !== '/team/overview') {
      navigate('/team/overview', { replace: true })
    }
  }, [loading, team, isJoinPage, location.pathname, navigate])

  // Page d'invitation : layout minimal sans sidebar
  if (location.pathname.startsWith('/team/join/')) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <main className="min-h-screen flex items-center justify-center p-6">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <TeamSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <div key={location.pathname} className="animate-page-in">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
