import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.base.js";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  define: { PKG_VERSION: JSON.stringify(version) },
});
