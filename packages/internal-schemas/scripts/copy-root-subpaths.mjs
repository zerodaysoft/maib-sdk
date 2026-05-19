import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Names that consumers reach via subpath imports. Each one is copied to the
// package root after build so that the legacy `resolve` lib used by tsup's
// dts pipeline (it doesn't understand `package.json#exports`) can find them
// at `node_modules/@maib/internal-schemas/<name>.{d.ts,js,…}`.
const ROOT_SUBPATHS = ["schemas-builder", "test-helpers"];
const EXTS = ["d.ts", "d.cts", "js", "cjs"];

for (const name of ROOT_SUBPATHS) {
  for (const ext of EXTS) {
    copyFileSync(resolve(pkgRoot, "dist", `${name}.${ext}`), resolve(pkgRoot, `${name}.${ext}`));
  }
}
