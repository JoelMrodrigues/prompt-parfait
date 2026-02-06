/**
 * Layout principal de la page Team
 * Contient Sidebar + Header + Content area
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { TeamSidebar } from './TeamSidebar'
import { TeamHeader } from './TeamHeader'
import { useTeam } from '../../hooks/useTeam'

export const TeamLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { team, loading } = useTeam()

  // Si pas d'équipe, rediriger vers overview pour en créer une
  if (!loading && !team && location.pathname !== '/team/overview') {
    navigate('/team/overview', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <TeamSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <TeamHeader team={team} />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
