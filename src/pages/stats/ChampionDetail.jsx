import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { getChampionImage } from '../../lib/championImages';
import { SeasonSelector } from '../../components/stats/SeasonSelector';
import { ChampionFilters } from '../../components/stats/ChampionFilters';
import { getFilterOptions, getLastUpdateDate } from '../../lib/championStats';
import { getChampionDetailStats, getChampionMatches } from '../../lib/championDetailStats';
import { getMultipleMatchTeamNames } from '../../lib/matchStats';

const TABS = [
  { id: 'statistics', label: 'STATISTICS' },
  { id: 'matchlist', label: 'MATCH LIST' },
  { id: 'builds', label: 'BUILDS' },
];

export const ChampionDetail = () => {
  const { championName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('statistics');
  const [filters, setFilters] = useState({
    season: searchParams.get('season') || 'S16',
    split: 'all',
    tournament: 'all',
    patch: 'all',
    role: 'all',
    leagues: [],
    side: 'all',
  });
  const [filterOptions, setFilterOptions] = useState({
    tournaments: [],
    patches: [],
    leagues: [],
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [championStats, setChampionStats] = useState(null);
  const [matches, setMatches] = useState([]);

  // Charger les options de filtres
  useEffect(() => {
    const loadOptions = async () => {
      const options = await getFilterOptions(filters.season);
      setFilterOptions(options);
      
      const lastDate = await getLastUpdateDate(filters.season);
      setLastUpdate(lastDate);
    };
    loadOptions();
  }, [filters.season]);

  // Charger les stats du champion
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Charger les stats agrégées
        const { data: stats } = await getChampionDetailStats(championName, filters);
        setChampionStats(stats);

        // Charger les matchs
        const { data: matchesData } = await getChampionMatches(championName, filters, 200);
        setMatches(matchesData || []);
      } catch (error) {
        console.error('Erreur chargement données champion:', error);
      } finally {
        setLoading(false);
      }
    };

    if (championName) {
      loadData();
    }
  }, [championName, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="w-full px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <button
          onClick={() => navigate('/stats/pro/champions')}
          className="p-2 hover:bg-dark-card rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        {/* Champion Avatar & Name */}
        <div className="flex items-center gap-4">
          <img
            src={getChampionImage(championName)}
            alt={championName}
            className="w-20 h-20 rounded-full border-2 border-accent-blue"
          />
          <h1 className="font-display text-5xl font-bold">{championName}</h1>
        </div>
      </div>

      {/* Season Selector & Last Update */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400">SEASON</h3>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={12} />
              <span>
                Dernière mise à jour: {new Date(lastUpdate).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
        <SeasonSelector 
          selected={filters.season} 
          onChange={(season) => handleFilterChange({ ...filters, season })} 
        />
      </motion.div>

      {/* Filters */}
      <ChampionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        tournaments={filterOptions.tournaments}
        patches={filterOptions.patches}
        leagues={filterOptions.leagues}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-dark-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-accent-blue'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'statistics' && (
          <StatisticsTab 
            championName={championName} 
            filters={filters} 
            loading={loading} 
            stats={championStats}
          />
        )}
        {activeTab === 'matchlist' && (
          <MatchListTab 
            championName={championName} 
            filters={filters} 
            loading={loading}
            matches={matches}
          />
        )}
        {activeTab === 'builds' && (
          <BuildsTab championName={championName} filters={filters} loading={loading} />
        )}
      </motion.div>
    </div>
  );
};

