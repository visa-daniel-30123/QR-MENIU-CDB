self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || "./admin.html");
      }
      return undefined;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_ORDER_NOTIFICATION") return;

  const { title, options } = event.data;
  event.waitUntil(self.registration.showNotification(title, options));
});
