/**
 * Page principale du Draft Simulator
 * Orchestration uniquement - logique dans les hooks
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Undo2 } from 'lucide-react'
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

  if (loadingChampions) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-blue mx-auto mb-4" />
          <p className="text-gray-400">Chargement des champions…</p>
        </div>
      </div>
    )
  }

  if (championsError) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="bg-dark-card border border-red-500 rounded-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-red-500">Erreur</h2>
          <p className="text-gray-400 mb-6">{championsError}</p>
          <Link to="/" className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors inline-block">
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

  const isBluePhase = currentPhase?.team === 'blue'

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {!isSupabaseConfigured && <DemoWarning />}

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-dark-card/80 backdrop-blur-md border-b border-dark-border shrink-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </Link>

        {/* Phase indicator — topbar center */}
        {!isDraftComplete && (
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isBluePhase ? 'text-accent-blue' : 'text-red-400'}`}>
              {isBluePhase ? 'Blue Side' : 'Red Side'}
            </span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-gray-400 text-xs">
              Phase {currentPhaseIndex + 1}/{DRAFT_PHASES.length} — {currentPhase?.phase === 'ban' ? 'Ban' : 'Pick'}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={undoLast}
            disabled={currentPhaseIndex === 0}
            title="Annuler le dernier choix"
            className="p-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={resetDraft}
            title="Recommencer"
            className="p-2 bg-dark-bg border border-dark-border rounded-lg hover:border-red-500/50 text-gray-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Draft Board */}
      <div className="flex-1 flex items-stretch gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Blue Side */}
        <TeamSide
          team="blue"
          picks={bluePicks}
          bans={blueBans}
          isActive={currentPhase?.team === 'blue' && !isDraftComplete}
        />

        {/* Center — action */}
        <div className="w-52 shrink-0 flex flex-col items-center justify-center gap-5">
          {!isDraftComplete ? (
            <>
              <motion.button
                onClick={() => setShowChampionSelect(true)}
                className={`w-full py-5 px-4 rounded-2xl font-display text-base font-bold transition-all border-2 flex flex-col items-center gap-1 cursor-pointer ${
                  isBluePhase
                    ? 'bg-accent-blue/15 border-accent-blue text-accent-blue hover:bg-accent-blue/25'
                    : 'bg-red-500/15 border-red-500 text-red-400 hover:bg-red-500/25'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: isBluePhase
                    ? ['0 0 16px rgba(147,51,234,0.3)', '0 0 32px rgba(147,51,234,0.6)', '0 0 16px rgba(147,51,234,0.3)']
                    : ['0 0 16px rgba(239,68,68,0.2)', '0 0 28px rgba(239,68,68,0.4)', '0 0 16px rgba(239,68,68,0.2)'],
                }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              >
                <span className="text-xs font-normal opacity-70 uppercase tracking-wider">
                  {currentPhase?.phase === 'ban' ? 'Bannir' : 'Choisir'}
                </span>
                <span className="text-base leading-tight text-center">{currentPhase?.label}</span>
              </motion.button>

              {/* Tracker bans */}
              <div className="w-full space-y-1.5">
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded border transition-all ${
                        i < blueBans.length
                          ? 'border-accent-blue/50 bg-accent-blue/25'
                          : 'border-dark-border'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded border transition-all ${
                        i < redBans.length
                          ? 'border-red-500/50 bg-red-500/25'
                          : 'border-dark-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="font-display text-xl font-bold text-accent-gold">Draft terminée !</div>
              <p className="text-gray-400 text-sm">Bonne chance sur la faille</p>
              <button
                onClick={resetDraft}
                className="px-4 py-2 text-sm bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue/50 transition-colors text-gray-300"
              >
                Nouvelle draft
              </button>
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

      {/* Champion Select Modal */}
      {showChampionSelect && (
        <ChampionSelectModal
          champions={champions}
          onSelect={handleChampionSelect}
          onClose={() => setShowChampionSelect(false)}
          bannedChampions={bannedChampions}
          pickedChampions={pickedChampions}
          currentPhase={currentPhase}
        />
      )}
    </div>
  )
}
