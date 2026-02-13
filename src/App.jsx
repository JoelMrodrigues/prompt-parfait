import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Draft } from './pages/draft/DraftPage'
import { TeamLayout } from './pages/team/TeamLayout'
import { TeamOverviewPage } from './pages/team/overview/TeamOverviewPage'
import { TeamJoinPage } from './pages/team/TeamJoinPage'
import { Stats } from './pages/Stats'
import { ProChampions } from './pages/stats/ProChampions'
import { ChampionDetail } from './pages/stats/ChampionDetail'
import { MatchDetail } from './pages/stats/MatchDetail'
import { ProTeams } from './pages/stats/ProTeams'
import { ProPlayers } from './pages/stats/ProPlayers'
import { ProTournaments } from './pages/stats/ProTournaments'
import { ChampionPoolPage } from './pages/team/champion-pool/ChampionPoolPage'
import { JoueursPage } from './pages/team/joueurs/JoueursPage'
import { PlayerDetailPage } from './pages/team/joueurs/PlayerDetailPage'
import { TeamStatsPage } from './pages/team/stats/TeamStatsPage'
import { MatchsPage } from './pages/team/matchs/MatchsPage'
import { MatchDetailPage } from './pages/team/matchs/MatchDetailPage'
import { ImportPage } from './pages/team/import/ImportPage'
import { DraftsPage } from './pages/team/drafts/DraftsPage'
import { CoachingPage } from './pages/team/coaching/CoachingPage'
import { PlanningPage } from './pages/team/planning/PlanningPage'
import { Login } from './pages/Login'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/common/Toast'
import { isSupabaseConfigured } from './lib/supabase'

function App() {
  const { toasts, removeToast } = useToast()

  // En mode démo, on retire la protection des routes
  const DraftRoute = isSupabaseConfigured ? <ProtectedRoute><Draft /></ProtectedRoute> : <Draft />

  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="draft" element={DraftRoute} />
            <Route path="team" element={isSupabaseConfigured ? <ProtectedRoute><TeamLayout /></ProtectedRoute> : <TeamLayout />}>
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
    </AuthProvider>
  )
}

export default App
