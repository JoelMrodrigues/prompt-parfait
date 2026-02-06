import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'

export const Layout = () => {
  const location = useLocation()
  const isDraftPage = location.pathname === '/draft'

  return (
    <div className="min-h-screen bg-dark-bg">
      {!isDraftPage && <Header />}
      <main className={!isDraftPage ? 'pt-20' : ''}>
        <Outlet />
      </main>
    </div>
  )
}
