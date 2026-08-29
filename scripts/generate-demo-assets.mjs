#!/usr/bin/env node
/**
 * Generates the experience-demo's placeholder artwork as local SVG files.
 *
 * Deliberately generated rather than downloaded: the demo must not depend on
 * third-party image hosts or on media we don't have rights to. Each cover is an
 * abstract, theme-coloured composition keyed to its category.
 *
 *   node scripts/generate-demo-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "clients", "experience-demo", "assets");

/** Lantern Rooms palette, mirroring the client's theme tokens. */
const P = {
  bg: "#141122",
  surface: "#1d1930",
  amber: "#f4a259",
  teal: "#7fd1c1",
  violet: "#8b7fd1",
  rose: "#d17f9e",
  fg: "#f7f4ef",
};

const W = 800;
const H = 500;

const wrap = (title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}">
  <rect width="${W}" height="${H}" fill="${P.bg}"/>
${body}
</svg>
`;

/** Soft radial glow used as a base layer on most covers. */
const glow = (cx, cy, r, color, opacity = 0.55) => `  <defs>
    <radialGradient id="g${cx}${cy}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${cx}${cy})"/>`;

const covers = {
  "cover-ghost": wrap(
    "A lantern casting light through fog",
    `${glow(400, 230, 300, P.amber, 0.5)}
  <g stroke="${P.amber}" stroke-width="3" fill="none" opacity="0.9">
    <path d="M370 180 h60 v20 h-60z"/>
    <path d="M360 200 h80 l-12 120 h-56z"/>
    <path d="M400 150 v30"/>
  </g>
  <circle cx="400" cy="255" r="26" fill="${P.amber}" opacity="0.85"/>
  <g stroke="${P.fg}" stroke-width="2" opacity="0.18">
    <path d="M60 400 q120 -30 240 0 t240 0 t200 -10"/>
    <path d="M40 430 q140 -25 260 0 t260 0 t180 -8"/>
    <path d="M80 460 q120 -20 220 0 t240 0 t180 -6"/>
  </g>`
  ),

  "cover-steer": wrap(
    "A branching path splitting into many directions",
    `${glow(400, 250, 320, P.violet, 0.4)}
  <g stroke="${P.teal}" stroke-width="3" fill="none" opacity="0.9">
    <path d="M120 250 H300"/>
    <path d="M300 250 L440 150"/>
    <path d="M300 250 L440 350"/>
    <path d="M440 150 L600 100"/>
    <path d="M440 150 L600 200"/>
    <path d="M440 350 L600 300"/>
    <path d="M440 350 L600 400"/>
  </g>
  <g fill="${P.amber}">
    <circle cx="300" cy="250" r="12"/><circle cx="440" cy="150" r="10"/>
    <circle cx="440" cy="350" r="10"/><circle cx="600" cy="100" r="8"/>
    <circle cx="600" cy="200" r="8"/><circle cx="600" cy="300" r="8"/>
    <circle cx="600" cy="400" r="8"/>
  </g>`
  ),

  "cover-crowdwork": wrap(
    "A microphone lit against a dark stage",
    `${glow(400, 200, 280, P.rose, 0.45)}
  <g fill="none" stroke="${P.fg}" stroke-width="3" opacity="0.9">
    <rect x="375" y="120" width="50" height="110" rx="25"/>
    <path d="M345 210 a55 55 0 0 0 110 0"/>
    <path d="M400 265 v50"/>
    <path d="M360 320 h80"/>
  </g>
  <g fill="${P.teal}" opacity="0.5">
    ${Array.from({ length: 18 }, (_, i) => {
      const x = 90 + (i % 9) * 78;
      const y = 390 + Math.floor(i / 9) * 55;
      return `<circle cx="${x}" cy="${y}" r="14"/>`;
    }).join("\n    ")}
  </g>`
  ),

  "cover-magic": wrap(
    "Playing cards fanned against a dark background",
    `${glow(400, 250, 300, P.violet, 0.45)}
  <g transform="translate(400 300)">
    ${[-40, -20, 0, 20, 40]
      .map(
        (a, i) =>
          `<rect x="-45" y="-160" width="90" height="130" rx="8" transform="rotate(${a})" fill="${
            i === 2 ? P.amber : P.surface
          }" stroke="${P.fg}" stroke-opacity="0.35" stroke-width="2"/>`
      )
      .join("\n    ")}
  </g>
  <g fill="${P.fg}" opacity="0.35">
    <circle cx="180" cy="140" r="4"/><circle cx="620" cy="180" r="3"/>
    <circle cx="240" cy="420" r="3"/><circle cx="580" cy="400" r="4"/>
  </g>`
  ),

  "cover-learnmagic": wrap(
    "A single card held up in a spotlight",
    `${glow(400, 220, 260, P.amber, 0.5)}
  <rect x="330" y="130" width="140" height="200" rx="12" fill="${P.surface}" stroke="${P.amber}" stroke-width="3"/>
  <text x="400" y="245" font-family="Inter, sans-serif" font-size="72" font-weight="700" fill="${P.amber}" text-anchor="middle">?</text>
  <g stroke="${P.fg}" stroke-width="3" fill="none" opacity="0.7">
    <path d="M330 360 q70 60 140 0"/>
    <path d="M355 380 v40"/><path d="M400 392 v38"/><path d="M445 380 v40"/>
  </g>`
  ),

  "cover-music": wrap(
    "An acoustic guitar resting against a warm-lit wall",
    `${glow(400, 250, 300, P.amber, 0.4)}
  <g fill="none" stroke="${P.fg}" stroke-width="3" opacity="0.9">
    <ellipse cx="400" cy="330" rx="110" ry="120"/>
    <ellipse cx="400" cy="230" rx="78" ry="80"/>
    <circle cx="400" cy="300" r="34" fill="${P.bg}"/>
    <path d="M400 150 v-70"/><path d="M370 80 h60 v-30 h-60z"/>
  </g>
  <g stroke="${P.teal}" stroke-width="1.5" opacity="0.8">
    ${[-18, -9, 0, 9, 18]
      .map((dx) => `<path d="M${400 + dx} 150 V 430"/>`)
      .join("\n    ")}
  </g>`
  ),

  "cover-dj": wrap(
    "Two audio waveforms aligned above a mixer",
    `${glow(400, 250, 320, P.teal, 0.4)}
  <g fill="${P.teal}" opacity="0.85">
    ${Array.from({ length: 40 }, (_, i) => {
      const h = 20 + Math.abs(Math.sin(i * 0.7)) * 90;
      return `<rect x="${60 + i * 17}" y="${170 - h / 2}" width="8" height="${h}" rx="4"/>`;
    }).join("\n    ")}
  </g>
  <g fill="${P.amber}" opacity="0.85">
    ${Array.from({ length: 40 }, (_, i) => {
      const h = 20 + Math.abs(Math.cos(i * 0.55)) * 90;
      return `<rect x="${60 + i * 17}" y="${340 - h / 2}" width="8" height="${h}" rx="4"/>`;
    }).join("\n    ")}
  </g>
  <line x1="60" y1="255" x2="740" y2="255" stroke="${P.fg}" stroke-opacity="0.25" stroke-width="2"/>`
  ),

  "cover-cooking": wrap(
    "A pan and fresh ingredients on a wooden board",
    `${glow(400, 260, 300, P.amber, 0.4)}
  <g fill="none" stroke="${P.fg}" stroke-width="3" opacity="0.9">
    <ellipse cx="380" cy="300" rx="150" ry="60"/>
    <path d="M530 300 h140"/>
    <path d="M230 300 q0 60 150 60 t150 -60"/>
  </g>
  <g fill="${P.teal}" opacity="0.8">
    <circle cx="330" cy="290" r="18"/><circle cx="390" cy="300" r="14"/>
    <circle cx="440" cy="288" r="16"/>
  </g>
  <g stroke="${P.amber}" stroke-width="3" fill="none" opacity="0.7">
    <path d="M340 200 q10 -30 -5 -55"/>
    <path d="M400 190 q12 -34 -4 -62"/>
    <path d="M455 200 q10 -30 -5 -55"/>
  </g>`
  ),

  "cover-improv": wrap(
    "Overlapping speech bubbles in bright colors",
    `${glow(400, 250, 300, P.rose, 0.4)}
  <g stroke-width="3" fill-opacity="0.25">
    <path d="M150 140 h250 a20 20 0 0 1 20 20 v110 a20 20 0 0 1 -20 20 h-160 l-50 45 v-45 h-40 a20 20 0 0 1 -20 -20 v-110 a20 20 0 0 1 20 -20z" fill="${P.teal}" stroke="${P.teal}"/>
    <path d="M400 250 h230 a20 20 0 0 1 20 20 v100 a20 20 0 0 1 -20 20 h-150 l-45 40 v-40 h-35 a20 20 0 0 1 -20 -20 v-100 a20 20 0 0 1 20 -20z" fill="${P.amber}" stroke="${P.amber}"/>
  </g>`
  ),

  "cover-trivia": wrap(
    "A grid of clues connected by lines",
    `${glow(400, 250, 300, P.violet, 0.4)}
  <g fill="${P.surface}" stroke="${P.fg}" stroke-opacity="0.3" stroke-width="2">
    ${Array.from({ length: 12 }, (_, i) => {
      const x = 160 + (i % 4) * 130;
      const y = 130 + Math.floor(i / 4) * 100;
      return `<rect x="${x}" y="${y}" width="105" height="75" rx="10"/>`;
    }).join("\n    ")}
  </g>
  <g stroke="${P.amber}" stroke-width="3" opacity="0.85" fill="none">
    <path d="M212 205 L342 305 L472 205 L602 305"/>
  </g>
  <g fill="${P.teal}">
    <circle cx="212" cy="205" r="8"/><circle cx="342" cy="305" r="8"/>
    <circle cx="472" cy="205" r="8"/><circle cx="602" cy="305" r="8"/>
  </g>`
  ),
};

/** Samples reuse the cover composition with a "sample" ribbon. */
const sampleFor = (coverKey, label) => {
  const base = covers[coverKey];
  const ribbon = `  <g>
    <rect x="0" y="0" width="220" height="40" fill="${P.amber}"/>
    <text x="16" y="26" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="${P.bg}">${label}</text>
  </g>
