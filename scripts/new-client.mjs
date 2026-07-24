#!/usr/bin/env node
/**
 * Scaffold a new whitelabel client.
 *
 *   npm run new-client -- <slug> "Business Name"
 *
 * Copies clients/_template to clients/<slug>, sets the slug/brand name, and
 * prints the one line to add to src/config/active.ts.
 */
import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const [slug, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ");

if (!slug) {
  console.error('Usage: npm run new-client -- <slug> "Business Name"');
  process.exit(1);
}

const dest = join(root, "clients", slug);
if (existsSync(dest)) {
  console.error(`Client "${slug}" already exists at ${dest}`);
  process.exit(1);
}

const src = join(root, "clients", "_template");
await cp(src, dest, { recursive: true });
await mkdir(join(dest, "assets"), { recursive: true });

// Patch the copied config's slug + brand name + asset paths.
const configPath = join(dest, "config.ts");
let config = await readFile(configPath, "utf8");
config = config
  .replace(/slug:\s*"_template"/, `slug: "${slug}"`)
  .replaceAll("/clients/_template/", `/clients/${slug}/`);
if (name) {
  config = config.replace(/name:\s*"Your Business"/, `name: "${name}"`);
}
await writeFile(configPath, config);

console.log(`\n✅ Created clients/${slug}\n`);
console.log("Next steps:");
console.log(`  1. Add these to src/config/active.ts:`);
console.log(`       import ${toCamel(slug)} from "@clients/${slug}/config";`);
console.log(`       // in registry:  "${slug}": ${toCamel(slug)},`);
console.log(`  2. Edit clients/${slug}/config.ts`);
console.log(`  3. Run: NEXT_PUBLIC_CLIENT=${slug} npm run dev\n`);

function toCamel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
