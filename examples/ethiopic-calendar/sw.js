// Service worker: makes the calendar installable and fully usable offline.
// Strategy: precache the whole app on install, then serve its files from cache while
// refreshing it in the background (stale-while-revalidate), so a new deploy
// shows up on the next launch. Bump VERSION when the file list changes.
const VERSION = "v2";
const CACHE = `ethcal-${VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "src/app.js",
  "src/model.js",
  "lib/index.js",
  "lib/calendar.js",
  "lib/jdn.js",
  "lib/fiscal.js",
  "lib/fiscal-convention.js",
  "lib/numerals.js",
  "lib/equivalence.js",
  "lib/equivalence-classes.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ethcal-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Only the calendar's own files are handled; anything else on the site (e.g. the
// Ledger demo at /ledger/, or the /calendar/ redirect) goes straight to the network.
const SCOPE = new URL(self.registration.scope).pathname;
const OWN = new Set(PRECACHE.map((p) => new URL(p, self.registration.scope).pathname));
OWN.add(SCOPE + "index.html");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !OWN.has(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Page loads (with or without a query string) are all served by index.html.
      const key = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return (await network) || Response.error();
    }),
  );
});
