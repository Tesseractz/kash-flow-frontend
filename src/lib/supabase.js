import { createClient } from '@supabase/supabase-js'
import { parseAuthFragment } from './authFragment'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (import.meta.env.DEV) {
  console.log('[Supabase] URL configured:', !!url)
  console.log('[Supabase] Anon key configured:', !!anon)
}

if (!import.meta.env.DEV && (!url || !anon)) {
  console.error(
    '[KashPoint] Supabase is not configured. Set in Netlify: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Login will not work until you redeploy.'
  )
}

// A recovery link arrives as `#access_token=...&type=recovery`. supabase-js
// consumes that fragment while the client initialises and rewrites the address
// bar, so any component that reads window.location.hash from an effect finds it
// already empty — which is why the reset link used to just sign the user in.
// Read it here, at import time, before createClient can strip it.
const initialFragment = parseAuthFragment(
  typeof window !== 'undefined' ? window.location.hash : ''
)

export const recoveryInUrl = initialFragment.isRecovery
export const confirmedInUrl = initialFragment.isConfirmation
// An expired or already-used link comes back as an error in the same fragment.
// Without this the page silently falls through to the sign-in form and the user
// has no idea why nothing happened.
export const authErrorInUrl = initialFragment.error

export const supabase = (url && anon)
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        signInWithPassword: async () => ({ error: new Error('Supabase env vars missing - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY') }),
        signUp: async () => ({ error: new Error('Supabase env vars missing - check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY') }),
        signOut: async () => ({}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    }

export const isSupabaseConfigured = !!(url && anon)
