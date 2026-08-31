/**
 * Loads `.env.local` for the standalone `db:*` scripts.
 *
 * Next.js loads `.env.local` for the app automatically. `tsx` does not, so
 * without this a correctly-filled `.env.local` still produces "No DATABASE_URL
 * set" — which reads as a configuration mistake when nothing is actually wrong.
 *
 * Hand-parsed rather than pulling in `dotenv`: this needs to handle the four
 * lines in our own env file, not the full spec, and Node's `--env-file` behaves
 * differently across the versions people will run this on.
 *
 * Existing environment variables always win, so `DATABASE_URL=… npm run db:seed`
 * still overrides the file.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = [".env.local", ".env"];

function parse(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;

    const equals = line.indexOf("=");
    if (equals === -1) continue;

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    // Strip matching surrounding quotes — a password containing `#` has to be
    // quotable, and quoting is the usual advice for one containing spaces.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }

    if (key) values[key] = value;
  }

  return values;
}

export function loadEnv(cwd = process.cwd()): string[] {
  const loaded: string[] = [];

  for (const file of FILES) {
    let contents: string;
    try {
      contents = readFileSync(resolve(cwd, file), "utf8");
    } catch {
      continue; // Absent is normal — the app runs with no env file at all.
    }

    for (const [key, value] of Object.entries(parse(contents))) {
      // Only fill gaps. An explicit shell variable is a deliberate override.
      if (process.env[key] === undefined) process.env[key] = value;
    }
    loaded.push(file);
  }

  return loaded;
}

export { parse as __parseEnv };
