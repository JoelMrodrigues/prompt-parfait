import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const SPLITS = ['ALL', 'Pre-Season', 'Winter', 'Spring', 'Summer'];
const ROLES = ['ALL', 'TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
const SIDES = ['-- ALL --', 'Blue', 'Red'];

// Catégories de leagues (correspondance exacte prioritaire, puis mots-clés)
const MAJOR_LEAGUES_EXACT = ['LPL', 'LCK', 'LEC', 'LCS', 'PCS', 'VCS', 'CBLOL', 'LJL', 'LLA'];
const ERL_KEYWORDS = ['LFL', 'Prime League', 'Superliga', 'NLC', 'Ultraliga', 'PG Nationals', 'Greek Legends', 'Hitpoint Masters', 'LVP', 'TCL', 'LCP'];
const ASIA_KEYWORDS = ['LCKC', 'LDL', 'Challengers Korea', 'LCK CL', 'LJL CS'];
const AMERICAS_KEYWORDS = ['Academy', 'Challengers NA', 'CBLOLA', 'Liga Latinoamérica'];
const OTHER_KEYWORDS = ['AL', 'HLL', 'LIT', 'ROL'];

export const ChampionFilters = ({ filters, onFilterChange, tournaments = [], patches = [], leagues = [] }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    major: true,
    erl: true,
    asia: false,
    americas: false,
    others: false,
  });

  // Organiser les leagues par catégories
  const leagueGroups = useMemo(() => {
    const groups = {
      major: [],
      erl: [],
      asia: [],
      americas: [],
      others: []
    };

    leagues.forEach(league => {
      const leagueUpper = league.toUpperCase();
      
      // Major Leagues (égalité exacte en priorité)
      if (MAJOR_LEAGUES_EXACT.includes(leagueUpper)) {
        groups.major.push(league);
      }
      // ERL (European Regional Leagues)
      else if (ERL_KEYWORDS.some(keyword => leagueUpper.includes(keyword.toUpperCase()))) {
        groups.erl.push(league);
      }
      // Asia (ligues de développement asiatiques)
      else if (ASIA_KEYWORDS.some(keyword => leagueUpper.includes(keyword.toUpperCase()))) {
        groups.asia.push(league);
      }
      // Americas (ligues de développement américaines)
      else if (AMERICAS_KEYWORDS.some(keyword => leagueUpper.includes(keyword.toUpperCase()))) {
        groups.americas.push(league);
      }
      // Others
      else {
        groups.others.push(league);
      }
    });

    return groups;
  }, [leagues]);

  const handleSplitClick = (split) => {
    onFilterChange({ ...filters, split: split === 'ALL' ? 'all' : split });
  };

  const handleRoleClick = (role) => {
    onFilterChange({ ...filters, role: role === 'ALL' ? 'all' : role });
  };

  const handleLeagueToggle = (league) => {
    const currentLeagues = filters.leagues || [];
    const newLeagues = currentLeagues.includes(league)
      ? currentLeagues.filter(l => l !== league)
      : [...currentLeagues, league];
    onFilterChange({ ...filters, leagues: newLeagues });
  };

  const handleSelectAllLeagues = () => {
    if ((filters.leagues || []).length === leagues.length) {
      // Tout désélectionner
      onFilterChange({ ...filters, leagues: [] });
    } else {
      // Tout sélectionner
      onFilterChange({ ...filters, leagues: [...leagues] });
    }
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleSelectGroupLeagues = (groupLeagues) => {
    const currentLeagues = filters.leagues || [];
    const allSelected = groupLeagues.every(league => currentLeagues.includes(league));
    
    if (allSelected) {
      // Désélectionner tout le groupe
      onFilterChange({ ...filters, leagues: currentLeagues.filter(l => !groupLeagues.includes(l)) });
    } else {
      // Sélectionner tout le groupe
      const newLeagues = [...new Set([...currentLeagues, ...groupLeagues])];
      onFilterChange({ ...filters, leagues: newLeagues });
    }
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-6">
      {/* Row 1: Split & Role */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Split */}
        <div>
          <label className="text-sm font-semibold text-gray-400 mb-2 block">Split:</label>
          <div className="flex flex-wrap gap-2">
            {SPLITS.map(split => (
              <button
                key={split}
                onClick={() => handleSplitClick(split)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  (split === 'ALL' && filters.split === 'all') || filters.split === split
                    ? 'bg-accent-blue text-white'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                {split}
              </button>
            ))}
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="text-sm font-semibold text-gray-400 mb-2 block">Role:</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => handleRoleClick(role)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  (role === 'ALL' && filters.role === 'all') || filters.role === role
                    ? 'bg-accent-blue text-white'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2+: Tournament/Game Version/Side à gauche, Leagues à droite */}
      <div className="grid grid-cols-2 gap-8">
        {/* Colonne gauche */}
        <div className="space-y-6">
          {/* Tournament */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">Tournament:</label>
            <select
              value={filters.tournament || 'all'}
              onChange={(e) => onFilterChange({ ...filters, tournament: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:border-accent-blue focus:outline-none"
            >
              <option value="all">-- ALL --</option>
              {tournaments.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Game Version */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">Game version:</label>
            <select
              value={filters.patch || 'all'}
              onChange={(e) => onFilterChange({ ...filters, patch: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:border-accent-blue focus:outline-none"
            >
              <option value="all">-- ALL --</option>
              {patches.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Side */}
          <div>
            <label className="text-sm font-semibold text-gray-400 mb-2 block">Side:</label>
            <select
              value={filters.side || 'all'}
              onChange={(e) => onFilterChange({ ...filters, side: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:border-accent-blue focus:outline-none"
            >
              {SIDES.map(s => (
                <option key={s} value={s === '-- ALL --' ? 'all' : s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Colonne droite: Leagues */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-400">
              Leagues ({(filters.leagues || []).length} selected)
            </label>
            <button
              onClick={handleSelectAllLeagues}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              {(filters.leagues || []).length === leagues.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Groups */}
          <div className="bg-dark-bg/50 border border-dark-border rounded-lg p-4 space-y-1 max-h-96 overflow-y-auto">
              {/* Major Leagues */}
              {leagueGroups.major.length > 0 && (
                <div className="border-b border-dark-border/50 pb-2 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleGroup('major')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-accent-gold hover:text-accent-gold/80 transition-colors"
                    >
                      {expandedGroups.major ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>🏆 Major Leagues</span>
                      <span className="text-xs text-gray-500">({leagueGroups.major.length})</span>
                    </button>
                    <button
                      onClick={() => handleSelectGroupLeagues(leagueGroups.major)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {leagueGroups.major.every(l => (filters.leagues || []).includes(l)) ? 'Deselect' : 'All'}
                    </button>
                  </div>
                  {expandedGroups.major && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 mt-1.5">
                      {leagueGroups.major.map(league => (
                        <label key={league} className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={(filters.leagues || []).includes(league)}
                            onChange={() => handleLeagueToggle(league)}
                            className="rounded w-3.5 h-3.5"
                          />
                          <span className="text-sm">{league}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ERL */}
              {leagueGroups.erl.length > 0 && (
                <div className="border-b border-dark-border/50 pb-2 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleGroup('erl')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors"
                    >
                      {expandedGroups.erl ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>🇪🇺 ERL</span>
                      <span className="text-xs text-gray-500">({leagueGroups.erl.length})</span>
                    </button>
                    <button
                      onClick={() => handleSelectGroupLeagues(leagueGroups.erl)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {leagueGroups.erl.every(l => (filters.leagues || []).includes(l)) ? 'Deselect' : 'All'}
                    </button>
                  </div>
                  {expandedGroups.erl && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 mt-1.5">
                      {leagueGroups.erl.map(league => (
                        <label key={league} className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={(filters.leagues || []).includes(league)}
                            onChange={() => handleLeagueToggle(league)}
                            className="rounded w-3.5 h-3.5"
                          />
                          <span className="text-sm">{league}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Asia */}
              {leagueGroups.asia.length > 0 && (
                <div className="border-b border-dark-border/50 pb-2 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleGroup('asia')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      {expandedGroups.asia ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>🌏 Asia</span>
                      <span className="text-xs text-gray-500">({leagueGroups.asia.length})</span>
                    </button>
                    <button
                      onClick={() => handleSelectGroupLeagues(leagueGroups.asia)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {leagueGroups.asia.every(l => (filters.leagues || []).includes(l)) ? 'Deselect' : 'All'}
                    </button>
                  </div>
                  {expandedGroups.asia && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 mt-1.5">
                      {leagueGroups.asia.map(league => (
                        <label key={league} className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={(filters.leagues || []).includes(league)}
                            onChange={() => handleLeagueToggle(league)}
                            className="rounded w-3.5 h-3.5"
                          />
                          <span className="text-sm">{league}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Americas */}
              {leagueGroups.americas.length > 0 && (
                <div className="border-b border-dark-border/50 pb-2 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleGroup('americas')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
                    >
                      {expandedGroups.americas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>🌎 Americas</span>
                      <span className="text-xs text-gray-500">({leagueGroups.americas.length})</span>
                    </button>
                    <button
                      onClick={() => handleSelectGroupLeagues(leagueGroups.americas)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {leagueGroups.americas.every(l => (filters.leagues || []).includes(l)) ? 'Deselect' : 'All'}
                    </button>
                  </div>
                  {expandedGroups.americas && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 mt-1.5">
                      {leagueGroups.americas.map(league => (
                        <label key={league} className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={(filters.leagues || []).includes(league)}
                            onChange={() => handleLeagueToggle(league)}
                            className="rounded w-3.5 h-3.5"
                          />
                          <span className="text-sm">{league}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Others */}
              {leagueGroups.others.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleGroup('others')}
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      {expandedGroups.others ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>🌐 Others</span>
                      <span className="text-xs text-gray-500">({leagueGroups.others.length})</span>
                    </button>
                    <button
                      onClick={() => handleSelectGroupLeagues(leagueGroups.others)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {leagueGroups.others.every(l => (filters.leagues || []).includes(l)) ? 'Deselect' : 'All'}
                    </button>
                  </div>
                  {expandedGroups.others && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5 mt-1.5">
                      {leagueGroups.others.map(league => (
                        <label key={league} className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={(filters.leagues || []).includes(league)}
                            onChange={() => handleLeagueToggle(league)}
                            className="rounded w-3.5 h-3.5"
                          />
                          <span className="text-sm">{league}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* No results */}
            {Object.values(leagueGroups).every(group => group.length === 0) && (
              <p className="text-center text-gray-500 text-sm py-4">No leagues found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
