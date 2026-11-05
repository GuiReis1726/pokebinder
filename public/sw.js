// Service worker do PokéBinder: guarda a app no aparelho para abrir depressa e funcionar sem rede.
// Pedidos a outros sites (Supabase, TCGdex…) passam sempre direto e nunca são guardados aqui.
const CACHE = 'pokebinder-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return
  if (req.mode === 'navigate') { // a página: rede primeiro (apanha versões novas), cache se estiver offline
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return res })
        .catch(() => caches.match('./'))
    )
    return
  }
  e.respondWith( // ficheiros da app (têm o nome com versão): cache primeiro
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    }))
  )
})
