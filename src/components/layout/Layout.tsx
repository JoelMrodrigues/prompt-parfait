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
  info:  { icon: Info,          bg: 'bg-accent-blue/10 border-accent-blue/30',  text: 'text-accent-blue' },
  warn:  { icon: AlertTriangle, bg: 'bg-amber-500/10 border-amber-500/30',       text: 'text-amber-400' },
  error: { icon: AlertCircle,   bg: 'bg-red-500/10 border-red-500/30',           text: 'text-red-400' },
}

const DISMISSED_KEY = 'dismissed_announcements'

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!supabase) return
    supabase.from('system_announcements')
      .select('id, message, type, expires_at')
      .eq('active', true)
      .then(({ data }) => setAnnouncements((data || []) as Announcement[]))
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
          <div key={ann.id} className={`flex items-center gap-3 px-4 py-2.5 border-b ${meta.bg}`}>
            {/* Dot pulsant */}
            <span className="relative shrink-0 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.text.replace('text-', 'bg-')}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${meta.text.replace('text-', 'bg-')}`} />
            </span>
            <Icon size={14} className={`${meta.text} shrink-0`} />
            <p className={`text-sm flex-1 font-medium ${meta.text}`}>{ann.message}</p>
            <button onClick={() => dismiss(ann.id)} className="text-gray-500 hover:text-white transition-colors shrink-0 ml-2">
              <X size={14} />
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
