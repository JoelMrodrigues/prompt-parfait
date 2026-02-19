// Ordre de draft mode tournoi
export const DRAFT_PHASES = [
  // Phase Ban 1
  { phase: 'ban', team: 'blue', position: 1, label: 'Ban B1' },
  { phase: 'ban', team: 'red', position: 1, label: 'Ban R1' },
  { phase: 'ban', team: 'blue', position: 2, label: 'Ban B2' },
  { phase: 'ban', team: 'red', position: 2, label: 'Ban R2' },
  { phase: 'ban', team: 'blue', position: 3, label: 'Ban B3' },
  { phase: 'ban', team: 'red', position: 3, label: 'Ban R3' },

  // Phase Pick 1
  { phase: 'pick', team: 'blue', position: 1, label: 'Pick B1' },
  { phase: 'pick', team: 'red', position: 1, label: 'Pick R1' },
  { phase: 'pick', team: 'red', position: 2, label: 'Pick R2' },
  { phase: 'pick', team: 'blue', position: 2, label: 'Pick B2' },
  { phase: 'pick', team: 'blue', position: 3, label: 'Pick B3' },
  { phase: 'pick', team: 'red', position: 3, label: 'Pick R3' },

  // Phase Ban 2
  { phase: 'ban', team: 'red', position: 4, label: 'Ban R4' },
  { phase: 'ban', team: 'blue', position: 4, label: 'Ban B4' },
  { phase: 'ban', team: 'red', position: 5, label: 'Ban R5' },
  { phase: 'ban', team: 'blue', position: 5, label: 'Ban B5' },

  // Phase Pick 2
  { phase: 'pick', team: 'red', position: 4, label: 'Pick R4' },
  { phase: 'pick', team: 'blue', position: 4, label: 'Pick B4' },
  { phase: 'pick', team: 'blue', position: 5, label: 'Pick B5' },
  { phase: 'pick', team: 'red', position: 5, label: 'Pick R5' },
]

export const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support']
