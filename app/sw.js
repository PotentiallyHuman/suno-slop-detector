/* sw.js — offline cache for Lyric Humanizer.
 * Cache-first: after the first load the whole app (incl. the trained model)
 * runs with no network at all. Bump CACHE when any asset below changes. */
var CACHE = "lyric-humanizer-v4-model";

var ASSETS = [
  ".",
  "index.html",
  "app.css",
  "app.js",
  "humanize.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-192-maskable.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "engine/slop-core.js",
  "engine/common_words.js",
  "engine/features.js",
  "engine/ext/patterns.browser.js",
  "engine/ext/tier3.browser.js",
  "engine/ext/perspectives.browser.js",
  "engine/ext/model.js",
  "engine/ext/clean-lyrics.js",
  "engine/ext/v2-engine.js",
  "engine/ext/v2-panel.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        // runtime-cache same-origin GETs so a missed asset is offline next time
        if (resp && resp.ok && new URL(e.request.url).origin === self.location.origin) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match("index.html"); });
    })
  );
});
