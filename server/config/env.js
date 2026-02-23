/**
 * Chargement des variables d'environnement depuis les fichiers .env
 * Cherche dans server/.env, ./server/.env et ./.env (racine)
 */
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function loadServerEnv() {
  const paths = [
    resolve(__dirname, '..', '.env'),          // server/.env
    resolve(process.cwd(), 'server', '.env'),  // ./server/.env
    resolve(process.cwd(), '.env'),            // ./.env
  ]

  for (const p of paths) {
    if (!existsSync(p)) continue
    try {
      let raw = readFileSync(p, 'utf8')
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1) // BOM UTF-8
      let count = 0
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
        if (m) {
          const key = m[1].trim()
          const val = m[2].trim().replace(/^["']|["']$/g, '').replace(/\s+$/, '')
          // Ne pas écraser une variable déjà définie (ex. Railway)
          const existing = String(process.env[key] || '').trim()
          if (key && val && !existing) {
            process.env[key] = val
            count++
          }
        }
      }
      if (count > 0) return
    } catch (_) {}
  }
}

export function resolveRiotApiKey() {
  // Fallback : VITE_RIOT_API_KEY peut servir de RIOT_API_KEY en local
  if (!process.env.RIOT_API_KEY?.trim() && process.env.VITE_RIOT_API_KEY?.trim()) {
    process.env.RIOT_API_KEY = process.env.VITE_RIOT_API_KEY.trim()
  }

  // Dernier fallback : lire VITE_RIOT_API_KEY depuis la racine du projet
  if (!process.env.RIOT_API_KEY?.trim()) {
    const rootEnv = resolve(__dirname, '..', '..', '.env')
    if (existsSync(rootEnv)) {
      try {
        const raw = readFileSync(rootEnv, 'utf8')
        const m = raw.match(/VITE_RIOT_API_KEY\s*=\s*([^\r\n]+)/)
        if (m?.[1]?.trim()) {
          process.env.RIOT_API_KEY = m[1].trim().replace(/^["']|["']$/g, '')
        }
      } catch (_) {}
    }
  }
}
