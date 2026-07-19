/* ── KN Weather Center — Service Worker ────────────────────────────────────────
   This service worker enables the page to be installed as a Progressive Web App
   (PWA) in Chrome and other browsers. It also provides basic offline caching so
   the app shell loads even without a network connection.

   HOW TO USE:
   1. Upload this file (sw.js) to the SAME directory as index.html
      on your web server.
   2. Ensure your site is served over HTTPS (Chrome requires this for PWA).
   3. Open the page in Chrome — you'll see an "Install" icon in the address bar,
      or go to menu → "Install KN Weather Center...".

   CACHE STRATEGY:
   - Network-first for the main page (always fetch fresh HTML when online,
     fall back to cache when offline).
   - Cache-first for static assets (fonts, CSS, JS from CDNs).
   - No caching for API calls (weather data should always be fresh).
   ──────────────────────────────────────────────────────────────────────────── */

var CACHE_NAME = 'kn-weather-v3';
var CACHE_URLS = [
  './',
  './index.html',
  './profile_picture.png'
];

/* Install — pre-cache the app shell */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS).catch(function(err) {
        console.warn('SW: Some cache URLs failed to pre-cache:', err.message);
      });
    })
  );
  self.skipWaiting();
});

/* Activate — clean up old caches */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

/* Fetch — network-first for navigation, cache-first for static assets,
   no caching for API calls (they need fresh data) */
self.addEventListener('fetch', function(event) {
  var req = event.request;

  /* Only handle GET requests */
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  /* Skip API calls — weather data should always be fetched fresh.
     This includes: api.weather.gov, api.open-meteo.com, aviationweather.gov,
     forecast.weather.gov, graphical.weather.gov, spc.noaa.gov, etc. */
  var isApiCall = (
    url.hostname.includes('api.') ||
    url.hostname.includes('forecast.weather.gov') ||
    url.hostname.includes('graphical.weather.gov') ||
    url.hostname.includes('aviationweather.gov') ||
    url.hostname.includes('spc.noaa.gov') ||
    url.hostname.includes('wpc.ncep.noaa.gov') ||
    url.hostname.includes('mag.ncep.noaa.gov') ||
    url.hostname.includes('weather.gov') ||
    url.hostname.includes('radar.weather.gov') ||
    url.hostname.includes('micamerasimages.net') ||
    url.hostname.includes('map.blitzortung.org') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('connect.facebook.net')
  );

  if (isApiCall) {
    /* For API calls, try network only (no caching) */
    event.respondWith(fetch(req).catch(function() {
      /* If offline, return a basic fallback response */
      return new Response('Offline — weather data unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    }));
    return;
  }

  /* For navigation requests (HTML pages), use network-first: try the network,
     fall back to cache if offline. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function(res) {
        /* Cache the fresh page */
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put('./', resClone);
        });
        return res;
      }).catch(function() {
        /* Offline — serve from cache */
        return caches.match('./').then(function(cached) {
          return cached || caches.match(req);
        });
      })
    );
    return;
  }

  /* For static assets (fonts, CSS, JS, images from CDNs), use cache-first:
     try cache first, fall back to network. */
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(res) {
        /* Only cache successful, same-origin or CORS-enabled responses */
        if (res.ok || res.type === 'opaque') {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, resClone);
          });
        }
        return res;
      }).catch(function() {
        /* Offline and not in cache — return nothing */
      });
    })
  );
});

/* Allow the page to trigger immediate updates when a new SW is available */
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
