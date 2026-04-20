import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun, Shield, Users, BarChart3 } from 'lucide-react'
import { UserProfileMenu } from './UserProfileMenu'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export const Header = () => {
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()
  const { isAdmin } = useAuth()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const adminLinks = [
    { to: '/admin',       label: 'Équipes',       icon: Users },
    { to: '/admin/stats', label: 'Statistiques',  icon: BarChart3 },
  ]

  const userLinks = [
    { to: '/',      label: 'Accueil' },
    { to: '/team',  label: 'Équipe' },
    { to: '/draft', label: 'Draft' },
    { to: '/stats', label: 'Stats' },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${
      isAdmin
        ? 'bg-dark-card/90 border-red-500/20'
        : 'bg-dark-card/80 border-dark-border'
    }`}>
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to={isAdmin ? '/admin' : '/'}
          className="font-display text-2xl font-bold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent flex items-center gap-2.5"
        >
          Void.pro
          {isAdmin && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded">
              <Shield size={9} />
              Admin
            </span>
          )}
        </Link>

        <div className="flex items-center gap-8">
          {isAdmin ? (
            <ul className="flex gap-2">
              {adminLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(to)
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex gap-6">
              {userLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`relative px-3 py-2 transition-colors ${
                      isActive(to) ? 'text-accent-blue' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                    {isActive(to) && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border border-dark-border bg-dark-bg flex items-center justify-center text-gray-400 hover:text-white hover:border-accent-blue/40 transition-all"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            <motion.div
              key={isDark ? 'dark' : 'light'}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.div>
          </button>

          <UserProfileMenu />
        </div>
      </nav>
    </header>
  )
}
