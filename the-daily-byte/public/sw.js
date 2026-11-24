// Service worker mínimo: deixa o app instalável. Não guarda nada em cache,
// então o painel sempre mostra a edição mais recente.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
