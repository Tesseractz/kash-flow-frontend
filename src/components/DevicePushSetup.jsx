import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { BellRing, Smartphone } from 'lucide-react'
import { Button } from './ui/Button'
import { PushAPI } from '../api/client'
import { ensurePushSubscription, subscriptionToPayload } from '../lib/push'

export default function DevicePushSetup({ enabled }) {
  const [busy, setBusy] = useState(false)

  const permission = useMemo(() => {
    try {
      return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    } catch (_) {
      return 'unsupported'
    }
  }, [])

  if (!enabled) return null

  const canUsePush =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof Notification !== 'undefined' &&
    'PushManager' in window

  const label =
    permission === 'granted'
      ? 'Enable on this device'
      : permission === 'denied'
        ? 'Notifications blocked'
        : 'Enable notifications'

  async function handleEnable() {
    if (!canUsePush) {
      toast.error('Push notifications are not supported on this device/browser')
      return
    }
    if (permission === 'denied') {
      toast.error('Notifications are blocked. Enable them in your browser settings.')
      return
    }
    setBusy(true)
    try {
      const sub = await ensurePushSubscription()
      await PushAPI.subscribe(subscriptionToPayload(sub))
      const result = await PushAPI.test()
      if (result?.sent > 0) {
        toast.success('Notifications enabled. Test notification sent.')
      } else {
        toast.success('Notifications enabled for this device.')
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to enable notifications')
    } finally {
      setBusy(false)
    }
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
            Device notifications
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tap below to allow notifications. Your browser will show a permission popup.
          </p>
          <div className="mt-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={busy || permission === 'denied'}
            >
              {label}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

