#!/usr/bin/env node
/**
 * Scaffold a new whitelabel client.
 *
 *   npm run new-client -- <slug> "Business Name" [--preset <preset>]
 *
 * Presets: marketing (default) | appointments | interactive-experiences
 *
 * The pure logic lives in new-client-lib.mjs so it can be unit tested without
 * touching the filesystem; this file is the thin CLI around it.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRESET_SOURCES,
  PRESETS,
  buildClientSource,
  parseArgs,
  registerClient,
  validateSlug,
} from "./new-client-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  fail(
    `${error.message}\n\n` +
      `Usage: npm run new-client -- <slug> "Business Name" [--preset <${PRESETS.join("|")}>]`
  );
}

const { slug, name, preset } = args;

const slugError = validateSlug(slug);
if (slugError) fail(slugError);

const dest = join(root, "clients", slug);
if (existsSync(dest)) fail(`Client "${slug}" already exists at clients/${slug}`);

const source = PRESET_SOURCES[preset];
const isMarketplacePreset = preset === "interactive-experiences";

if (isMarketplacePreset) {
  // Copy the demo client, then strip its demo identity.
  await mkdir(dest, { recursive: true });
  const template = await readFile(join(root, "clients", source.dir, source.file), "utf8");
  await writeFile(
    join(dest, "client.ts"),
    buildClientSource({ template, slug, name, preset }),
    "utf8"
  );
} else {
  await cp(join(root, "clients", source.dir), dest, { recursive: true });
  const configPath = join(dest, source.file);
  const template = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    buildClientSource({ template, slug, name, preset }),
    "utf8"
  );
}

await mkdir(join(root, "public", "clients", slug, "assets"), { recursive: true });

// Register in the client registry so the new client is immediately runnable.
const activePath = join(root, "src", "config", "active.ts");
const activeSource = await readFile(activePath, "utf8");
const result = registerClient(activeSource, { slug, preset });

if (result.registered) {
  await writeFile(activePath, result.source, "utf8");
} else {
  console.warn(
    `\n⚠ Could not update src/config/active.ts automatically (${result.reason}).\n` +
      `  Add these lines by hand:\n` +
      `    import ${result.importName} from "@clients/${slug}/${result.fileBase}";\n` +
      `    // in the registry object:  "${slug}": ${result.importName},`
  );
}

const entryFile = isMarketplacePreset ? "client.ts" : "config.ts";

console.log(`
✅ Created clients/${slug}/${entryFile}   (preset: ${preset})
   Assets folder: public/clients/${slug}/assets/
   ${result.registered ? "Registered in src/config/active.ts" : "NOT registered — see warning above"}

Next steps:
  1. Edit clients/${slug}/${entryFile}
  2. Add a logo at public/clients/${slug}/assets/logo.svg
  3. Run:  NEXT_PUBLIC_CLIENT=${slug} npm run dev
  4. Verify: npm run typecheck && npm test
`);
