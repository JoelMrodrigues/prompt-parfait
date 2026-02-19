/**
 * Hook pour gérer la logique métier du draft
 */
import { useState, useCallback } from 'react'
import { DRAFT_PHASES } from '../../../lib/draftPhases'

export const useDraft = (config) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(
    config.skipBans ? DRAFT_PHASES.findIndex((p) => p.phase === 'pick') : 0
  )
  const [bluePicks, setBluePicks] = useState([])
  const [redPicks, setRedPicks] = useState([])
  const [blueBans, setBlueBans] = useState([])
  const [redBans, setRedBans] = useState([])

  const currentPhase = DRAFT_PHASES[currentPhaseIndex]
  const isDraftComplete = currentPhaseIndex >= DRAFT_PHASES.length
  const bannedChampions = [...blueBans.map((c) => c.id), ...redBans.map((c) => c.id)]
  const pickedChampions = [...bluePicks.map((c) => c.id), ...redPicks.map((c) => c.id)]

  const selectChampion = useCallback(
    (champion) => {
      if (currentPhase.phase === 'pick') {
        if (currentPhase.team === 'blue') {
          setBluePicks((prev) => [...prev, champion])
        } else {
          setRedPicks((prev) => [...prev, champion])
        }
      } else {
        if (currentPhase.team === 'blue') {
          setBlueBans((prev) => [...prev, champion])
        } else {
          setRedBans((prev) => [...prev, champion])
        }
      }

      // Passer à la phase suivante
      if (currentPhaseIndex < DRAFT_PHASES.length - 1) {
        let nextIndex = currentPhaseIndex + 1

        // Si on skip les bans, passer les phases de ban
        if (config.skipBans) {
          while (nextIndex < DRAFT_PHASES.length && DRAFT_PHASES[nextIndex].phase === 'ban') {
            nextIndex++
          }
        }

        setCurrentPhaseIndex(nextIndex)
      }
    },
    [currentPhase, currentPhaseIndex, config.skipBans]
  )

  const undoLast = useCallback(() => {
    if (currentPhaseIndex === 0) return

    let prevIndex = currentPhaseIndex - 1

    // Si on skip les bans, revenir à la phase de pick précédente
    if (config.skipBans) {
      while (prevIndex >= 0 && DRAFT_PHASES[prevIndex].phase === 'ban') {
        prevIndex--
      }
    }

    if (prevIndex < 0) return

    const prevPhase = DRAFT_PHASES[prevIndex]

    if (prevPhase.phase === 'pick') {
      if (prevPhase.team === 'blue') {
        setBluePicks((prev) => prev.slice(0, -1))
      } else {
        setRedPicks((prev) => prev.slice(0, -1))
      }
    } else {
      if (prevPhase.team === 'blue') {
        setBlueBans((prev) => prev.slice(0, -1))
      } else {
        setRedBans((prev) => prev.slice(0, -1))
      }
    }

    setCurrentPhaseIndex(prevIndex)
  }, [currentPhaseIndex, config.skipBans])

  const resetDraft = useCallback(() => {
    setCurrentPhaseIndex(config.skipBans ? DRAFT_PHASES.findIndex((p) => p.phase === 'pick') : 0)
    setBluePicks([])
    setRedPicks([])
    setBlueBans([])
    setRedBans([])
  }, [config.skipBans])

  return {
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
  }
}
