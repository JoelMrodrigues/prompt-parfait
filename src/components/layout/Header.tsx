import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserProfileMenu } from './UserProfileMenu'

export const Header = () => {
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/team', label: 'Équipe' },
    { to: '/draft', label: 'Draft' },
  ]

  const isActive = (path) => location.pathname === path

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

          <UserProfileMenu />
        </div>
      </nav>
    </header>
  )
}
