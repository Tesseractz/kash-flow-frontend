import { PushAPI } from '../api/client'

/** True when running inside the Capacitor native shell (iOS/Android app). */
function isCapacitorNative() {
  if (typeof window === 'undefined') return false
  const cap = window.Capacitor
  if (cap && typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  return !!cap?.isNative
}

/** True when running inside the Electron desktop shell. */
function isElectron() {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron')) {
    return true
  }
  return typeof window.process === 'object' && window.process?.versions?.electron != null
}

/**
 * True when Web Push + Notifications API can be used.
 *
 * Returns false in Capacitor WebViews (no FCM/APNs wiring exists yet) and in
 * Electron (Chromium's push service is disabled), even though the browser
 * APIs technically exist — so we don't show users a button that lies.
 */
export function isPushSupported() {
  if (typeof window === 'undefined') return false
  if (isCapacitorNative() || isElectron()) return false
  return (
    'serviceWorker' in navigator &&
    typeof Notification !== 'undefined' &&
    'PushManager' in window
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser')
  }
  if (!('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const { public_key } = await PushAPI.vapidPublicKey()
  const appServerKey = urlBase64ToUint8Array(public_key)
  return await reg.pushManager.subscribe({
    userVisibleOnly: true,
    appServerKey,
  })
}

export function subscriptionToPayload(subscription) {
  const json = subscription.toJSON()
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  }
}

/**
 * Request OS notification permission (if needed), subscribe with VAPID, register endpoint on the server.
 * Call after a user gesture (button click) so the browser shows the permission prompt.
 */
export async function enrollPushNotifications() {
  const sub = await ensurePushSubscription()
  await PushAPI.subscribe(subscriptionToPayload(sub))
  return sub
}

