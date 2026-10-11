/*
 * Spegne il service worker del vecchio sito (vite-plugin-pwa registrava /sw.js con scope "/").
 * Chi aveva aperto il vecchio sito si vedeva servire la sua copia salvata nel browser anche dopo il passaggio:
 * il browser scarica questo file al posto del vecchio, che svuota le cache, si disinstalla e ricarica le pagine aperte.
 * Il sito nuovo non usa service worker.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) await caches.delete(k);
      await self.registration.unregister();
      for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
    })(),
  );
});
