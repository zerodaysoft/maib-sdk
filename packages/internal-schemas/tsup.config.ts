import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.base";

// Root-level copies of subpath entries (schemas-builder, test-helpers) are
// produced by `scripts/copy-root-subpaths.mjs`, which runs after tsup exits
// so that both the JS and DTS pipelines have finished writing to `dist/`.
// Doing the copy inside tsup's `onSuccess` is racy: that hook fires after
// the JS build but before the DTS child process completes.
export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts", "src/schemas-builder.ts", "src/test-helpers.ts"],
  dts: true,
});
