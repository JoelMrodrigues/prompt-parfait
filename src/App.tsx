import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { ToastContainer } from './components/common/Toast'
import { isSupabaseConfigured } from './lib/supabase'

import { Home } from './pages/Home'
import { Draft } from './pages/draft/DraftPage'
import { Login } from './pages/Login'

import { TeamLayout } from './pages/team/TeamLayout'
import { TeamOverviewPage } from './pages/team/overview/TeamOverviewPage'
import { TeamJoinPage } from './pages/team/TeamJoinPage'
import { JoueursPage } from './pages/team/joueurs/JoueursPage'
import { PlayerDetailPage } from './pages/team/joueurs/PlayerDetailPage'
import { ChampionPoolPage } from './pages/team/champion-pool/ChampionPoolPage'
import { MatchsPage } from './pages/team/matchs/MatchsPage'
import { MatchDetailPage } from './pages/team/matchs/MatchDetailPage'
import { TeamStatsPage } from './pages/team/stats/TeamStatsPage'
import { ImportPage } from './pages/team/import/ImportPage'
import { DraftsPage } from './pages/team/drafts/DraftsPage'
import { CoachingPage } from './pages/team/coaching/CoachingPage'
import { PlanningPage } from './pages/team/planning/PlanningPage'

import { Stats } from './pages/Stats'
import { ProChampions } from './pages/stats/ProChampions'
import { ChampionDetail } from './pages/stats/ChampionDetail'
import { MatchDetail } from './pages/stats/MatchDetail'
import { ProTeams } from './pages/stats/ProTeams'
import { ProPlayers } from './pages/stats/ProPlayers'
import { ProTournaments } from './pages/stats/ProTournaments'

function AppRoutes() {
  const { toasts, removeToast } = useToast()

  const DraftRoute = isSupabaseConfigured ? (
    <ProtectedRoute>
      <Draft />
    </ProtectedRoute>
  ) : (
    <Draft />
  )

  const TeamRoute = isSupabaseConfigured ? (
    <ProtectedRoute>
      <TeamLayout />
    </ProtectedRoute>
  ) : (
    <TeamLayout />
  )

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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
            <Route path="champion-pool" element={<ChampionPoolPage />} />
            <Route path="matchs" element={<MatchsPage />} />
            <Route path="matchs/:matchId" element={<MatchDetailPage />} />
            <Route path="planning" element={<PlanningPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="stats" element={<TeamStatsPage />} />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="coaching" element={<CoachingPage />} />
          </Route>
          <Route path="stats" element={<Stats />} />
          <Route path="stats/pro/champions" element={<ProChampions />} />
          <Route path="stats/champion/:championName" element={<ChampionDetail />} />
          <Route path="stats/match/:gameid" element={<MatchDetail />} />
          <Route path="stats/pro/teams" element={<ProTeams />} />
          <Route path="stats/pro/players" element={<ProPlayers />} />
          <Route path="stats/pro/tournaments" element={<ProTournaments />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
