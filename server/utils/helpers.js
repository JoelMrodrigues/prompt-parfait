/** Pause asynchrone — utilisée pour espacer les appels Riot API */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
