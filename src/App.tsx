import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { TeamProvider } from './contexts/TeamContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { ToastContainer } from './components/common/Toast'
import { isSupabaseConfigured } from './lib/supabase'

// Pages chargées immédiatement (critiques — premier rendu)
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { TeamLayout } from './pages/team/TeamLayout'
import { TeamOverviewPage } from './pages/team/overview/TeamOverviewPage'
import { TeamJoinPage } from './pages/team/TeamJoinPage'

// Pages team chargées à la demande (lazy) — réduisent le bundle initial
const Draft = lazy(() => import('./pages/draft/DraftPage').then(m => ({ default: m.Draft })))
const JoueursPage = lazy(() => import('./pages/team/joueurs/JoueursPage').then(m => ({ default: m.JoueursPage })))
const PlayerDetailPage = lazy(() => import('./pages/team/joueurs/PlayerDetailPage').then(m => ({ default: m.PlayerDetailPage })))
const SoloqMatchDetailPage = lazy(() => import('./pages/team/joueurs/SoloqMatchDetailPage').then(m => ({ default: m.SoloqMatchDetailPage })))
const ChampionPoolPage = lazy(() => import('./pages/team/champion-pool/ChampionPoolPage').then(m => ({ default: m.ChampionPoolPage })))
const MatchsPage = lazy(() => import('./pages/team/matchs/MatchsPage').then(m => ({ default: m.MatchsPage })))
const MatchDetailPage = lazy(() => import('./pages/team/matchs/MatchDetailPage').then(m => ({ default: m.MatchDetailPage })))
const TeamStatsPage = lazy(() => import('./pages/team/stats/TeamStatsPage').then(m => ({ default: m.TeamStatsPage })))
const DraftsPage = lazy(() => import('./pages/team/drafts/DraftsPage').then(m => ({ default: m.DraftsPage })))
const CoachingPage = lazy(() => import('./pages/team/coaching/CoachingPage').then(m => ({ default: m.CoachingPage })))
const ImportPage = lazy(() => import('./pages/team/import/ImportPage').then(m => ({ default: m.ImportPage })))
const TestPage = lazy(() => import('./pages/team/test/TestPage').then(m => ({ default: m.TestPage })))
const PlanningPage = lazy(() => import('./pages/team/planning/PlanningPage').then(m => ({ default: m.PlanningPage })))

// Pages annexes (lazy)
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const TeamsPage = lazy(() => import('./pages/teams/TeamsPage').then(m => ({ default: m.TeamsPage })))
const Stats = lazy(() => import('./pages/Stats').then(m => ({ default: m.Stats })))
const ProChampions = lazy(() => import('./pages/stats/ProChampions').then(m => ({ default: m.ProChampions })))
const ChampionDetail = lazy(() => import('./pages/stats/ChampionDetail').then(m => ({ default: m.ChampionDetail })))
const MatchDetail = lazy(() => import('./pages/stats/MatchDetail').then(m => ({ default: m.MatchDetail })))
const ProTeams = lazy(() => import('./pages/stats/ProTeams').then(m => ({ default: m.ProTeams })))
const ProPlayers = lazy(() => import('./pages/stats/ProPlayers').then(m => ({ default: m.ProPlayers })))
const ProTournaments = lazy(() => import('./pages/stats/ProTournaments').then(m => ({ default: m.ProTournaments })))

// Fallback minimal pendant le chargement lazy
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
    </div>
  )
}

function AppRoutes() {
  const { toasts, removeToast } = useToast()

  const DraftRoute = isSupabaseConfigured ? (
    <ProtectedRoute><Draft /></ProtectedRoute>
  ) : (
    <Draft />
  )

  const TeamRoute = isSupabaseConfigured ? (
    <ProtectedRoute><TeamLayout /></ProtectedRoute>
  ) : (
    <TeamLayout />
  )

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="draft" element={DraftRoute} />
          <Route path="team" element={TeamRoute}>
            <Route index element={<TeamOverviewPage />} />
            <Route path="overview" element={<TeamOverviewPage />} />
            <Route path="join/:token" element={<TeamJoinPage />} />
            <Route path="joueurs" element={<JoueursPage />} />
            <Route path="joueurs/:playerId" element={<PlayerDetailPage />} />
            <Route path="joueurs/:playerId/soloq/:riotMatchId" element={<SoloqMatchDetailPage />} />
            <Route path="champion-pool" element={<ChampionPoolPage />} />
            <Route path="matchs" element={<MatchsPage />} />
            <Route path="matchs/:matchId" element={<MatchDetailPage />} />
            <Route path="planning" element={<PlanningPage />} />
            <Route path="stats" element={<TeamStatsPage />} />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="coaching" element={<CoachingPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="test" element={<TestPage />} />
          </Route>
          <Route path="stats" element={<Stats />} />
          <Route path="stats/pro/champions" element={<ProChampions />} />
          <Route path="stats/champion/:championName" element={<ChampionDetail />} />
          <Route path="stats/match/:gameid" element={<MatchDetail />} />
          <Route path="stats/pro/teams" element={<ProTeams />} />
          <Route path="stats/pro/players" element={<ProPlayers />} />
          <Route path="stats/pro/tournaments" element={<ProTournaments />} />
          <Route path="login" element={<Login />} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TeamProvider>
            <AppRoutes />
          </TeamProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
