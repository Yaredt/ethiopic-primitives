/**
 * Copy the compiled package ESM into the Ethiopic Ledger demo's lib/ folder so the
 * static demo (examples/ethiopic-ledger) can import it directly. lib/ is a build
 * artifact (git-ignored); run this after `npm run build`. See feature 005 R4.
 */
import { mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "dist");
const dest = join(here, "..", "..", "examples", "ethiopic-ledger", "lib");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

let n = 0;
for (const f of readdirSync(src)) {
  if (f.endsWith(".js")) {
    copyFileSync(join(src, f), join(dest, f));
    n++;
  }
}
console.log(`copy-demo-lib: copied ${n} .js files -> ${dest}`);
