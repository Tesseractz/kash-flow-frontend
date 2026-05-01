import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, X } from 'lucide-react'
import { Button } from './ui/Button'
import { PrivacyAPI, PushAPI } from '../api/client'
import { enrollPushNotifications, isPushSupported } from '../lib/push'

const SESSION_DISMISS_KEY = 'kashpoint_push_banner_dismissed'

export default function PushNotificationBanner() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'
    } catch (_) {
      return false
    }
  })

  const show = useMemo(() => {
    if (hidden) return false
    if (!isPushSupported()) return false
    try {
      return Notification.permission === 'default'
    } catch (_) {
      return false
    }
  }, [hidden])

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
    } catch (_) {}
    setHidden(true)
  }, [])

  const onEnable = useCallback(async () => {
    setBusy(true)
    try {
      await enrollPushNotifications()
      await PrivacyAPI.updateSettings({ push_notifications_enabled: true })
      await qc.invalidateQueries({ queryKey: ['privacy-settings'] })
      try {
        await PushAPI.test()
        toast.success('Notifications enabled — check for a system notification.')
      } catch (_) {
        toast.success('Notifications enabled for this device.')
      }
      setHidden(true)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not enable notifications'
      toast.error(typeof msg === 'string' ? msg : 'Could not enable notifications')
    } finally {
      setBusy(false)
    }
  }, [qc])

  if (!show) return null

  return (
    <div className="shrink-0 border-b border-blue-200 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/40 px-3 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 flex-shrink-0">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Enable system notifications
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Get low-stock and alerts in your OS notification area — even when this tab is in the background.
              Your browser will ask for permission next.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
          <Button size="sm" variant="primary" onClick={onEnable} disabled={busy}>
            {busy ? 'Opening…' : 'Allow notifications'}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-slate-500 hover:bg-blue-100/80 dark:hover:bg-slate-800"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
