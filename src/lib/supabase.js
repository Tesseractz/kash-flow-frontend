import { createClient } from '@supabase/supabase-js'

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
