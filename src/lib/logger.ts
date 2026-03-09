/**
 * Logger centralisé frontend
 * - En développement : tous les niveaux sont affichés
 * - En production   : seuls warn et error sont affichés (silence les logs verbeux des hooks de sync)
 *
 * Performance : perf.start(label) / perf.end(label) pour mesurer des opérations
 * → logs uniquement en DEV avec timing en ms
 * → perf.report() affiche un tableau récapitulatif dans la console
 */

const isDev = import.meta.env.DEV

export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.log(...args) },
  info:  (...args: unknown[]) => { if (isDev) console.log(...args) },
  warn:  (...args: unknown[]) => { console.warn(...args) },
  error: (...args: unknown[]) => { console.error(...args) },
}

// ─── Performance Tracker ──────────────────────────────────────────────────────

const _marks = new Map<string, number>()
const _history: Array<{ label: string; ms: number; ts: number }> = []

export const perf = {
  /** Démarre le chrono pour `label` */
  start: (label: string) => {
    if (!isDev) return
    _marks.set(label, performance.now())
  },

  /** Arrête le chrono pour `label`, log le résultat et le stocke */
  end: (label: string) => {
    if (!isDev) return
    const t0 = _marks.get(label)
    if (t0 == null) return
    const ms = Math.round(performance.now() - t0)
    _marks.delete(label)
    _history.push({ label, ms, ts: Date.now() })
    const color = ms > 2000 ? '#ff4d4d' : ms > 500 ? '#ffaa00' : '#4dff91'
    console.log(`%c⏱ [PERF] ${label} → ${ms}ms`, `color:${color}; font-weight:bold`)
  },

  /** Affiche un tableau trié par durée (les plus lentes en premier) */
  report: () => {
    if (!isDev || !_history.length) return
    const sorted = [..._history].sort((a, b) => b.ms - a.ms)
    console.groupCollapsed(`%c📊 Perf Report (${sorted.length} mesures)`, 'color:#a78bfa; font-weight:bold')
    console.table(sorted.map(({ label, ms }) => ({ Opération: label, 'Durée (ms)': ms })))
    console.groupEnd()
  },

  /** Vide l'historique */
  clear: () => { _history.length = 0 },
}
