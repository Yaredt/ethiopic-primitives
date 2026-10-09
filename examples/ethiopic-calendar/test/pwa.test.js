// Checks the installable-app plumbing: the manifest is valid and its icons exist, and
// the service worker precaches exactly the files the app ships (so offline mode never
// misses a newly added file).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHIPPED = /\.(html|css|js|png|webmanifest)$/;
const NOT_SHIPPED = new Set(["sw.js", "package.json", "README.md"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "test" || name === "node_modules" ? [] : walk(p);
    return [relative(root, p)];
  });
}

function precacheList() {
  const src = readFileSync(join(root, "sw.js"), "utf8");
  const body = /const PRECACHE = \[([\s\S]*?)\];/.exec(src)[1];
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("manifest is valid JSON with installable fields and existing icons", () => {
  const m = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
  for (const k of ["name", "short_name", "start_url", "display", "icons"]) assert.ok(m[k], k);
  assert.equal(m.display, "standalone");
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), i.src);
});

test("every precached file exists", () => {
  for (const f of precacheList()) {
    if (f === "./") continue;
    assert.ok(existsSync(join(root, f)), `missing ${f}`);
  }
});

test("every shipped file is precached (offline mode is complete)", () => {
  const cached = new Set(precacheList());
  const shipped = walk(root).filter((f) => SHIPPED.test(f) && !NOT_SHIPPED.has(f));
  assert.ok(shipped.length > 10);
  for (const f of shipped) assert.ok(cached.has(f), `not precached: ${f}`);
});
