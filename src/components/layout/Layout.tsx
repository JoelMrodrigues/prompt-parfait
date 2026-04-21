import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Header } from './Header'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react'

interface Announcement {
  id: string
  message: string
  type: 'info' | 'warn' | 'error'
  expires_at: string | null
}

const TYPE_META = {
  info:  { icon: Info,          bg: 'bg-accent-blue/10 border-accent-blue/30',  text: 'text-accent-blue',  pulse: false },
  warn:  { icon: AlertTriangle, bg: 'bg-amber-500 border-amber-600',             text: 'text-white',        pulse: true  },
  error: { icon: AlertCircle,   bg: 'bg-red-600 border-red-700',                 text: 'text-white',        pulse: true  },
}

const DISMISSED_KEY = 'dismissed_announcements'

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!supabase) return

    const fetch = () =>
      supabase.from('system_announcements')
        .select('id, message, type, expires_at')
        .eq('active', true)
        .then(({ data }) => setAnnouncements((data || []) as Announcement[]))

    fetch()

    const ch = supabase.channel('ann_banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_announcements' }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  const visible = announcements.filter(a => {
    if (dismissed.includes(a.id)) return false
    if (a.expires_at && new Date(a.expires_at) < new Date()) return false
    return true
  })

  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
  }

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col">
      {visible.map(ann => {
        const meta = TYPE_META[ann.type]
        const Icon = meta.icon
        return (
          <div
            key={ann.id}
            className={`flex items-center gap-3 px-4 py-3 border-b ${meta.bg} ${meta.pulse ? 'animate-pulse' : ''}`}
          >
            <Icon size={16} className={`${meta.text} shrink-0`} />
            <p className={`text-sm flex-1 font-semibold ${meta.text}`}>{ann.message}</p>
            <button
              onClick={() => dismiss(ann.id)}
              className={`${meta.text} opacity-70 hover:opacity-100 transition-opacity shrink-0 ml-2`}
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

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
        {!isDraftPage && <AnnouncementBanner />}
        <ErrorBoundary>
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </ErrorBoundary>
      </main>
    </div>
  )
}
