import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { UserProfileMenu } from './UserProfileMenu'
import { useTheme } from '../../contexts/ThemeContext'

export const Header = () => {
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/team', label: 'Équipe' },
    { to: '/draft', label: 'Draft' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-card/80 backdrop-blur-md border-b border-dark-border">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="font-display text-2xl font-bold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent"
        >
          Void.pro
        </Link>

        <div className="flex items-center gap-8">
          <ul className="flex gap-6">
            {navLinks.map(({ to, label }) => (
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

          <Link
            to="/stats"
            className={`relative px-3 py-2 transition-colors ${
              isActive('/stats') ? 'text-accent-blue' : 'text-gray-400 hover:text-white'
            }`}
          >
            Stats
            {isActive('/stats') && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>

          {/* Toggle dark / light */}
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
