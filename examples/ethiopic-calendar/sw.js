// Service worker: makes the calendar installable and fully usable offline.
// Strategy: precache the whole app on install, then serve its files from cache while
// refreshing it in the background (stale-while-revalidate), so a new deploy
// shows up on the next launch. The Pages deploy stamps VERSION with the commit, so every
// deploy installs a fresh copy; bump it by hand only for local testing.
const VERSION = "v5";
const CACHE = `ethcal-${VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "privacy.html",
  "styles.css",
  "manifest.webmanifest",
  "src/app.js",
  "src/model.js",
  "src/readings.js",
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
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: "reload" })))).then(() => self.skipWaiting()),
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
// The verse text (data/passages/NN.json, one file per month) is too big to precache: each
// month is cached the first time it is used, then served offline like the rest. Narration
// (data/audio/) is left to the network: browsers fetch audio in ranges, which a cache-first
// copy would break.
const own = (path) => OWN.has(path) || path.startsWith(SCOPE + "data/passages/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !own(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Page loads (with or without a query string) are all served by index.html.
      const key = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      // revalidate with the server (not the browser's HTTP cache), so a deploy shows up
      const network = fetch(req.mode === "navigate" ? req : new Request(req, { cache: "no-cache" }))
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
