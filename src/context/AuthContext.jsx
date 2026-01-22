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

  const fetchProfile = async (currentSession = null) => {
    const sessionToUse = currentSession || session
    if (!sessionToUse?.user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    try {
      setProfileLoading(true)
      console.log('[AuthContext] Fetching profile...')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      )
      
      const data = await Promise.race([
        ProfileAPI.get(),
        timeoutPromise
      ])
      
      console.log('[AuthContext] Profile fetched:', data)
      setProfile(data)
    } catch (error) {
      console.error('[AuthContext] Failed to fetch profile:', error)
      console.error('[AuthContext] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      })
      // Don't set profile to null on error - keep previous value if exists
      // This allows app to work even if profile fetch fails
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log('[AuthContext] Loading session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[AuthContext] Session loaded:', { hasSession: !!session, hasUser: !!session?.user, error })
        
        if (error) {
          console.error('[AuthContext] Session error:', error)
        }
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)  // Always set loading to false, even if profile fetch fails
        
        if (session?.user) {
          console.log('[AuthContext] User found, fetching profile...')
          // Fetch profile in background - don't await, don't block
          fetchProfile(session).catch(err => {
            console.error('[AuthContext] Background profile fetch failed:', err)
          })
        } else {
          console.log('[AuthContext] No user in session')
        }
      } catch (error) {
        console.error('[AuthContext] Error loading session:', error)
        setLoading(false)  // Always complete loading
      }
    }
    
    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        console.log('[AuthContext] Auth state changed:', { event: _event, hasSession: !!session, hasUser: !!session?.user })
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)  // Always set loading to false
        if (session?.user) {
          console.log('[AuthContext] User in state change, fetching profile...')
          // Fetch profile in background
          fetchProfile(session).catch(err => {
            console.error('[AuthContext] Background profile fetch failed:', err)
          })
        } else {
          console.log('[AuthContext] No user in state change')
          setProfile(null)
          setProfileLoading(false)
        }
      } catch (error) {
        console.error('[AuthContext] Error in auth state change:', error)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    loading: loading,  // Don't block on profile loading - profile can load in background
    profileLoading,  // Expose separately so components can show profile loading state
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
