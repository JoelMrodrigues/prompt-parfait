import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchProfile, upsertProfile, Profile } from '../services/supabase/profileQueries'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // Supabase fire SIGNED_IN during _recoverAndRefresh (before DB is ready), then INITIAL_SESSION.
  // We skip loadProfile for SIGNED_IN until INITIAL_SESSION confirms the client is ready.
  const initialSessionReceived = useRef(false)

  const loadProfile = async (u: User) => {
    let p = await fetchProfile(u.id)
    if (!p) {
      const defaultName = u.email?.split('@')[0] ?? 'Joueur'
      p = await upsertProfile(u.id, { display_name: defaultName })
    }
    setProfile(p)
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setLoading(false)
      return
    }

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)

      // Simple JWT refresh — profile unchanged
      if (event === 'TOKEN_REFRESHED') {
        setLoading(false)
        return
      }

      // SIGNED_IN fires during _recoverAndRefresh before the Supabase client is fully ready.
      // At that point DB queries hang. Wait for INITIAL_SESSION instead.
      if (event === 'SIGNED_IN' && !initialSessionReceived.current) {
        // Stay loading=true — INITIAL_SESSION will call loadProfile and setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        initialSessionReceived.current = true
      }

      try {
        if (u) {
          let timedOut = false
          await Promise.race([
            loadProfile(u),
            new Promise<void>((_, reject) =>
              setTimeout(() => { timedOut = true; reject(new Error('timeout')) }, 12000)
            ),
          ]).catch((err: unknown) => {
            if (timedOut) {
              // Timeout Supabase — profil minimal pour débloquer l'UI, sans bloquer le chargement
              setProfile({
                id: u.id,
                display_name: u.email?.split('@')[0] ?? 'Joueur',
                avatar_url: null,
                active_team_id: null,
                created_at: '',
                updated_at: '',
              })
            } else {
              throw err
            }
          })
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[AuthContext] loadProfile error:', err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase non configuré - Mode démo' } }
    }
    return supabase!.auth.signInWithPassword({ email, password })
  }

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase non configuré - Mode démo' } }
    }
    return supabase!.auth.signUp({ email, password })
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await supabase!.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
