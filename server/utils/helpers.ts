/** Pause asynchrone — utilisée pour espacer les appels Riot API */
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
