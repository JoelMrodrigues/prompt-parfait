/**
 * Layout principal de la page Team
 * Contient Sidebar + Header + Content area.
 * Lance la remontée auto (rang + games + top 5) quand le site est ouvert.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Menu } from 'lucide-react'
import { TeamSidebar } from './TeamSidebar'
import { useTeam } from './hooks/useTeam'
import { useTeamAutoSync } from './hooks/useTeamAutoSync'
import { useSoloqMoodSync } from './hooks/useSoloqMoodSync'
import { useTeamMoodSync } from './hooks/useTeamMoodSync'
import { useTeamMatches } from './hooks/useTeamMatches'
import { useTeamBlocks } from './hooks/useTeamBlocks'
import { ErrorBoundary } from '../../components/common/ErrorBoundary'
import { loadItems } from '../../lib/items'
import { LayoutProvider, useLayout } from '../../contexts/LayoutContext'

function TeamLayoutInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { team, loading } = useTeam()
  const { setSidebarOpen } = useLayout()

  useTeamAutoSync()
  useSoloqMoodSync()
  useTeamMoodSync()
  useTeamMatches(team?.id)
  useTeamBlocks(team?.id)

  useEffect(() => { loadItems() }, [])

  useEffect(() => {
    const color = team?.accent_color
    if (color) document.documentElement.style.setProperty('--color-accent', color)
  }, [team?.accent_color])

  const isJoinPage = location.pathname.startsWith('/team/join/')
  useEffect(() => {
    if (!loading && !team && !isJoinPage && location.pathname !== '/team/overview') {
      navigate('/team/overview', { replace: true })
    }
  }, [loading, team, isJoinPage, location.pathname, navigate])

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
    <div className="h-screen bg-dark-bg flex overflow-hidden">
      <TeamSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sub-header : hamburger + nom équipe */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-dark-card border-b border-dark-border shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg/60 transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-white truncate">{team?.team_name ?? '...'}</span>
        </div>

        <main className="flex-1 overflow-auto p-3 md:p-6">
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

export const TeamLayout = () => (
  <LayoutProvider>
    <TeamLayoutInner />
  </LayoutProvider>
)
