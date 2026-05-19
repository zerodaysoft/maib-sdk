import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.base";

const pkgRoot = dirname(fileURLToPath(import.meta.url));

// Names that consumers reach via subpath imports. Each one gets copied to the
// package root after build so that the legacy `resolve` lib used by tsup's
// dts pipeline (it doesn't understand `package.json#exports`) can find them
// at `node_modules/@maib/internal-schemas/<name>.{d.ts,js,…}`.
const ROOT_SUBPATHS = ["schemas-builder", "test-helpers"];

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts", "src/schemas-builder.ts", "src/test-helpers.ts"],
  dts: true,
  async onSuccess() {
    const exts = ["d.ts", "d.cts", "js", "cjs"] as const;
    for (const name of ROOT_SUBPATHS) {
      for (const ext of exts) {
        copyFileSync(
          resolve(pkgRoot, "dist", `${name}.${ext}`),
          resolve(pkgRoot, `${name}.${ext}`),
        );
      }
    }
  },
});
