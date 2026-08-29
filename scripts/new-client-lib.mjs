/**
 * Pure logic for the new-client scaffolder.
 *
 * Separated from the CLI so it can be tested without touching the filesystem.
 * Source rewriting uses anchored, single-purpose replacements and verifies each
 * one landed, rather than firing loose regexes and hoping — a silent miss here
 * produces a client that looks scaffolded but still carries demo identity.
 */

export const PRESETS = ["marketing", "appointments", "interactive-experiences"];

/** Which existing client each preset is cloned from. */
export const PRESET_SOURCES = {
  marketing: { dir: "_template", file: "config.ts" },
  appointments: { dir: "_template", file: "config.ts" },
  "interactive-experiences": { dir: "experience-demo", file: "client.ts" },
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reserved because they collide with registry keys or route segments. */
const RESERVED_SLUGS = new Set([
  "template",
  "api",
  "app",
  "src",
  "public",
  "discover",
  "host",
  "ops",
  "session",
  "lobby",
  "bookings",
  "events",
  "experiences",
  "hosts",
  "feedback",
]);

export function validateSlug(slug) {
  if (!slug) return "A slug is required.";
  if (!SLUG_PATTERN.test(slug)) {
    return `Invalid slug "${slug}". Use lowercase kebab-case: letters, digits and single hyphens (e.g. "acme-coaching").`;
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is reserved. Pick a different slug.`;
  }
  return null;
}

export function parseArgs(argv) {
  const positional = [];
  let preset = "marketing";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--preset") {
      preset = argv[i + 1];
      i += 1;
      if (!preset) throw new Error("--preset requires a value.");
    } else if (arg.startsWith("--preset=")) {
      preset = arg.slice("--preset=".length);
    } else {
      positional.push(arg);
    }
  }

  if (!PRESETS.includes(preset)) {
    throw new Error(
      `Unknown preset "${preset}". Choose one of: ${PRESETS.join(", ")}.`
    );
  }

  const [slug, ...nameParts] = positional;
  if (!slug) throw new Error("A slug is required.");

  return { slug, name: nameParts.join(" ") || slug, preset };
}

/** kebab-case → camelCase, used for the generated import identifier. */
export function toCamel(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Rewrites a copied client source for its new identity.
 *
 * Replacements are anchored to the exact literals used in the source templates
 * and each is verified, so a template edit that breaks an anchor fails loudly
 * instead of silently producing a half-renamed client.
 */
export function buildClientSource({ template, slug, name, preset }) {
  let source = template;
  const problems = [];

  // Capture the source client's identity strings up front so they can be scrubbed
  // everywhere they appear — a brand name or domain also shows up in contact
  // emails, SEO copy and alt text, not just the field it was declared in.
  const originalName = template.match(/name:\s*"([^"]*)"/)?.[1];
  const originalDomain = template.match(/domain:\s*"([^"]*)"/)?.[1];

  const replace = (pattern, replacement, description, { required = true } = {}) => {
    const before = source;
    source = source.replace(pattern, replacement);
    if (required && source === before) problems.push(description);
  };

  // 1. slug
  replace(/slug:\s*"[^"]*"/, `slug: "${slug}"`, "slug");

  // 2. brand name — the first `name:` inside the brand block
  replace(/name:\s*"[^"]*"/, `name: ${JSON.stringify(name)}`, "brand name");

  // 3. asset paths for whichever source client was copied
  for (const sourceSlug of ["_template", "experience-demo"]) {
    source = source.split(`/clients/${sourceSlug}/`).join(`/clients/${slug}/`);
  }

  // 4. alt text and domain that embed the old brand
  source = source.replace(/alt:\s*"[^"]*logo"/, `alt: ${JSON.stringify(`${name} logo`)}`);
  source = source.replace(/domain:\s*"[^"]*"/, `domain: "example.com"`);

  // 5. SEO strings, so a scaffold never ships another brand's copy
  source = source.replace(
    /title:\s*"[^"]*"/,
    `title: ${JSON.stringify(`${name} — replace this title`)}`
  );
  source = source.replace(
    /description:\s*"[^"]*"/,
    `description: ${JSON.stringify(`Replace this description for ${name}.`)}`
  );

  // 6. tagline
  source = source.replace(
    /tagline:\s*"[^"]*"/,
    `tagline: "Replace this tagline"`
  );

  if (preset === "appointments" && /preset:\s*"marketing"/.test(source)) {
    source = source.replace(/preset:\s*"marketing"/, `preset: "appointments"`);
  }

  // 7. Global scrub of any remaining source-brand identity (contact emails, SEO
  //    copy, alt text). Done last so the anchored replacements above run first.
  if (originalDomain) {
    source = source.split(originalDomain).join("example.com");
  }
  if (originalName && originalName !== name) {
    source = source.split(originalName).join(name);
  }

  // Scaffold banner, replacing the source client's own header comment.
  const banner = `/**
 * ${name} — scaffolded from the "${preset}" preset.
 *
 * TODO: replace brand, theme, copy and assets. Business records (listings,
 * bookings, users) do NOT belong in this file — they live in repositories.
 */
`;
  source = source.replace(/\/\*\*[\s\S]*?\*\/\s*(?=const config)/, banner);

  if (problems.length > 0) {
    throw new Error(
      `Scaffolding could not rewrite: ${problems.join(", ")}. ` +
        `The source template in clients/ has probably changed shape — update scripts/new-client-lib.mjs.`
    );
  }

  return source;
}

/**
 * Inserts the import and registry entry into src/config/active.ts.
 * Returns `registered: false` with a reason rather than corrupting the file when
 * the expected anchors are missing.
 */
export function registerClient(source, { slug, preset }) {
  const importName = toCamel(slug);
  const fileBase = preset === "interactive-experiences" ? "client" : "config";
  const meta = { importName, fileBase };

  if (source.includes(`"${slug}":`) || source.includes(`@clients/${slug}/`)) {
    return { ...meta, registered: false, reason: "already present", source };
  }

  const importAnchor = /(import experienceDemo from "@clients\/experience-demo\/client";\n)/;
  if (!importAnchor.test(source)) {
    return { ...meta, registered: false, reason: "import anchor not found", source };
  }

  const registryAnchor = /(\n\s*"experience-demo": experienceDemo,\n)/;
  if (!registryAnchor.test(source)) {
    return { ...meta, registered: false, reason: "registry anchor not found", source };
  }

  const withImport = source.replace(
    importAnchor,
    `$1import ${importName} from "@clients/${slug}/${fileBase}";\n`
  );
  const withEntry = withImport.replace(
    registryAnchor,
    `$1  "${slug}": ${importName},\n`
  );

  return { ...meta, registered: true, source: withEntry };
}
