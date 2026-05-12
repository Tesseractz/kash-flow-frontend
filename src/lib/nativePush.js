/**
 * Native push enrollment for the Capacitor mobile app (FCM on Android, APNs on iOS).
 *
 * Mirrors lib/push.js (which handles Web Push for browsers). Only one path
 * is wired at a time — DevicePushSetup chooses based on isCapacitorNative().
 *
 * For this to actually deliver notifications:
 *   - @capacitor/push-notifications must be installed (`npm install` in
 *     frontend/, then `npx cap sync` in mobile/), which registers
 *     `window.Capacitor.Plugins.PushNotifications`.
 *   - Firebase must be set up for the Android project (google-services.json
 *     under mobile/android/app/, FCM enabled in the Firebase console).
 *   - The backend must have FIREBASE_SERVICE_ACCOUNT_JSON env set.
 * See mobile/MOBILE_PUSH.md for the full setup.
 */
import { PushAPI } from '../api/client'
import { isCapacitorNative } from './platform'

function getPlugin() {
  if (typeof window === 'undefined') return null
  return window.Capacitor?.Plugins?.PushNotifications || null
}

/** True only when running on Capacitor AND the PushNotifications plugin is registered. */
export function isNativePushSupported() {
  return isCapacitorNative() && !!getPlugin()
}

function detectPlatform() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null
  const p = cap?.getPlatform ? cap.getPlatform() : null
  return p === 'ios' || p === 'android' ? p : 'android'
}

/**
 * Request OS permission, register with FCM/APNs, post the device token to the
 * backend, and resolve when the token has been stored.
 *
 * Must be called from a user gesture (button click) — Android 13+ shows the
 * permission prompt synchronously, iOS always does.
 */
export async function enrollNativePush() {
  const PushNotifications = getPlugin()
  if (!PushNotifications) {
    throw new Error(
      'Native push plugin not installed. Run `npm install @capacitor/push-notifications` in frontend/ and `npx cap sync` in mobile/.',
    )
  }

  const perm = await PushNotifications.requestPermissions()
  if (perm?.receive !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  return new Promise((resolve, reject) => {
    let regListener = null
    let errListener = null

    const cleanup = () => {
      try { regListener?.remove?.() } catch (_) {}
      try { errListener?.remove?.() } catch (_) {}
    }

    PushNotifications.addListener('registration', async (token) => {
      cleanup()
      try {
        const platform = detectPlatform()
        await PushAPI.fcmSubscribe({
          token: token?.value || String(token || ''),
          platform,
          device_info: navigator.userAgent || null,
        })
        resolve(token?.value || null)
      } catch (e) {
        reject(e)
      }
    }).then((h) => { regListener = h })

    PushNotifications.addListener('registrationError', (err) => {
      cleanup()
      reject(new Error(err?.error || 'FCM registration failed'))
    }).then((h) => { errListener = h })

    PushNotifications.register().catch((e) => {
      cleanup()
      reject(e)
    })
  })
}
