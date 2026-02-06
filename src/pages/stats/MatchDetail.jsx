import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy } from 'lucide-react';
import { getMatchDetails } from '../../lib/matchStats';
import { getChampionImage } from '../../lib/championImages';

const formatTime = (seconds) => {
  if (!seconds) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const TABS = [
  { id: 'summary', label: 'SUMMARY' },
  { id: 'allstats', label: 'ALL STATS' },
  { id: 'builds', label: 'BUILDS' },
  { id: 'timeline', label: 'TIMELINE' },
  { id: 'plays', label: 'PLAYS' },
];

export const MatchDetail = () => {
  const { gameid } = useParams();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const loadMatch = async () => {
      setLoading(true);
      try {
        // Détecter la saison depuis le gameid (S16 commence par LOLTMNT)
        const season = gameid?.startsWith('LOLTMNT') ? 'S16' : 'S16'; // Pour l'instant, on assume S16
        const { data, error } = await getMatchDetails(gameid, season);
        if (error) {
          console.error('Erreur chargement match:', error);
          return;
        }
        setMatchData(data);
      } catch (error) {
        console.error('Erreur chargement match:', error);
      } finally {
        setLoading(false);
      }
    };

    if (gameid) {
      loadMatch();
    }
  }, [gameid]);

  if (loading) {
    return (
      <div className="w-full px-6 py-12">
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <p className="text-gray-400">Chargement du match...</p>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="w-full px-6 py-12">
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <p className="text-gray-400">Match non trouvé</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-accent-blue rounded-lg hover:bg-accent-blue/80 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const { blueTeam, redTeam, teamA, teamB, winner, gamelength, date, league, patch, game } = matchData;
  const gameTime = formatTime(gamelength);
  const matchDate = date ? new Date(date).toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }) : '-';

  return (
    <div className="w-full px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-card rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div>
          <h1 className="font-display text-4xl font-bold">
            {teamA?.name || blueTeam.name} vs {teamB?.name || redTeam.name}
          </h1>
          <p className="text-gray-400">{league} - {matchDate}</p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-400">v{patch}</span>
          <span className="text-sm text-gray-400">{gameTime}</span>
        </div>
      </div>

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
        {activeTab === 'summary' && (
          <SummaryTab matchData={matchData} />
        )}
        {activeTab === 'allstats' && (
          <AllStatsTab matchData={matchData} />
        )}
        {activeTab === 'builds' && (
          <BuildsTab matchData={matchData} />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab matchData={matchData} />
        )}
        {activeTab === 'plays' && (
          <PlaysTab matchData={matchData} />
        )}
      </motion.div>
    </div>
  );
};

