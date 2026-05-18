import { readFileSync } from "node:fs";

import { baseConfig } from "../../tsup.base";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  define: { PKG_VERSION: JSON.stringify(version) },
});
