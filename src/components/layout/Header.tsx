import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Shield, Users, BarChart3, Megaphone, Key, Menu, X, User, Settings, LogOut, UserCircle } from 'lucide-react'
import { UserProfileMenu } from './UserProfileMenu'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { isAdmin, user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    setMenuOpen(false)
    navigate('/')
    signOut().catch(() => {}).finally(() => setSigningOut(false))
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Joueur'

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const adminLinks = [
    { to: '/admin',                label: 'Équipes',   icon: Users },
    { to: '/admin/features',       label: 'Features',  icon: Shield },
    { to: '/admin/stats',          label: 'Stats',     icon: BarChart3 },
    { to: '/admin/announcements',  label: 'Annonces',  icon: Megaphone },
    { to: '/admin/riot-keys',      label: 'Clés Riot', icon: Key },
  ]

  const userLinks = [
    { to: '/',      label: 'Accueil' },
    { to: '/team',  label: 'Équipe' },
    { to: '/draft', label: 'Draft' },
    { to: '/stats', label: 'Stats' },
  ]

  const themeButton = (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg border border-dark-border bg-dark-bg flex items-center justify-center text-gray-400 hover:text-white hover:border-accent-blue/40 transition-all shrink-0"
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
  )

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${
      isAdmin
        ? 'bg-dark-card/90 border-red-500/20'
        : 'bg-dark-card/80 border-dark-border'
    }`}>
      <nav className="container mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to={isAdmin ? '/admin' : '/'}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="flex items-center gap-3">
            <img src="/resources/images/logo.svg" alt="Logo" className="h-[55px] w-auto" />
            <div className="flex items-center leading-none">
              <span className="font-logo text-[24px] tracking-[0.18em] font-normal text-white uppercase">VOID</span>
              <span className="font-logo text-[16px] tracking-[0.12em] font-normal text-accent-blue">.pro</span>
            </div>
          </div>
          {isAdmin && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded">
              <Shield size={9} />
              Admin
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {isAdmin ? (
            <ul className="flex gap-1 lg:gap-2">
              {adminLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(to)
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden lg:inline">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex gap-4 lg:gap-6">
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
          {themeButton}
          <UserProfileMenu />
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {themeButton}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 rounded-lg border border-dark-border bg-dark-bg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-dark-border overflow-hidden bg-dark-card/95 backdrop-blur-md"
          >
            <div className="px-4 py-4 space-y-1">
              {(isAdmin ? adminLinks.map(l => ({ to: l.to, label: l.label })) : userLinks).map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(to)
                      ? isAdmin ? 'bg-red-500/10 text-red-400' : 'bg-accent-blue/10 text-accent-blue'
                      : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {/* Profil inline — pas de dropdown pour éviter le clipping overflow-hidden */}
              <div className="pt-2 border-t border-dark-border/60 space-y-0.5">
                {user && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-1">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-dark-border shrink-0" />
                    ) : (
                      <UserCircle size={28} className="text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                )}
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-dark-bg/60 transition-colors">
                  <User size={15} className="text-gray-500 shrink-0" /> Profil
                </Link>
                <Link to="/teams" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-dark-bg/60 transition-colors">
                  <Shield size={15} className="text-gray-500 shrink-0" /> Équipes
                </Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-dark-bg/60 transition-colors">
                  <Settings size={15} className="text-gray-500 shrink-0" /> Paramètres
                </Link>
                <button onClick={handleSignOut} disabled={signingOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  <LogOut size={15} className="shrink-0" />
                  {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