// Tab Summary
const SummaryTab = ({ matchData }) => {
  const { blueTeam, redTeam, winner, gamelength } = matchData;
  const isBlueWinner = winner === 'blue';

  return (
    <div className="space-y-6">
      {/* Teams Overview */}
      <div className="grid grid-cols-2 gap-6">
        {/* Blue Team */}
        <div className={`bg-dark-card border rounded-lg p-6 ${isBlueWinner ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{blueTeam.name}</h3>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${isBlueWinner ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {isBlueWinner ? 'WIN' : 'LOSS'}
            </span>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">⚔️ {blueTeam.stats.kills}</div>
              <div className="text-xs text-gray-400">Kills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🏰 {blueTeam.stats.towers || 0}</div>
              <div className="text-xs text-gray-400">Towers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🐉 {blueTeam.stats.dragons || 0}</div>
              <div className="text-xs text-gray-400">Dragons</div>
            </div>
          </div>
          
          {/* Objectives */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">👑 {blueTeam.stats.barons || 0}</div>
              <div className="text-xs text-gray-400">Barons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🦀 {blueTeam.stats.heralds || 0}</div>
              <div className="text-xs text-gray-400">Herald</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🪲 {blueTeam.stats.void_grubs || 0}</div>
              <div className="text-xs text-gray-400">Grubs</div>
            </div>
          </div>

          {/* Bans */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">BANS</div>
            <div className="flex gap-2">
              {blueTeam.players[0] && ['ban1', 'ban2', 'ban3', 'ban4', 'ban5'].map((ban, idx) => (
                <div key={idx} className="w-12 h-12 bg-dark-bg rounded border border-dark-border flex items-center justify-center">
                  {blueTeam.players[0][ban] ? (
                    <img
                      src={getChampionImage(blueTeam.players[0][ban])}
                      alt={blueTeam.players[0][ban]}
                      className="w-full h-full rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Picks */}
          <div>
            <div className="text-xs text-gray-400 mb-2">PICKS</div>
            <div className="space-y-2">
              {blueTeam.players.map((player, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img
                    src={getChampionImage(player.champion)}
                    alt={player.champion}
                    className="w-10 h-10 rounded border border-dark-border"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{player.playername}</div>
                    <div className="text-xs text-gray-400">{player.champion}</div>
                  </div>
                  <div className="text-sm">
                    <span className={player.result === 1 ? 'text-green-500' : 'text-red-500'}>
                      {player.kills || 0}/{player.deaths || 0}/{player.assists || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Red Team */}
        <div className={`bg-dark-card border rounded-lg p-6 ${!isBlueWinner ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{redTeam.name}</h3>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${!isBlueWinner ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {!isBlueWinner ? 'WIN' : 'LOSS'}
            </span>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">⚔️ {redTeam.stats.kills}</div>
              <div className="text-xs text-gray-400">Kills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🏰 {redTeam.stats.towers || 0}</div>
              <div className="text-xs text-gray-400">Towers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🐉 {redTeam.stats.dragons || 0}</div>
              <div className="text-xs text-gray-400">Dragons</div>
            </div>
          </div>
          
          {/* Objectives */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">👑 {redTeam.stats.barons || 0}</div>
              <div className="text-xs text-gray-400">Barons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🦀 {redTeam.stats.heralds || 0}</div>
              <div className="text-xs text-gray-400">Herald</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">🪲 {redTeam.stats.void_grubs || 0}</div>
              <div className="text-xs text-gray-400">Grubs</div>
            </div>
          </div>

          {/* Bans */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">BANS</div>
            <div className="flex gap-2">
              {redTeam.players[0] && ['ban1', 'ban2', 'ban3', 'ban4', 'ban5'].map((ban, idx) => (
                <div key={idx} className="w-12 h-12 bg-dark-bg rounded border border-dark-border flex items-center justify-center">
                  {redTeam.players[0][ban] ? (
                    <img
                      src={getChampionImage(redTeam.players[0][ban])}
                      alt={redTeam.players[0][ban]}
                      className="w-full h-full rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Picks */}
          <div>
            <div className="text-xs text-gray-400 mb-2">PICKS</div>
            <div className="space-y-2">
              {redTeam.players.map((player, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img
                    src={getChampionImage(player.champion)}
                    alt={player.champion}
                    className="w-10 h-10 rounded border border-dark-border"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{player.playername}</div>
                    <div className="text-xs text-gray-400">{player.champion}</div>
                  </div>
                  <div className="text-sm">
                    <span className={player.result === 1 ? 'text-green-500' : 'text-red-500'}>
                      {player.kills || 0}/{player.deaths || 0}/{player.assists || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tab All Stats
const AllStatsTab = ({ matchData }) => {
  const { blueTeam, redTeam } = matchData;
  // Blue team d'abord, puis Red team
  const allPlayers = [...blueTeam.players, ...redTeam.players];

  const columns = [
    { key: 'champion', label: 'Champion' },
    { key: 'playername', label: 'Player' },
    { key: 'position', label: 'Role' },
    { key: 'kills', label: 'Kills' },
    { key: 'deaths', label: 'Deaths' },
    { key: 'assists', label: 'Assists' },
    { key: 'kda', label: 'KDA' },
    { key: 'cs', label: 'CS' },
    { key: 'cspm', label: 'CSM' },
    { key: 'totalgold', label: 'Golds' },
    { key: 'earned_gpm', label: 'GPM' },
    { key: 'visionscore', label: 'Vision Score' },
    { key: 'dpm', label: 'DPM' },
    { key: 'csdiffat15', label: 'CSD@15' },
    { key: 'golddiffat15', label: 'GD@15' },
  ];

  const calculateKDA = (kills, deaths, assists) => {
    if (deaths === 0) return 'Perfect KDA';
    return ((kills + assists) / deaths).toFixed(1);
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-dark-border flex items-center justify-between">
        <h3 className="text-accent-blue font-bold text-lg">ALL STATS</h3>
        <button className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2">
          <Copy size={18} />
          Copy table to clipboard
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#4A6B7C]">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-sm text-white">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPlayers.map((player, idx) => {
              const kda = calculateKDA(player.kills || 0, player.deaths || 0, player.assists || 0);
              const totalCS = (player.minionkills || 0) + (player.monsterkills || 0);
              const isBlueTeam = idx < 5;
              
              return (
                <tr
                  key={idx}
                  className={`border-b border-dark-border ${
                    isBlueTeam ? 'bg-[#2C3E50]' : 'bg-[#34495E]'
                  }`}
                >
                  <td className={`px-4 py-3 ${idx === 4 ? 'border-r-2 border-red-500/50' : ''}`}>
                    <img
                      src={getChampionImage(player.champion)}
                      alt={player.champion}
                      className="w-8 h-8 rounded inline-block mr-2"
                    />
                    <span className="text-sm">{player.champion}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{player.playername || '-'}</td>
                  <td className="px-4 py-3 text-sm uppercase">{player.position || '-'}</td>
                  <td className="px-4 py-3 text-center">{player.kills || 0}</td>
                  <td className="px-4 py-3 text-center">{player.deaths || 0}</td>
                  <td className="px-4 py-3 text-center">{player.assists || 0}</td>
                  <td className="px-4 py-3 text-center">{kda}</td>
                  <td className="px-4 py-3 text-center">{totalCS}</td>
                  <td className="px-4 py-3 text-center">{(player.cspm || 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">{player.totalgold || 0}</td>
                  <td className="px-4 py-3 text-center">{Math.round(player.earned_gpm || 0)}</td>
                  <td className="px-4 py-3 text-center">{player.visionscore || 0}</td>
                  <td className="px-4 py-3 text-center">{Math.round(player.dpm || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={(player.csdiffat15 || 0) > 0 ? 'text-green-500' : (player.csdiffat15 || 0) < 0 ? 'text-red-500' : ''}>
                      {(player.csdiffat15 || 0) > 0 ? '+' : ''}{(player.csdiffat15 || 0).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={(player.golddiffat15 || 0) > 0 ? 'text-green-500' : (player.golddiffat15 || 0) < 0 ? 'text-red-500' : ''}>
                      {(player.golddiffat15 || 0) > 0 ? '+' : ''}{(player.golddiffat15 || 0).toFixed(0)}
                    </span>
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

// Tab Builds (Placeholder)
const BuildsTab = ({ matchData }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h3 className="text-accent-blue font-bold text-lg mb-4">BUILDS</h3>
      <p className="text-gray-400">🚧 Section Builds à venir (nécessite données items/runes)</p>
    </div>
  );
};

// Tab Timeline (Placeholder)
const TimelineTab = ({ matchData }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h3 className="text-accent-blue font-bold text-lg mb-4">TIMELINE</h3>
      <p className="text-gray-400">🚧 Section Timeline à venir (nécessite données événements)</p>
    </div>
  );
};

// Tab Plays (Placeholder)
const PlaysTab = ({ matchData }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6">
      <h3 className="text-accent-blue font-bold text-lg mb-4">PLAYS</h3>
      <p className="text-gray-400">🚧 Section Plays à venir (nécessite données événements)</p>
    </div>
  );
};
