import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Clock } from 'lucide-react';
import { ChampionFilters } from '../../components/stats/ChampionFilters';
import { ChampionStatsTable } from '../../components/stats/ChampionStatsTable';
import { SeasonSelector } from '../../components/stats/SeasonSelector';
import { getChampionStats, getFilterOptions, getLastUpdateDate } from '../../lib/championStats';

export const ProChampions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    season: searchParams.get('season') || 'S16',
    split: 'all',
    tournament: 'all',
    patch: 'all',
    role: 'all',
    leagues: [],
    side: 'all',
  });

  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    tournaments: [],
    patches: [],
    leagues: [],
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  // Charger les options de filtres et la date de dernière mise à jour
  useEffect(() => {
    const loadOptions = async () => {
      const options = await getFilterOptions(filters.season);
      setFilterOptions(options);
      
      const lastDate = await getLastUpdateDate(filters.season);
      setLastUpdate(lastDate);
    };
    loadOptions();
  }, [filters.season]);

  // Charger les stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await getChampionStats(filters);

        if (fetchError) {
          throw fetchError;
        }

        setStatsData(data || []);
      } catch (err) {
        console.error('Erreur chargement stats:', err);
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleCopyTable = () => {
    // TODO: Copier le tableau dans le presse-papier
    alert('Fonctionnalité à venir !');
  };

  return (
    <div className="w-full px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/stats')}
            className="p-2 hover:bg-dark-card rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-display text-4xl font-bold">Champions</h1>
            <p className="text-gray-400">Statistiques agrégées par champion</p>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyTable}
          className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
        >
          <Copy size={18} />
          Copy table to clipboard
        </button>
      </div>

      {/* Season Selector */}
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

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center mb-6"
        >
          <p className="text-red-500">{error}</p>
        </motion.div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ChampionStatsTable data={statsData} loading={loading} filters={filters} />
      </motion.div>
    </div>
  );
};
