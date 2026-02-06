import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Gamepad2, Target, Download, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SeasonSelector } from '../components/stats/SeasonSelector';
import { isSupabaseConfigured } from '../lib/supabase';
import { updateS16 } from '../lib/updateS16';

const MAIN_TABS = [
  { id: 'pro', label: 'Pro' },
  { id: 'soloq', label: 'Solo Q' },
];

const PRO_CATEGORIES = [
  {
    id: 'champions',
    label: 'Champions',
    icon: Target,
    description: 'Statistiques par champion',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/50',
    hoverBorder: 'hover:border-blue-500',
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    description: 'Statistiques par équipe',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/50',
    hoverBorder: 'hover:border-purple-500',
  },
  {
    id: 'players',
    label: 'Players',
    icon: Gamepad2,
    description: 'Statistiques par joueur',
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/50',
    hoverBorder: 'hover:border-green-500',
  },
  {
    id: 'tournaments',
    label: 'Tournaments',
    icon: Trophy,
    description: 'Statistiques par tournoi',
    color: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/50',
    hoverBorder: 'hover:border-yellow-500',
  },
];

export const Stats = () => {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState('pro');
  const [selectedSeason, setSelectedSeason] = useState('S16');
  const [updatingS16, setUpdatingS16] = useState(false);
  const [updateProgress, setUpdateProgress] = useState('');
  const [error, setError] = useState(null);

  // Mettre à jour S16
  const handleUpdateS16 = async () => {
    setUpdatingS16(true);
    setUpdateProgress('Démarrage...');
    setError(null);

    try {
      const result = await updateS16((progress) => {
        setUpdateProgress(progress);
      });

      setUpdateProgress(result.message);

      // Cacher le message après 3 secondes
      setTimeout(() => {
        setUpdatingS16(false);
        setUpdateProgress('');
      }, 3000);
    } catch (error) {
      setError('Erreur lors de la mise à jour S16: ' + error.message);
      setUpdatingS16(false);
      setUpdateProgress('');
    }
  };

  const handleCategoryClick = (categoryId) => {
    // Navigation vers la sous-page (à créer)
    navigate(`/stats/pro/${categoryId}?season=${selectedSeason}`);
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Statistiques</h1>
          <p className="text-gray-400">Analyse des données professionnelles League of Legends</p>
        </div>

        {/* Bouton Update S16 */}
        {isSupabaseConfigured && selectedSeason === 'S16' && (
          <button
            onClick={handleUpdateS16}
            disabled={updatingS16}
            className="px-4 py-2 bg-accent-gold/20 border border-accent-gold rounded-lg hover:bg-accent-gold/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} className={updatingS16 ? 'animate-bounce' : ''} />
            <span>{updatingS16 ? 'Mise à jour...' : 'Mettre à jour S16'}</span>
          </button>
        )}
      </div>

      {/* Update Progress */}
      {updatingS16 && updateProgress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-gold/10 border border-accent-gold rounded-lg p-4 text-center mb-6"
        >
          <p className="text-accent-gold">{updateProgress}</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center mb-6"
        >
          <p className="text-red-500">{error}</p>
        </motion.div>
      )}

      {/* Season Selector */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">SAISON</h3>
        <SeasonSelector selected={selectedSeason} onChange={setSelectedSeason} />
      </div>

      {/* Main Tabs: Pro / Solo Q */}
      <div className="flex gap-3 mb-8">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id)}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
              activeMainTab === tab.id
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/50'
                : 'bg-dark-card border border-dark-border hover:border-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pro Section */}
      {activeMainTab === 'pro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRO_CATEGORIES.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`relative group bg-gradient-to-br ${category.color} border-2 ${category.borderColor} ${category.hoverBorder} rounded-xl p-8 transition-all hover:scale-105 hover:shadow-2xl text-left overflow-hidden`}
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />

                  {/* Icon */}
                  <div className="relative z-10 mb-4">
                    <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Icon size={32} className="text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="font-display text-2xl font-bold mb-2 text-white">
                      {category.label}
                    </h3>
                    <p className="text-gray-300 text-sm">{category.description}</p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Solo Q Section (placeholder) */}
      {activeMainTab === 'soloq' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-dark-border rounded-lg p-12 text-center"
        >
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="font-display text-2xl font-bold mb-2">Solo Queue</h3>
          <p className="text-gray-400">
            Les statistiques Solo Queue seront disponibles bientôt !
          </p>
        </motion.div>
      )}

      {/* Info Box */}
      {!isSupabaseConfigured && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
        >
          <h4 className="font-semibold mb-2 text-yellow-500">⚠️ Mode démo</h4>
          <p className="text-sm text-gray-300">
            Supabase n'est pas configuré. Configurez Supabase pour accéder aux statistiques complètes.
          </p>
        </motion.div>
      )}
    </div>
  );
};
