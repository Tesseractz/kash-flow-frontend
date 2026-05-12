import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { BellRing, Smartphone } from 'lucide-react'
import { Button } from './ui/Button'
import { PushAPI, PrivacyAPI } from '../api/client'
import { enrollPushNotifications, isPushSupported } from '../lib/push'
import { enrollNativePush, isNativePushSupported } from '../lib/nativePush'
import { isCapacitorNative } from '../lib/platform'

function readPermission() {
  try {
    return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  } catch (_) {
    return 'unsupported'
  }
}

/**
 * Lets the user grant OS notification permission and register the device.
 * Web browsers go through Web Push (VAPID); Capacitor mobile apps go through
 * @capacitor/push-notifications (FCM on Android, APNs on iOS).
 * Successful enroll also flips push_notifications_enabled in privacy settings.
 */
export default function DevicePushSetup() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(readPermission)
  const [nativeRegistered, setNativeRegistered] = useState(false)

  useEffect(() => {
    const sync = () => setPermission(readPermission())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  const onNative = isCapacitorNative()
  const canUseWeb = typeof window !== 'undefined' && isPushSupported()
  const canUseNative = onNative && isNativePushSupported()
  const canEnroll = canUseWeb || canUseNative

  const effectivePermission = onNative
    ? (nativeRegistered ? 'granted' : 'default')
    : permission

  const label =
    effectivePermission === 'granted'
      ? 'Registered on this device'
      : effectivePermission === 'denied'
        ? 'Notifications blocked'
        : 'Allow system notifications'

  const handleEnable = useCallback(async () => {
    if (!canEnroll) {
      const msg = onNative
        ? 'Native push isn\'t set up on this build. See mobile/MOBILE_PUSH.md.'
        : 'Push notifications are not supported on this device/browser'
      toast.error(msg)
      return
    }
    if (!onNative && permission === 'denied') {
      toast.error('Notifications are blocked. Enable them in your browser or OS settings for this site.')
      return
    }
    setBusy(true)
    try {
      if (onNative) {
        await enrollNativePush()
        setNativeRegistered(true)
      } else {
        await enrollPushNotifications()
      }
      await PrivacyAPI.updateSettings({ push_notifications_enabled: true })
      await qc.invalidateQueries({ queryKey: ['privacy-settings'] })
      if (!onNative) setPermission(readPermission())
      try {
        const result = onNative ? await PushAPI.fcmTest() : await PushAPI.test()
        if ((result?.sent ?? 0) > 0) {
          toast.success('Check for a system notification — KashPoint sent a test.')
        } else {
          toast.success('This device is registered.')
        }
      } catch (_) {
        toast.success('Device registered for notifications.')
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Failed to enable notifications'
      toast.error(typeof msg === 'string' ? msg : 'Failed to enable notifications')
      if (!onNative) setPermission(readPermission())
    } finally {
      setBusy(false)
    }
  }, [canEnroll, onNative, permission, qc])

  if (!canEnroll) {
    return (
      <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400">
        {onNative
          ? "Native push isn't wired into this mobile build yet. See mobile/MOBILE_PUSH.md to enable."
          : 'System notifications are not available in this browser. Use a recent Chrome, Edge, or Firefox on desktop or Android, and ensure the app is served over HTTPS (or localhost for development).'}
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
              disabled={busy || effectivePermission === 'denied'}
              variant={effectivePermission === 'granted' ? 'secondary' : 'primary'}
            >
              {busy ? 'Working…' : label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
