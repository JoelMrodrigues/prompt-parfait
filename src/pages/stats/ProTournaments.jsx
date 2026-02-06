import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export const ProTournaments = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const season = searchParams.get('season') || 'S16';

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/stats')}
          className="p-2 hover:bg-dark-card rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-display text-4xl font-bold">Tournaments</h1>
          <p className="text-gray-400">Statistiques par tournoi - {season}</p>
        </div>
      </div>

      {/* Content - À remplir */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-lg p-12 text-center"
      >
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="font-display text-2xl font-bold mb-2">Stats Tournaments</h3>
        <p className="text-gray-400">
          Le tableau des stats par tournoi sera affiché ici.
        </p>
      </motion.div>
    </div>
  );
};
