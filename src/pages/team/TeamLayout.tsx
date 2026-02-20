/**
 * Layout principal de la page Team
 * Contient Sidebar + Header + Content area.
 * Lance la remontée auto (rang + games + top 5) quand le site est ouvert.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { TeamSidebar } from './TeamSidebar'
import { useTeam } from './hooks/useTeam'
import { useTeamAutoSync } from './hooks/useTeamAutoSync'

export const TeamLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { team, loading } = useTeam()
  useTeamAutoSync()

  // Si pas d'équipe, rediriger vers overview (sauf page d'invitation)
  const isJoinPage = location.pathname.startsWith('/team/join/')
  if (!loading && !team && !isJoinPage && location.pathname !== '/team/overview') {
    navigate('/team/overview', { replace: true })
  }

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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
