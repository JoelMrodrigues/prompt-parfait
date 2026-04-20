import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Header } from './Header'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { useAuth } from '../../contexts/AuthContext'

export const Layout = () => {
  const location = useLocation()
  const { isAdmin, loading } = useAuth()
  const isDraftPage = location.pathname === '/draft'

  const adminTeamView = sessionStorage.getItem('adminTeamView') === 'true'
if (!loading && isAdmin && !location.pathname.startsWith('/admin') && !adminTeamView) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {!isDraftPage && <Header />}
      <main className={!isDraftPage ? 'pt-20' : ''}>
        <ErrorBoundary>
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
    </div>
  )
}
