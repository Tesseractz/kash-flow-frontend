import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { BellRing, Smartphone } from 'lucide-react'
import { Button } from './ui/Button'
import { PushAPI, PrivacyAPI } from '../api/client'
import { enrollPushNotifications, isPushSupported } from '../lib/push'

function readPermission() {
  try {
    return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  } catch (_) {
    return 'unsupported'
  }
}

/**
 * Lets the user grant OS (browser) notification permission and register the device for Web Push.
 * Not gated on privacy "Push" toggle — successful enroll also sets push_notifications_enabled in privacy settings.
 */
export default function DevicePushSetup() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(readPermission)

  useEffect(() => {
    const sync = () => setPermission(readPermission())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  const canUsePush = typeof window !== 'undefined' && isPushSupported()

  const label =
    permission === 'granted'
      ? 'Registered on this device'
      : permission === 'denied'
        ? 'Notifications blocked'
        : 'Allow system notifications'

  const handleEnable = useCallback(async () => {
    if (!canUsePush) {
      toast.error('Push notifications are not supported on this device/browser')
      return
    }
    if (permission === 'denied') {
      toast.error('Notifications are blocked. Enable them in your browser or OS settings for this site.')
      return
    }
    setBusy(true)
    try {
      await enrollPushNotifications()
      await PrivacyAPI.updateSettings({ push_notifications_enabled: true })
      await qc.invalidateQueries({ queryKey: ['privacy-settings'] })
      setPermission(readPermission())
      try {
        const result = await PushAPI.test()
        if (result?.sent > 0) {
          toast.success('Check for a system notification — KashPoint sent a test.')
        } else {
          toast.success('This device is registered. Open the app on another device or check notification settings.')
        }
      } catch (_) {
        toast.success('Device registered for notifications.')
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to enable notifications'
      toast.error(typeof msg === 'string' ? msg : 'Failed to enable notifications')
      setPermission(readPermission())
    } finally {
      setBusy(false)
    }
  }, [canUsePush, permission, qc])

  if (!canUsePush) {
    return (
      <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400">
        System notifications are not available in this browser. Use a recent Chrome, Edge, or Firefox on desktop or
        Android, and ensure the app is served over HTTPS (or localhost for development).
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            System & device notifications
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Shows alerts in your operating system notification area (not only inside KashPoint). Tap below — your
            browser will ask for permission.
          </p>
          <div className="mt-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={busy || permission === 'denied'}
              variant={permission === 'granted' ? 'secondary' : 'primary'}
            >
              {busy ? 'Working…' : label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
