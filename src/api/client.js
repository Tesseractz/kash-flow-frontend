import axios from 'axios'
import { supabase } from '../lib/supabase'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Attach Supabase access token to each request
api.interceptors.request.use(async (config) => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[API Client] Session error:', error.message)
    }
    const token = data.session?.access_token
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
      if (import.meta.env.DEV) {
        console.log('[API Client] Token attached:', token.substring(0, 20) + '...')
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('[API Client] No session token available')
      }
    }
  } catch (e) {
    console.error('[API Client] Error getting session:', e.message)
  }
  return config
})

// Helpers for endpoints
export const ProductsAPI = {
  list: (params) => api.get('/products', { params }).then(r => ({
    items: r.data,
    total: Number(r.headers?.['x-total-count'] || 0),
  })),
  create: (data) => api.post('/products', data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/products/${id}`).then(r => r.data),
}

export const SalesAPI = {
  list: () => api.get('/sales').then(r => r.data),
  create: (data) => api.post('/sales', data).then(r => r.data),
}

export const ReportsAPI = {
  get: (date) => api.get('/reports', { params: { date_utc: date } }).then(r => r.data),
  exportCSV: (date) => api.get('/reports/export', { 
    params: { date_utc: date },
    responseType: 'blob'
  }).then(r => r.data),
}

export const BillingAPI = {
  checkout: (plan) => api.post('/billing/checkout', { plan }).then(r => r.data),
  portal: () => api.post('/billing/portal').then(r => r.data),
  config: () => api.get('/billing/config').then(r => r.data),
}

export const PlanAPI = {
  get: () => api.get('/plan').then(r => r.data),
}

export const ProfileAPI = {
  get: () => api.get('/profile').then(r => r.data),
}

export const UsersAPI = {
  list: () => api.get('/users').then(r => r.data),
  invite: (data) => api.post('/users/invite', data).then(r => r.data),
  updateRole: (userId, role) => api.put(`/users/${userId}/role`, { role }).then(r => r.data),
  remove: (userId) => api.delete(`/users/${userId}`).then(r => r.data),
  getCredentials: (userId) => api.get(`/users/${userId}/credentials`).then(r => r.data),
}

export const AlertsAPI = {
  getLowStock: (threshold = 10) => api.get('/alerts/low-stock', { params: { threshold } }).then(r => r.data),
}

export const AuditAPI = {
  list: (limit = 50) => api.get('/audit-logs', { params: { limit } }).then(r => r.data),
}

export const AnalyticsAPI = {
  get: (days = 30) => api.get('/analytics', { params: { days } }).then(r => r.data),
}

export const NotificationsAPI = {
  status: () => api.get("/notifications/status").then((r) => r.data),
  sendLowStockAlert: (data) =>
    api.post("/notifications/low-stock", data).then((r) => r.data),
  sendDailySummary: (data) =>
    api.post("/notifications/daily-summary", data).then((r) => r.data),
  getSettings: () => api.get("/notifications/settings").then((r) => r.data),
  updateSettings: (data) =>
    api.put("/notifications/settings", data).then((r) => r.data),
  sendReceipt: (data) => api.post("/receipts/send", data).then((r) => r.data),
};

// Dev instrumentation: log request durations to help diagnose slowness
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    // attach start time for duration measurement
    config.metadata = { start: performance.now(), url: `${config.method?.toUpperCase()} ${config.baseURL}${config.url}` }
    return config
  })
  api.interceptors.response.use(
    (response) => {
      const meta = response.config.metadata
      if (meta?.start) {
        const ms = Math.round(performance.now() - meta.start)
        // eslint-disable-next-line no-console
        console.debug(`[API] ${meta.url} -> ${response.status} in ${ms}ms`)
      }
      return response
    },
    (error) => {
      const meta = error.config?.metadata
      if (meta?.start) {
        const ms = Math.round(performance.now() - meta.start)
        // eslint-disable-next-line no-console
        console.debug(`[API] ${meta.url} -> ERROR in ${ms}ms`, error.response?.status, error.message)
      }
      return Promise.reject(error)
    }
  )
}


