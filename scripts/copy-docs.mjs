/**
 * Copies the `docs/` directory from a package into `dist/docs/`
 * so documentation ships with the published npm package.
 *
 * Also copies the package README.md into `dist/docs/README.md`
 * as the entry-point document for LLMs and AI coding agents.
 *
 * Usage: node ../../scripts/copy-docs.mjs   (run from a package directory)
 */

import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const pkgDir = process.cwd();
const docsDir = join(pkgDir, "docs");
const distDocs = join(pkgDir, "dist", "docs");

// Always ensure dist/docs exists
mkdirSync(distDocs, { recursive: true });

// Copy README.md as the entry point
const readme = join(pkgDir, "README.md");
if (existsSync(readme)) {
  copyFileSync(readme, join(distDocs, "README.md"));
}

// Copy docs/ directory contents if it exists
if (existsSync(docsDir)) {
  cpSync(docsDir, distDocs, { recursive: true });
}