</svg>
`;
  return base.replace(/<\/svg>\s*$/, ribbon);
};

const samples = {
  "sample-ghost": sampleFor("cover-ghost", "SAMPLE"),
  "sample-steer": sampleFor("cover-steer", "SAMPLE"),
  "sample-crowdwork": sampleFor("cover-crowdwork", "SAMPLE"),
  "sample-magic": sampleFor("cover-magic", "SAMPLE"),
  "sample-learnmagic": sampleFor("cover-learnmagic", "SAMPLE"),
  "sample-music": sampleFor("cover-music", "SAMPLE"),
  "sample-dj": sampleFor("cover-dj", "SAMPLE"),
  "sample-cooking": sampleFor("cover-cooking", "SAMPLE"),
  "sample-improv": sampleFor("cover-improv", "SAMPLE"),
  "sample-trivia": sampleFor("cover-trivia", "SAMPLE"),
};

const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="32" viewBox="0 0 168 32" role="img" aria-label="Lantern Rooms">
  <g stroke="${P.amber}" stroke-width="2" fill="none">
    <path d="M8 9 h12 v3 H8z"/>
    <path d="M6 12 h16 l-2.5 14 h-11z"/>
    <path d="M14 4 v5"/>
  </g>
  <circle cx="14" cy="19" r="4.5" fill="${P.amber}"/>
  <text x="32" y="22" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="${P.fg}">Lantern Rooms</text>
</svg>
`;

const files = { ...covers, ...samples, logo };

await mkdir(OUT, { recursive: true });
await Promise.all(
  Object.entries(files).map(([name, contents]) =>
    writeFile(join(OUT, `${name}.svg`), contents, "utf8")
  )
);

console.log(`Generated ${Object.keys(files).length} SVG assets in ${OUT}`);
