const CACHE_NAME = "batrachka-v26";
const STATIC_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./apple-touch-icon.png",
  "./favicon-512x512.png",
  "./logo.png",
  "./green-sound.mp3",
  "./admin-enter-sound.mp3",
  "./admin-update-sound.mp3",
  "./admin-kick-sound.mp3",
  "./photo-notify.mp3",
  "./photo-delete-sound.mp3"
];

// Установка: кешируем все статические файлы
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_FILES).catch(function (err) {
        console.error("SW: cache addAll failed", err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Активация: удаляем старые кеши
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Fetch: стратегия "сеть сначала, кеш как fallback" для навигации,
// "кеш сначала" для статики
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  
  // Supabase API — только сеть
  if (url.origin.includes("supabase.co") || url.origin.includes("jsdelivr.net")) return;
  
  // Навигация (HTML) — сеть сначала, кеш как fallback (offline)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        return response;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) {
          return r || new Response(
            '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batrachka</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:2rem}h1{font-size:1.5rem;margin-bottom:1rem;opacity:0.8}p{color:#999}svg{width:48px;height:48px;margin-bottom:1rem;opacity:0.5}</style></head><body><div><h1>Нет соединения с интернетом</h1><p>Приложение загрузится, когда появится сеть</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
    );
    return;
  }
  
  // Статика — кеш сначала, сеть как обновление
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || fetched;
    })
  );
});
