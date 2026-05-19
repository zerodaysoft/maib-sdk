import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the repo root — every fixture spawns build-schemas.mjs via this.
export const REPO_ROOT = resolve(__dirname, "../../../..");
export const BUILD_SCHEMAS = join(REPO_ROOT, "scripts", "build-schemas.mjs");

/** Layout describing a synthetic package to run build-schemas.mjs against. */
export interface Fixture {
  /** Package name to write into the fixture's package.json. */
  name: string;
  /** Source for `src/schemas/index.ts` — registers Zod schemas at import. */
  schemasSource: string;
  /** Extra files (relative path → contents) written into the fixture root. */
  extraFiles?: Record<string, string>;
  /** Entries merged into the fixture package.json#dependencies. */
  dependencies?: Record<string, string>;
}

export interface FixtureHandle {
  cwd: string;
  cleanup(): void;
  read(relPath: string): string;
  readJson(relPath: string): unknown;
  exists(relPath: string): boolean;
}

/**
 * Materialize a fixture package in a tmpdir. Symlinks `node_modules` from the
 * repo root so jiti/zod/json-schema-to-typescript resolve normally. The script
 * does not import anything from the fixture's own deps, only the cwd's
 * `package.json` and `src/schemas/index.ts`.
 */
export function makeFixture(fx: Fixture): FixtureHandle {
  const cwd = mkdtempSync(join(tmpdir(), "maib-build-schemas-"));
  mkdirSync(join(cwd, "src", "schemas"), { recursive: true });
  writeFileSync(
    join(cwd, "package.json"),
    `${JSON.stringify(
      {
        name: fx.name,
        version: "0.0.0-test",
        type: "module",
        dependencies: fx.dependencies ?? {},
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(cwd, "src", "schemas", "index.ts"), fx.schemasSource);
  // Symlink node_modules so the script's `import("zod")` / `import("jiti")` /
  // `import("json-schema-to-typescript")` resolve to the workspace versions.
  const rootNodeModules = join(REPO_ROOT, "node_modules");
  spawnSync("ln", ["-s", rootNodeModules, join(cwd, "node_modules")], { stdio: "ignore" });
  if (fx.extraFiles) {
    for (const [relPath, contents] of Object.entries(fx.extraFiles)) {
      const fullPath = join(cwd, relPath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, contents);
    }
  }
  return {
    cwd,
    cleanup() {
      rmSync(cwd, { recursive: true, force: true });
    },
    read(relPath) {
      return readFileSync(join(cwd, relPath), "utf8");
    },
    readJson(relPath) {
      return JSON.parse(readFileSync(join(cwd, relPath), "utf8"));
    },
    exists(relPath) {
      return existsSync(join(cwd, relPath));
    },
  };
}

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** Spawn build-schemas.mjs with the given args inside a fixture. */
export function runBuildSchemas(handle: FixtureHandle, args: string[] = []): RunResult {
  const result = spawnSync("node", [BUILD_SCHEMAS, ...args], {
    cwd: handle.cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_PATH: join(REPO_ROOT, "node_modules") },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Convenience: run the full pre → post pipeline against the fixture. */
export function runPipeline(handle: FixtureHandle, postArgs: string[] = []): RunResult {
  const pre = runBuildSchemas(handle, ["--pre"]);
  if (pre.status !== 0) return pre;
  return runBuildSchemas(handle, ["--post", ...postArgs]);
}
