import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Activity, ArrowLeft } from 'lucide-react'

const SIDEBAR_ITEMS = [
  { path: '/admin/stats',       label: 'Accueil',       icon: LayoutDashboard, end: true },
  { path: '/admin/stats/users', label: 'Utilisateurs',  icon: Users },
  { path: '/admin/stats/usage', label: 'Utilisation',   icon: Activity },
]

export const AdminStatsLayout = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-red-500/10 bg-dark-card/40 flex flex-col py-4 px-2">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-3 py-2 mb-4 text-xs text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
        >
          <ArrowLeft size={13} />
          Retour aux équipes
        </button>

        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-700">
          Statistiques
        </p>

        <nav className="space-y-0.5">
          {SIDEBAR_ITEMS.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                }`
              }
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
