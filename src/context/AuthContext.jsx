import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ProfileAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = async () => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    try {
      setProfileLoading(true)
      const data = await ProfileAPI.get()
      setProfile(data)
    } catch (error) {
      console.error('[AuthContext] Failed to fetch profile:', error)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchProfile()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchProfile()
      } else {
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe?.()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const value = {
    user,
    session,
    loading: loading || profileLoading,
    profile,
    role: profile?.role || null,
    isAdmin: profile?.role === 'admin',
    signOut,
    isAuthenticated: !!user,
    refreshProfile: fetchProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
