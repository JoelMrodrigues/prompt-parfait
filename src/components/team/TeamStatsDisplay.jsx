import { motion } from 'framer-motion'

export const TeamStatsDisplay = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-center text-gray-400">
        Aucune statistique disponible. Importez un fichier JSON avec les stats de votre équipe.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Générales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6"
      >
        <h3 className="font-display text-xl font-bold mb-4">Statistiques Générales</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Winrate</div>
            <div className="text-2xl font-bold text-accent-blue">{stats.winrate || 'N/A'}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Durée moyenne</div>
            <div className="text-2xl font-bold">{stats.avg_game_duration || 'N/A'} min</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Région</div>
            <div className="text-2xl font-bold">{stats.region || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Matchs joués</div>
            <div className="text-2xl font-bold">{stats.total_games || 'N/A'}</div>
          </div>
        </div>
      </motion.div>

      {/* Derniers Matchs */}
      {stats.recent_matches && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-card border border-dark-border rounded-lg p-6"
        >
          <h3 className="font-display text-xl font-bold mb-4">Derniers Matchs</h3>
          <div className="space-y-2">
            {stats.recent_matches.map((match, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <div className="flex-1">
                  <span className={`font-semibold ${match.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                    {match.result === 'win' ? 'Victoire' : 'Défaite'}
                  </span>
                  <span className="text-gray-400 ml-2">{match.duration} min</span>
                </div>
                <div className="flex gap-1">
                  {match.champions?.map((champ, i) => (
                    <img
                      key={i}
                      src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champ}.png`}
                      alt={champ}
                      className="w-8 h-8 rounded"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Détaillées */}
      {stats.detailed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="font-display text-lg font-bold mb-4">Économie & Aggression</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Gold/min</span>
                <span className="font-semibold">{stats.detailed.economy?.gold_per_min || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Kills/mort</span>
                <span className="font-semibold">{stats.detailed.aggression?.kills_per_death || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">First Blood %</span>
                <span className="font-semibold">{stats.detailed.aggression?.first_blood_rate || 'N/A'}%</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="font-display text-lg font-bold mb-4">Objectifs & Vision</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Baron control</span>
                <span className="font-semibold">{stats.detailed.objectives?.baron_rate || 'N/A'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dragon priority</span>
                <span className="font-semibold">{stats.detailed.objectives?.dragon_rate || 'N/A'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vision score/min</span>
                <span className="font-semibold">{stats.detailed.vision?.score_per_min || 'N/A'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
