#!/usr/bin/env node

/**
 * Two-phase build helper for schema-driven types.
 *
 * Phase 1 (--pre): runs before `tsup`. Loads the current package's Zod schemas
 * via jiti, builds a JSON Schema bundle from the global registry, merges in
 * any parent bundles found in workspace `@maib/*` dependencies, caches the
 * canonical artifact at `.schemas-cache/schemas.json` (survives `tsup --clean`),
 * and generates `src/generated/types.ts` via `json-schema-to-typescript` so
 * `tsup` picks the types up during dts emission.
 *
 * Phase 2 (--post): runs after `tsup`. Reads the cached bundle and writes
 * the published artifacts into `dist/schemas/`:
 *
 *   - `dist/schemas/bundle.json` — the full JSON Schema bundle.
 *   - `dist/schemas/<ShortName>.json` — one self-contained file per schema
 *     (with `$defs` embedded so cross-refs resolve when imported alone).
 *
 * Usage (inside a package's build script):
 *   node ../../scripts/build-schemas.mjs --pre  && tsup && node ../../scripts/build-schemas.mjs --post
 *
 * Packages without `src/schemas/index.ts` are silently skipped so this
 * script is safe to wire into every package's build.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const phase = process.argv.includes("--post") ? "post" : "pre";

const cacheDir = join(cwd, ".schemas-cache");
const cachedJson = join(cacheDir, "schemas.json");
const distSchemasDir = join(cwd, "dist", "schemas");
const distBundleJson = join(distSchemasDir, "bundle.json");
const schemaModulePath = join(cwd, "src", "schemas", "index.ts");
const generatedDir = join(cwd, "src", "generated");
const generatedFile = join(generatedDir, "types.ts");

if (!existsSync(schemaModulePath)) {
  // Package has no schemas — nothing to do.
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));

if (phase === "post") {
  if (!existsSync(cachedJson)) {
    console.error(`[build-schemas] missing cache at ${cachedJson}`);
    process.exit(1);
  }
  const bundle = JSON.parse(readFileSync(cachedJson, "utf8"));
  mkdirSync(distSchemasDir, { recursive: true });
  // Full bundle: every package's `./schemas/bundle.json`.
  writeFileSync(distBundleJson, `${JSON.stringify(bundle, null, 2)}\n`);
  // Per-schema files: every package's `./schemas/<ShortName>.json`. Each file
  // is self-contained — it embeds only the transitively-reachable defs from
  // the bundle and keeps internal `#/$defs/<id>` refs (the same style as
  // `bundle.json`). Self-containment matters because consumers like Zod's
  // `fromJSONSchema` reject external file refs and only resolve `#/...`.
  const defs = bundle.$defs ?? {};
  const refPrefix = "#/$defs/";

  function collectRefs(node, into) {
    if (Array.isArray(node)) {
      for (const item of node) collectRefs(item, into);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string" && node.$ref.startsWith(refPrefix)) {
      into.add(node.$ref.slice(refPrefix.length));
    }
    for (const value of Object.values(node)) collectRefs(value, into);
  }
  function reachableDefs(rootId) {
    const reached = new Set();
    const queue = [rootId];
    while (queue.length > 0) {
      const id = queue.pop();
      const def = defs[id];
      if (!def) continue;
      const refs = new Set();
      collectRefs(def, refs);
      for (const ref of refs) {
        if (ref === rootId || reached.has(ref)) continue;
        reached.add(ref);
        queue.push(ref);
      }
    }
    const out = {};
    for (const id of reached) out[id] = defs[id];
    return out;
  }

  // By default short-name collisions are a build error — within a single
  // package's own schemas they always indicate a developer mistake (two
  // distinct schemas chose the same trailing id segment). Aggregator packages
  // like `@maib/merchants` legitimately end up with collisions across parent
  // bundles (e.g. `maib.checkout.RefundRequest` + `maib.ecommerce.RefundRequest`)
  // and opt into a fallback strategy via `--on-collision=<strategy>`. Mirrors
  // the `onCollision` option on `buildSchemasBundle` so a package's emitted
  // filenames line up with the in-memory keys consumers see at runtime:
  //
  //   namespace         → `<package>.<ShortName>.json` (e.g. `checkout.RefundRequest.json`)
  //   namespace-prefix  → `<Package><ShortName>.json`  (e.g. `CheckoutRefundRequest.json`)
  //
  // Unique short names keep `<ShortName>.json` under either strategy.
  const collisionArg = process.argv.find((a) => a.startsWith("--on-collision="));
  const collisionStrategy = collisionArg ? collisionArg.slice("--on-collision=".length) : "throw";
  if (!["throw", "namespace", "namespace-prefix"].includes(collisionStrategy)) {
    console.error(
      `[build-schemas] unknown --on-collision value: "${collisionStrategy}". ` +
        `Expected one of: throw, namespace, namespace-prefix.`,
    );
    process.exit(1);
  }

  const shortNameCounts = new Map();
  for (const id of Object.keys(defs)) {
    const shortName = id.split(".").pop();
    if (!shortName) continue;
    shortNameCounts.set(shortName, (shortNameCounts.get(shortName) ?? 0) + 1);
  }

  if (collisionStrategy === "throw") {
    const firstId = new Map();
    for (const id of Object.keys(defs)) {
      const shortName = id.split(".").pop();
      if (!shortName) continue;
      if (firstId.has(shortName)) {
        console.error(
          `[build-schemas] short-name collision in ${pkg.name ?? cwd}: ` +
            `"${shortName}" is the tail of both "${firstId.get(shortName)}" and "${id}". ` +
            `Per-schema JSON files cannot be emitted unambiguously — rename one of the schemas, ` +
            `or pass --on-collision=namespace|namespace-prefix if this is an aggregator package.`,
        );
        process.exit(1);
      }
      firstId.set(shortName, id);
    }
  }

  function collisionFileBase(id) {
    const stripped = id.replace(/^maib\./, "");
    if (collisionStrategy === "namespace") return stripped;
    // namespace-prefix: PascalCase the namespace segment and concatenate.
    // Falls through to the dotted form for ids that aren't `<namespace>.<ShortName>`.
    const parts = stripped.split(".");
    if (parts.length === 2) {
      const [ns, name] = parts;
      return (ns.charAt(0).toUpperCase() + ns.slice(1)) + name;
    }
    return stripped;
  }

  // Local ids stashed in the pre phase — used to scope typed `.ts` wrapper
  // emission to schemas this package actually owns (parent ids merged in via
  // an aggregator build already have wrappers in their owning package).
  const metaPath = join(cacheDir, "meta.json");
  const localIds = existsSync(metaPath)
    ? new Set(JSON.parse(readFileSync(metaPath, "utf8")).localIds ?? [])
    : new Set();

  for (const id of Object.keys(defs)) {
    const shortName = id.split(".").pop();
    if (!shortName) continue;
    const fileBase = shortNameCounts.get(shortName) === 1 ? shortName : collisionFileBase(id);
    const embedded = reachableDefs(id);
    const perSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      ...defs[id],
      ...(Object.keys(embedded).length > 0 ? { $defs: embedded } : {}),
    };
    writeFileSync(
      join(distSchemasDir, `${fileBase}.json`),
      `${JSON.stringify(perSchema, null, 2)}\n`,
    );

    if (!localIds.has(id)) continue;
    // Skip wrappers for fileBases that aren't valid JS/TS identifiers.
    // Happens under `--on-collision=namespace`, which produces dotted names
    // like `checkout.RefundRequest` — those can't be imported as a default
    // export under that subpath. Stick to JSON imports for those.
    if (!/^[A-Za-z_$][\w$]*$/.test(fileBase)) continue;

    // Emit a typed `.ts` wrapper trio so consumers can `import Def from
    // "@maib/<pkg>/schemas/<ShortName>"` and have `buildSchema(Def)` infer
    // `ParsingValidator<ShortName>` without a manual type argument.
    const wrapperBase = join(distSchemasDir, fileBase);
    writeFileSync(
      `${wrapperBase}.d.ts`,
      [
        `import type { TypedSchemaDef } from "@maib/internal-schemas/schemas-builder";`,
        `import type { ${fileBase} } from "../index.js";`,
        ``,
        `declare const def: TypedSchemaDef<${fileBase}>;`,
        `export default def;`,
        ``,
      ].join("\n"),
    );
    writeFileSync(
      `${wrapperBase}.d.cts`,
      [
        `import type { TypedSchemaDef } from "@maib/internal-schemas/schemas-builder";`,
        `import type { ${fileBase} } from "../index.cjs";`,
        ``,
        `declare const def: TypedSchemaDef<${fileBase}>;`,
        `export default def;`,
        ``,
      ].join("\n"),
    );
    writeFileSync(
      `${wrapperBase}.js`,
      [
        `import def from "./${fileBase}.json" with { type: "json" };`,
        `export default def;`,
        ``,
      ].join("\n"),
    );
    writeFileSync(
      `${wrapperBase}.cjs`,
      [`"use strict";`, `module.exports = { default: require("./${fileBase}.json") };`, ``].join(
        "\n",
      ),
    );
  }
  process.exit(0);
}

// ---- pre phase ----

const allDeps = { ...pkg.dependencies, ...pkg.peerDependencies };
const parentBundles = [];
for (const [name, version] of Object.entries(allDeps)) {
  if (!name.startsWith("@maib/")) continue;
  if (typeof version !== "string" || !version.startsWith("workspace:")) continue;
  const short = name.slice("@maib/".length);
  const candidate = resolve(cwd, "..", short, "dist", "schemas", "bundle.json");
  if (existsSync(candidate)) parentBundles.push({ name, path: candidate });
}

const { createJiti } = await import("jiti");
const jiti = createJiti(pathToFileURL(import.meta.url).href, { interopDefault: true });

// Importing the schemas module registers schemas in z.globalRegistry as a side-effect
// of `.meta({ id, ... })` calls during module evaluation.
await jiti.import(schemaModulePath);

const z = await import("zod");
// Emit cross-schema refs as document-internal pointers so the whole bundle is
// self-resolving when handed to validators or to json-schema-to-typescript.
const localBundle = z.toJSONSchema(z.globalRegistry, {
  uri: (id) => `#/$defs/${id}`,
});

const localIds = new Set(Object.keys(localBundle.schemas ?? {}));
const mergedDefs = { ...(localBundle.schemas ?? {}) };
for (const parent of parentBundles) {
  const data = JSON.parse(readFileSync(parent.path, "utf8"));
  for (const [id, def] of Object.entries(data.$defs ?? {})) {
    // Parent (e.g. @maib/core) is authoritative for its own ids.
    mergedDefs[id] = def;
  }
}

// Strip the nested $schema marker each Zod-emitted definition carries and
// give each definition a `title` so json-schema-to-typescript uses our chosen
// interface name (the trailing segment of the id) instead of a derived
// `$DefsMaibCoreMaibApiError`-style name.
//
// Also rewrite `{ $ref, description, ...siblings }` into
// `{ allOf: [{$ref}], description, ...siblings }`. Pre-2020-12 JSON Schema
// ignored siblings of `$ref`, and json-schema-to-typescript still inlines a
// duplicate interface rather than following the ref when it sees them. The
// `allOf` wrapper preserves both the reference and the local description.
function rewriteRefsWithSiblings(node) {
  if (Array.isArray(node)) {
    for (const item of node) rewriteRefsWithSiblings(item);
    return;
  }
  if (!node || typeof node !== "object") return;
  if (typeof node.$ref === "string" && Object.keys(node).length > 1) {
    const { $ref, ...siblings } = node;
    for (const key of Object.keys(node)) delete node[key];
    Object.assign(node, siblings, { allOf: [{ $ref }] });
  }
  for (const value of Object.values(node)) rewriteRefsWithSiblings(value);
}

for (const id of Object.keys(mergedDefs)) {
  const { $schema: _drop, ...rest } = mergedDefs[id];
  rest.title = id.split(".").pop();
  mergedDefs[id] = rest;
}
rewriteRefsWithSiblings(mergedDefs);

const bundle = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: mergedDefs,
};

// Stash the package's own ids alongside the bundle so the post phase can
// emit typed `.ts` wrappers only for local schemas (not for parent ids
// re-rolled in via aggregator merging).
const meta = { localIds: [...localIds] };

mkdirSync(cacheDir, { recursive: true });
writeFileSync(cachedJson, `${JSON.stringify(bundle, null, 2)}\n`);
writeFileSync(join(cacheDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

// ---- generate types ----

const { compile } = await import("json-schema-to-typescript");
const compileOptions = {
  bannerComment: "",
  // Per-schema additionalProperties is encoded by Zod (object vs looseObject).
  // Do not let json-schema-to-typescript force a default.
  additionalProperties: false,
  declareExternallyReferenced: true,
  enableConstEnums: false,
  format: false,
  strictIndexSignatures: true,
  unknownAny: true,
  unreachableDefinitions: true,
};

// Reference each local schema from a synthetic root so json-schema-to-typescript
// emits an interface for every local id (and anything reachable via $ref) but
// leaves merged parent schemas alone — those interfaces already exist in the
// parent package's `dist/types.d.ts`.
const rootProperties = {};
for (const id of localIds) {
  rootProperties[id] = { $ref: `#/$defs/${id}` };
}
const rootSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "_MaibSchemasRoot",
  type: "object",
  properties: rootProperties,
  required: [...localIds],
  additionalProperties: false,
  $defs: mergedDefs,
};
const compiled = await compile(rootSchema, "_MaibSchemasRoot", {
  ...compileOptions,
  unreachableDefinitions: false,
});

// Drop the synthetic root interface from the emitted output so consumers only
// see the real schema interfaces. Also strip the "This interface was
// referenced by `_MaibSchemasRoot`'s JSON-Schema via the `definition` ..."
// noise that json-schema-to-typescript appends to every JSDoc block for a
// `$defs` entry.
const withoutRoot = compiled
  .replace(/export interface _MaibSchemasRoot\s*\{[\s\S]*?\}\s*/m, "")
  .replace(
    /\n\s*\*\s*\n\s*\*\s*This interface was referenced by `_MaibSchemasRoot`'s JSON-Schema\s*\n\s*\*\s*via the `definition` "[^"]+"\./g,
    "",
  );
const chunks = [withoutRoot.trim()];

const header = [
  "/* eslint-disable */",
  "// AUTOGENERATED from schemas.json — do not edit by hand.",
  "// Run `pnpm build` (or `pnpm -F <pkg> build`) to regenerate.",
  "",
].join("\n");

mkdirSync(generatedDir, { recursive: true });
writeFileSync(generatedFile, `${header}\n${chunks.join("\n\n")}\n`);
