/**
 * Page principale du Draft Simulator
 * Orchestration uniquement - logique dans les hooks
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { InitModal } from './components/InitModal'
import { ChampionSelectModal } from './components/ChampionSelectModal'
import { TeamSide } from './components/TeamSide'
import { DemoWarning } from '../../components/common/DemoWarning'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useDraft } from './hooks/useDraft'
import { useChampions } from './hooks/useChampions'
import { DRAFT_PHASES } from '../../lib/draftPhases'

export const Draft = () => {
  const { champions, loading: loadingChampions, error: championsError } = useChampions()
  const [showInitModal, setShowInitModal] = useState(true)
  const [showChampionSelect, setShowChampionSelect] = useState(false)
  const [config, setConfig] = useState({ side: 'blue', skipBans: false })

  const {
    currentPhase,
    currentPhaseIndex,
    isDraftComplete,
    bluePicks,
    redPicks,
    blueBans,
    redBans,
    bannedChampions,
    pickedChampions,
    selectChampion,
    undoLast,
    resetDraft,
  } = useDraft(config)

  const handleStartDraft = (draftConfig) => {
    setConfig(draftConfig)
    setShowInitModal(false)
  }

  const handleChampionSelect = (champion) => {
    selectChampion(champion)
    setShowChampionSelect(false)
  }

  // Loading state
  if (loadingChampions) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des champions...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (championsError) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="bg-dark-card border border-red-500 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-red-500">Erreur</h2>
          <p className="text-gray-400 mb-6">{championsError}</p>
          <Link
            to="/"
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors inline-block"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  if (showInitModal) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <InitModal onStart={handleStartDraft} onClose={() => {}} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      {!isSupabaseConfigured && <DemoWarning />}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Retour au menu</span>
        </Link>

        <div className="flex gap-3">
          <button
            onClick={undoLast}
            disabled={currentPhaseIndex === 0}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={resetDraft}
            className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-red-500 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Draft Interface */}
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6 items-start">
          {/* Blue Side */}
          <TeamSide
            team="blue"
            picks={bluePicks}
            bans={blueBans}
            isActive={currentPhase?.team === 'blue' && !isDraftComplete}
          />

          {/* Center - Phase Indicator */}
          <div className="w-64 flex flex-col items-center justify-center space-y-4">
            {!isDraftComplete ? (
              <>
                <motion.button
                  onClick={() => setShowChampionSelect(true)}
                  className={`w-full py-4 px-6 rounded-lg font-display text-xl font-bold transition-all border-2 ${
                    currentPhase.team === 'blue'
                      ? 'bg-accent-blue/20 border-accent-blue text-accent-blue glow-blue hover:scale-105'
                      : 'bg-red-500/20 border-red-500 text-red-500 hover:scale-105'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.5)',
                      '0 0 40px rgba(59, 130, 246, 0.8)',
                      '0 0 20px rgba(59, 130, 246, 0.5)',
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {currentPhase.label}
                </motion.button>
                <div className="text-center">
                  <div className="text-sm text-gray-400">
                    Phase {currentPhaseIndex + 1} / {DRAFT_PHASES.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPhase.phase === 'ban' ? 'Phase de Ban' : 'Phase de Pick'}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-accent-gold mb-2">
                  Draft Terminée !
                </h2>
                <p className="text-gray-400">Bonne chance sur la faille !</p>
              </div>
            )}
          </div>

          {/* Red Side */}
          <TeamSide
            team="red"
            picks={redPicks}
            bans={redBans}
            isActive={currentPhase?.team === 'red' && !isDraftComplete}
          />
        </div>
      </div>

      {/* Champion Select Modal */}
      {showChampionSelect && (
        <ChampionSelectModal
          champions={champions}
          onSelect={handleChampionSelect}
          onClose={() => setShowChampionSelect(false)}
          bannedChampions={bannedChampions}
          pickedChampions={pickedChampions}
        />
      )}
    </div>
  )
}
