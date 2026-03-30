/* Web Push service worker for KashPoint */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try {
      data = { body: event.data?.text?.() };
    } catch (_) {
      data = {};
    }
  }

  const title = data.title || "KashPoint";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo.svg",
    badge: data.badge || "/logo.svg",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = allClients.find((c) => c.url.includes(url));
      if (existing) {
        await existing.focus();
        return;
      }
      await clients.openWindow(url);
    })()
  );
});

