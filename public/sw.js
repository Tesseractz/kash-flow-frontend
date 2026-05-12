/* Web Push service worker for KashPoint
 *
 * Bump SW_VERSION every time this file changes shape — payload format,
 * notification options, click behaviour, etc. The constant doesn't do
 * anything by itself; it just forces the browser to see "byte-different
 * sw.js" so the update check picks up the new file.
 *
 * Updates propagate immediately:
 *   - main.jsx registers this with `updateViaCache: 'none'`, so the
 *     browser never serves a cached sw.js when checking for updates.
 *   - `skipWaiting()` activates the new SW without waiting for every
 *     tab to close.
 *   - `clients.claim()` lets the new SW handle existing tabs' push +
 *     notificationclick events without a reload.
 */
const SW_VERSION = "2026-05-12-1";

self.addEventListener("install", (event) => {
  // Skip the "waiting" state — replace the previous SW as soon as
  // this one finishes installing.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Take control of any clients (tabs) currently loaded without a SW
  // controller, so they get push/notificationclick handling immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try {
      data = { body: event.data && event.data.text ? event.data.text() : "" };
    } catch (_) {
      data = {};
    }
  }

  const title = data.title || "KashPoint";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo.svg",
    badge: data.badge || "/logo.svg",
    data: { url: data.url || "/", swVersion: SW_VERSION },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = allClients.find((c) => c.url.includes(url));
      if (existing) {
        await existing.focus();
        return;
      }
      await clients.openWindow(url);
    })(),
  );
});

// Allow the page to force-activate a new SW build (used by the in-app
// "reload to apply updates" banner if we ever add one).
self.addEventListener("message", (event) => {
  if (event && event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
