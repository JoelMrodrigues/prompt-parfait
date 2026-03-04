import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  const loadProfile = async (u: User) => {
    let p = await fetchProfile(u.id)
    if (!p) {
      // Créer le profil automatiquement avec le display_name déduit de l'email
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

    supabase!.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadProfile(u)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await loadProfile(u)
      } else {
        setProfile(null)
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
