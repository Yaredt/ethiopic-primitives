/**
 * Copy the compiled package ESM into each static demo's lib/ folder
 * (examples/ethiopic-ledger, examples/ethiopic-calendar) so it can import it
 * directly. lib/ is a build artifact (git-ignored); run this after `npm run build`.
 * See feature 005 R4.
 */
import { mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "dist");
const demos = ["ethiopic-ledger", "ethiopic-calendar"];

for (const demo of demos) {
  const dest = join(here, "..", "..", "examples", demo, "lib");
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
}
