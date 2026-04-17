import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Si les vraies clés ne sont pas configurées, créer un client factice
export const supabase =
  supabaseUrl === 'https://placeholder.supabase.co'
    ? null
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      })

export const isSupabaseConfigured = supabase !== null

/**
 * Normalise une URL de logo Supabase Storage pour s'assurer qu'elle utilise
 * le chemin public (/object/public/...). Corrige les anciennes URLs stockées
 * sans /public/ dans le chemin.
 */
export function normalizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('/storage/v1/object/') && !url.includes('/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/')
  }
  return url
}

/**
 * Ping de warmup — envoie une requête ultra-légère dès le chargement du module.
 * Supabase/PostgREST a un cold start de ~10s sur la première connexion.
 * Ce ping initialise la connexion TLS + le pool avant que l'utilisateur
 * ne déclenche une vraie requête, éliminant ce délai perceptible.
 */
if (supabase) {
  supabase.from('profiles').select('id').limit(1).then(() => {}, () => {})
}
