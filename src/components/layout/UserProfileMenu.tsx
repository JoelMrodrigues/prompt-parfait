/**
 * Menu profil utilisateur — avatar + display_name + dropdown
 */
import { useRef, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCircle, User, Shield, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const UserProfileMenu = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) {
    return (
      <Link
        to="/login"
        className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
      >
        Connexion
      </Link>
    )
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Joueur'

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-bg/60 transition-colors"
      >
        {/* Avatar */}
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-dark-border"
          />
        ) : (
          <UserCircle size={28} className="text-gray-400" />
        )}
        <span className="text-sm text-gray-300 font-medium max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {/* Header du dropdown */}
          <div className="px-4 py-3 border-b border-dark-border">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          {/* Items */}
          <div className="py-1">
            <DropdownItem
              icon={User}
              label="Profil"
              to="/profile"
              onClick={() => setOpen(false)}
            />
            <DropdownItem
              icon={Shield}
              label="Équipes"
              to="/teams"
              onClick={() => setOpen(false)}
            />
            <DropdownItem
              icon={Settings}
              label="Paramètres"
              to="/settings"
              onClick={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-dark-border py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: React.ElementType
  label: string
  to: string
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-dark-bg/60 transition-colors"
    >
      <Icon size={15} className="text-gray-500" />
      {label}
    </Link>
  )
}
