#!/usr/bin/env node
// Contrast checker for the design tokens in app/globals.css (WCAG 2.1 relative
// luminance). Validates every fg/bg token pairing in both themes meets the
// project's accessibility floor and prints a ratio table. Exits 1 on failure.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(__dirname, "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

function extractTokens(source, blockRegex) {
  const match = source.match(blockRegex);
  if (!match) throw new Error(`Could not find CSS block matching ${blockRegex}`);
  const tokens = {};
  for (const m of match[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const light = extractTokens(css, /:root\s*\{([^}]*)\}/);
const dark = extractTokens(css, /\[data-theme="dark"\]\s*\{([^}]*)\}/);

// WCAG relative luminance / contrast ratio.
function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [R, G, B] = [r, g, b].map(srgbToLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA, hexB) {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const [lighter, darker] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

function stageNames(tokens) {
  const names = new Set();
  for (const key of Object.keys(tokens)) {
    const m = key.match(/^stage-(.+)-bg$/);
    if (m) names.add(m[1]);
  }
  return [...names];
}

function buildChecks(tokens) {
  const checks = [
    ["text vs bg", "text", "bg", 4.5],
    ["text vs surface", "text", "surface", 4.5],
    ["text-2 vs bg", "text-2", "bg", 4.5],
    ["text-2 vs surface", "text-2", "surface", 4.5],
    ["text-3 vs surface", "text-3", "surface", 4.5],
    ["accent-fg vs accent", "accent-fg", "accent", 4.5],
    ["accent vs bg", "accent", "bg", 3],
    ["border vs bg", "border", "bg", 1.2],
  ];
  for (const stage of stageNames(tokens)) {
    checks.push([
      `stage-${stage}-fg vs stage-${stage}-bg`,
      `stage-${stage}-fg`,
      `stage-${stage}-bg`,
      4.5,
    ]);
  }
  return checks;
}

const rows = [];
let allPass = true;

for (const [themeName, tokens] of [["light", light], ["dark", dark]]) {
  for (const [label, fgKey, bgKey, min] of buildChecks(tokens)) {
    const fg = tokens[fgKey];
    const bg = tokens[bgKey];
    if (!fg || !bg) {
      allPass = false;
      rows.push({ theme: themeName, pair: label, ratio: "MISSING", min, result: "FAIL" });
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= min;
    if (!pass) allPass = false;
    rows.push({ theme: themeName, pair: label, ratio: ratio.toFixed(2), min, result: pass ? "PASS" : "FAIL" });
  }
}

const col = (s, w) => String(s).padEnd(w);
const PAIR_WIDTH = Math.max(32, ...rows.map((r) => r.pair.length)) + 2;
const RULE_WIDTH = 7 + PAIR_WIDTH + 8 + 6 + 6;
console.log(col("THEME", 7) + col("PAIR", PAIR_WIDTH) + col("RATIO", 8) + col("MIN", 6) + "RESULT");
console.log("-".repeat(RULE_WIDTH));
for (const r of rows) {
  console.log(col(r.theme, 7) + col(r.pair, PAIR_WIDTH) + col(r.ratio, 8) + col(r.min, 6) + r.result);
}
console.log("-".repeat(RULE_WIDTH));

if (allPass) {
  console.log(`All ${rows.length} contrast checks passed.`);
  process.exit(0);
} else {
  console.error(`${rows.filter((r) => r.result === "FAIL").length} of ${rows.length} contrast checks FAILED.`);
  process.exit(1);
}
