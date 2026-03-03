/**
 * Constantes partagées à travers tout le projet.
 * À importer depuis ici — ne pas redéfinir dans les fichiers consommateurs.
 */
import { getActiveBackendUrl } from './apiFetch'

// ─── Backend URL ───────────────────────────────────────────────────────────────
// Retourne toujours l'URL active (primary ou fallback si primary inaccessible)
export const getBackendUrl = () => getActiveBackendUrl()

// ─── Saison 16 (League of Legends S2025 Split 1) ──────────────────────────────
/** Timestamp MS du début de la saison 16 (08 janvier 2026 00:00:00 UTC) */
export const SEASON_16_START_MS = 1767830400000

// ─── Seuils de partie ─────────────────────────────────────────────────────────
/** Durée minimale en secondes pour qu'une partie soit considérée réelle (hors remake) */
export const REMAKE_THRESHOLD_SEC = 180

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20
export const MATCH_IDS_PAGE = 100
export const DETAILS_CHUNK = 20

// ─── Sync intervals ───────────────────────────────────────────────────────────
export const AUTOSYNC_LOOP_INTERVAL_MS = 3 * 60 * 1000   // 3 min
export const MOOD_SYNC_INTERVAL_MS = 2 * 60 * 1000        // 2 min
export const DELAY_BETWEEN_REQUESTS_MS = 2500
export const DELAY_BETWEEN_PLAYERS_MS = 3000