// Tab Statistics
const StatisticsTab = ({ championName, filters, loading, stats }) => {
  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <p className="text-gray-400">Chargement des statistiques...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <p className="text-gray-400">Aucune donnée disponible pour ce champion</p>
      </div>
    );
  }

  const { general, roleStats, playerStats, leagueStats, patchStats } = stats;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Main Stats */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-accent-blue font-bold text-lg mb-4">STATS</h3>
          <div className="space-y-3">
            <StatRow label="Bans:" value={`${general.bans}`} />
            <StatRow label="Picks:" value={`${general.picks}`} />
            <StatRow 
              label="Win rate:" 
              value={`${general.wins}W - ${general.losses}L (${general.winrate.toFixed(1)}%)`} 
              valueColor={general.winrate > 50 ? 'text-green-500' : 'text-red-500'} 
            />
            <StatRow label="KDA:" value={general.kda.toFixed(1)} />
            <StatRow label="CSM:" value={general.csm.toFixed(1)} />
            <StatRow label="GPM:" value={general.gpm} />
            <StatRow label="DPM:" value={general.dpm} />
            <StatRow 
              label="CSD@15:" 
              value={general.csd15 > 0 ? `+${general.csd15.toFixed(1)}` : general.csd15.toFixed(1)} 
              valueColor={general.csd15 > 0 ? 'text-green-500' : general.csd15 < 0 ? 'text-red-500' : ''} 
            />
            <StatRow 
              label="GD@15:" 
              value={general.gd15 > 0 ? `+${general.gd15}` : general.gd15} 
              valueColor={general.gd15 > 0 ? 'text-green-500' : general.gd15 < 0 ? 'text-red-500' : ''} 
            />
            <StatRow 
              label="XPD@15:" 
              value={general.xpd15 > 0 ? `+${general.xpd15}` : general.xpd15} 
              valueColor={general.xpd15 > 0 ? 'text-green-500' : general.xpd15 < 0 ? 'text-red-500' : ''} 
            />
            <StatRow label="Avg Game Time:" value={general.avgGameLength} />
          </div>
        </div>

        {/* Right: Role Stats */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-accent-blue font-bold text-lg mb-4">ROLE</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-dark-border">
                <th className="pb-2"></th>
                <th className="pb-2 text-center">NB</th>
                <th className="pb-2 text-center">WIN RATE</th>
                <th className="pb-2 text-center">KDA</th>
                <th className="pb-2 text-center">DPM</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map(role => {
                const roleData = roleStats[role];
                const icons = { TOP: '⚔️', JUNGLE: '🌲', MID: '⚡', BOT: '🏹', SUPPORT: '🛡️' };
                
                return (
                  <tr key={role} className="border-b border-dark-border/50">
                    <td className="py-3 flex items-center gap-2">
                      <span className="text-gray-400">{icons[role]}</span> {role}
                    </td>
                    {roleData ? (
                      <>
                        <td className="text-center">{roleData.nb}</td>
                        <td className="text-center">
                          <span className={roleData.winrate > 50 ? 'text-green-500' : 'text-red-500'}>
                            {roleData.winrate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center">{roleData.kda.toFixed(1)}</td>
                        <td className="text-center">{roleData.dpm}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-center text-gray-500">-</td>
                        <td className="text-center text-gray-500">-</td>
                        <td className="text-center text-gray-500">-</td>
                        <td className="text-center text-gray-500">-</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Players */}
      {playerStats && playerStats.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-accent-blue font-bold text-lg mb-4">BEST {championName.toUpperCase()} PLAYERS</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-dark-border">
                <th className="pb-2">PLAYER</th>
                <th className="pb-2 text-center">NB GAMES</th>
                <th className="pb-2 text-center">WIN RATE</th>
                <th className="pb-2 text-center">KDA</th>
                <th className="pb-2 text-center">CSD@15</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {playerStats.map((player, idx) => (
                <tr key={idx} className="border-b border-dark-border/50">
                  <td className="py-3">{player.name}</td>
                  <td className="text-center">{player.games}</td>
                  <td className="text-center">
                    <span className={player.winrate > 50 ? 'text-green-500' : 'text-red-500'}>
                      {player.winrate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-center">{player.kda.toFixed(1)}</td>
                  <td className="text-center">
                    <span className={player.csd15 > 0 ? 'text-green-500' : player.csd15 < 0 ? 'text-red-500' : ''}>
                      {player.csd15 > 0 ? `+${player.csd15.toFixed(0)}` : player.csd15.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* League Stats */}
      {leagueStats && leagueStats.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-accent-blue font-bold text-lg mb-4">LEAGUE</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-dark-border">
                <th className="pb-2">LEAGUE</th>
                <th className="pb-2 text-center">PRESENCE</th>
                <th className="pb-2 text-center">NB GAMES</th>
                <th className="pb-2 text-center">WIN RATE</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {leagueStats.map((league, idx) => (
                <tr key={idx} className="border-b border-dark-border/50">
                  <td className="py-3">{league.league}</td>
                  <td className="text-center">{league.presence.toFixed(0)}%</td>
                  <td className="text-center">{league.games}</td>
                  <td className="text-center">
                    <span className={league.winrate > 50 ? 'text-green-500' : 'text-red-500'}>
                      {league.winrate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Presence by Patch */}
      {patchStats && patchStats.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-accent-blue font-bold text-lg mb-4">PRESENCE BY PATCH</h3>
          <div className="flex flex-wrap gap-3">
            {patchStats.map((patch, idx) => (
              <div key={idx} className="bg-dark-bg rounded px-4 py-2 text-center min-w-[100px]">
                <div className="text-xs text-gray-400">Patch {patch.patch}</div>
                <div className="text-lg font-semibold">{patch.percentage.toFixed(0)}%</div>
                <div className="text-xs text-gray-500">{patch.games} games</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Tab Match List
const MatchListTab = ({ championName, filters, loading, matches }) => {
  const [teamNames, setTeamNames] = useState({});
  const navigate = useNavigate();

  // Récupérer les noms d'équipes pour tous les matches via gameid
  useEffect(() => {
    const loadTeamNames = async () => {
      if (!matches || matches.length === 0) return;

      // Extraire tous les gameids uniques
      const uniqueGameIds = [...new Set(matches.map(m => m.gameid).filter(Boolean))];
      if (uniqueGameIds.length === 0) return;

      console.log(`📊 Chargement noms équipes pour ${uniqueGameIds.length} matches...`);

      // Récupérer les noms d'équipes en une seule fois
      // Pour S16, utilise Google Sheets au lieu de Supabase
      const namesMap = await getMultipleMatchTeamNames(uniqueGameIds, filters.season);

      console.log(`✅ Noms équipes chargés:`, namesMap);

      // Fallback pour les matches sans noms d'équipes (utiliser gameid, PAS match.game qui contient "1" ou "2")
      uniqueGameIds.forEach(gameid => {
        if (!namesMap[gameid]) {
          console.warn(`⚠️ Pas de noms d'équipes pour ${gameid}, utilisation du gameid`);
          namesMap[gameid] = gameid; // Utiliser gameid directement, pas match.game
        }
      });

      setTeamNames(namesMap);
    };

    loadTeamNames();
  }, [matches]);

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <p className="text-gray-400">Chargement des matchs...</p>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <p className="text-gray-400">Aucun match disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-dark-border">
        <h3 className="text-accent-blue font-bold text-lg">Last {matches.length} games</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#4A6B7C]">
            <tr className="text-left text-sm text-white">
              <th className="px-4 py-3">PLAYER</th>
              <th className="px-4 py-3 text-center">RESULT</th>
              <th className="px-4 py-3 text-center">KDA</th>
              <th className="px-4 py-3 text-center">CSD@15</th>
              <th className="px-4 py-3 text-center">DPM</th>
              <th className="px-4 py-3 text-center">KP%</th>
              <th className="px-4 py-3 text-center">DATE</th>
              <th className="px-4 py-3">GAME</th>
              <th className="px-4 py-3">TOURNAMENT</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, idx) => {
              const kda = `${match.kills || 0}/${match.deaths || 0}/${match.assists || 0}`;
              const kdaRatio = match.deaths > 0 
                ? ((match.kills + match.assists) / match.deaths).toFixed(1)
                : ((match.kills + match.assists) || 0).toFixed(1);
              const kp = match.teamkills > 0 
                ? (((match.kills + match.assists) / match.teamkills) * 100).toFixed(0)
                : 0;
              const result = match.result === 1 ? 'Victory' : 'Defeat';
              const date = match.date ? new Date(match.date).toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              }) : '-';
              // Utiliser teamNames si disponible, sinon afficher "Loading..." ou le gameid
              const gameName = teamNames[match.gameid] || (Object.keys(teamNames).length > 0 ? 'Loading...' : match.gameid || '-');

              return (
                <tr
                  key={idx}
                  className={`border-b border-dark-border hover:bg-dark-bg/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-[#2C3E50]' : 'bg-[#34495E]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/stats/player/${encodeURIComponent(match.playername || '')}`}
                      className="hover:text-accent-blue transition-colors cursor-pointer"
                    >
                      {match.playername || '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={result === 'Victory' ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>
                      {result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm">{kda}</div>
                    <div className="text-xs text-gray-400">{kdaRatio} KDA</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={
                      (match.csdiffat15 || 0) > 0 ? 'text-green-500' : 
                      (match.csdiffat15 || 0) < 0 ? 'text-red-500' : ''
                    }>
                      {(match.csdiffat15 || 0) > 0 ? '+' : ''}{(match.csdiffat15 || 0).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{Math.round(match.dpm || 0)}</td>
                  <td className="px-4 py-3 text-center">{kp}%</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-400">{date}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/stats/match/${match.gameid}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {gameName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/stats/tournament/${encodeURIComponent(match.league || '')}`}
                      className="text-sm text-gray-300 hover:text-accent-blue transition-colors cursor-pointer"
                    >
                      {match.league || '-'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tab Builds
const BuildsTab = ({ championName, filters, loading }) => {
  return (
    <div className="space-y-6">
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-accent-blue font-bold text-lg mb-4">Items</h3>
        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : (
          <p className="text-gray-400">🚧 Items build à venir</p>
        )}
      </div>
      
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-accent-blue font-bold text-lg mb-4">Runes</h3>
        <p className="text-gray-400">🚧 Runes build à venir</p>
      </div>
    </div>
  );
};

// Helper Component
const StatRow = ({ label, value, valueColor = 'text-white' }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className={`font-semibold ${valueColor}`}>{value}</span>
  </div>
);
