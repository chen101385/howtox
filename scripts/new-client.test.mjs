import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildClientSource,
  parseArgs,
  registerClient,
  toCamel,
  validateSlug,
} from "./new-client-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("parseArgs", () => {
  it("defaults to the marketing preset", () => {
    expect(parseArgs(["acme", "Acme", "Co"])).toEqual({
      slug: "acme",
      name: "Acme Co",
      preset: "marketing",
    });
  });

  it("accepts --preset with a space", () => {
    const args = parseArgs(["acme", "Acme", "--preset", "interactive-experiences"]);
    expect(args.preset).toBe("interactive-experiences");
    expect(args.name).toBe("Acme");
  });

  it("accepts --preset= form", () => {
    expect(parseArgs(["acme", "--preset=appointments"]).preset).toBe("appointments");
  });

  it("falls back to the slug when no name is given", () => {
    expect(parseArgs(["acme"]).name).toBe("acme");
  });

  it("rejects an unknown preset", () => {
    expect(() => parseArgs(["acme", "--preset", "nope"])).toThrow(/Unknown preset/);
  });

  it("requires a slug", () => {
    expect(() => parseArgs([])).toThrow(/slug is required/);
  });
});

describe("validateSlug", () => {
  it("accepts kebab-case", () => {
    expect(validateSlug("acme-coaching")).toBeNull();
    expect(validateSlug("acme2")).toBeNull();
  });

  it("rejects spaces, capitals and underscores", () => {
    expect(validateSlug("Acme Co")).toMatch(/Invalid slug/);
    expect(validateSlug("Acme")).toMatch(/Invalid slug/);
    expect(validateSlug("_template")).toMatch(/Invalid slug/);
    expect(validateSlug("acme--co")).toMatch(/Invalid slug/);
  });

  it("rejects reserved names that would collide with routes", () => {
    expect(validateSlug("host")).toMatch(/reserved/);
    expect(validateSlug("discover")).toMatch(/reserved/);
  });

  it("requires a value", () => {
    expect(validateSlug("")).toMatch(/required/);
  });
});

describe("toCamel", () => {
  it("converts kebab-case to camelCase", () => {
    expect(toCamel("acme-coaching-co")).toBe("acmeCoachingCo");
    expect(toCamel("acme")).toBe("acme");
  });
});

describe("buildClientSource — marketing preset", () => {
  const template = read("clients/_template/config.ts");
  const output = buildClientSource({
    template,
    slug: "acme-coaching",
    name: "Acme Coaching",
    preset: "marketing",
  });

  it("sets the new slug", () => {
    expect(output).toContain('slug: "acme-coaching"');
    expect(output).not.toContain('slug: "template"');
  });

  it("sets the brand name", () => {
    expect(output).toContain('name: "Acme Coaching"');
    expect(output).not.toContain('name: "Your Business"');
  });

  it("rewrites asset paths", () => {
    expect(output).toContain("/clients/acme-coaching/assets/");
    expect(output).not.toContain("/clients/_template/");
  });

  it("replaces the scaffold banner", () => {
    expect(output).toContain("scaffolded from the \"marketing\" preset");
    expect(output).toContain("do NOT belong in this file");
  });
});

describe("buildClientSource — interactive-experiences preset", () => {
  const template = read("clients/experience-demo/client.ts");
  const output = buildClientSource({
    template,
    slug: "night-owl",
    name: "Night Owl",
    preset: "interactive-experiences",
  });

  it("strips the demo brand identity", () => {
    expect(output).not.toContain("Lantern Rooms");
    expect(output).not.toContain("lanternrooms.example.com");
    expect(output).toContain('slug: "night-owl"');
    expect(output).toContain('name: "Night Owl"');
  });

  it("rewrites demo asset paths", () => {
    expect(output).not.toContain("/clients/experience-demo/");
    expect(output).toContain("/clients/night-owl/assets/");
  });

  it("keeps the marketplace preset and remote-only policy", () => {
    expect(output).toContain('preset: "interactive-experiences"');
    expect(output).toContain('deliveryModes: ["remote"]');
    expect(output).toContain("MARKETPLACE_TERMINOLOGY");
  });

  it("keeps the modules array intact", () => {
    expect(output).toContain('"marketplace"');
    expect(output).toContain('"trust-safety"');
  });

  it("throws loudly if an anchor is missing", () => {
    expect(() =>
      buildClientSource({
        template: "const config = {};\nexport default config;",
        slug: "x",
        name: "X",
        preset: "marketing",
      })
    ).toThrow(/could not rewrite/);
  });
});

describe("registerClient", () => {
  const active = read("src/config/active.ts");

  it("adds an import and a registry entry", () => {
    const result = registerClient(active, {
      slug: "acme-coaching",
      preset: "marketing",
    });
    expect(result.registered).toBe(true);
    expect(result.source).toContain(
      'import acmeCoaching from "@clients/acme-coaching/config";'
    );
    expect(result.source).toContain('"acme-coaching": acmeCoaching,');
  });

  it("uses client.ts for the marketplace preset", () => {
    const result = registerClient(active, {
      slug: "night-owl",
      preset: "interactive-experiences",
    });
    expect(result.source).toContain('import nightOwl from "@clients/night-owl/client";');
  });

  it("is idempotent for an already-registered slug", () => {
    const result = registerClient(active, {
      slug: "experience-demo",
      preset: "interactive-experiences",
    });
    expect(result.registered).toBe(false);
    expect(result.reason).toBe("already present");
    expect(result.source).toBe(active);
  });

  it("refuses to edit a file whose anchors are missing", () => {
    const result = registerClient("const registry = {};", {
      slug: "acme",
      preset: "marketing",
    });
    expect(result.registered).toBe(false);
    expect(result.source).toBe("const registry = {};");
  });

  it("does not corrupt the rest of the file", () => {
    const result = registerClient(active, { slug: "acme", preset: "marketing" });
    expect(result.source).toContain("export const CLIENT_SLUGS");
    expect(result.source).toContain('"teen-edge": teenEdge,');
  });
});
