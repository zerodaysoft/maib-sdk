import type { Options } from "tsup";

export const baseConfig: Options = {
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
};
