import { baseConfig } from "../../tsup.base";
import { defineConfig } from "tsup";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts", "src/schemas-builder.ts"],
});
