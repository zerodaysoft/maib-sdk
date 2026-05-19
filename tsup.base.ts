import type { Options } from "tsup";

export const baseConfig: Options = {
  format: ["cjs", "esm"],
  dts: { resolve: [/^@maib\/internal-schemas(\/.+)?$/] },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  external: ["zod"],
};
