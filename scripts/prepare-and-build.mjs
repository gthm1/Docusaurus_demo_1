#!/usr/bin/env node
/**
 * Multi-tenant Docusaurus build script.
 *
 * Usage:
 *   node scripts/prepare-and-build.mjs internal
 *   node scripts/prepare-and-build.mjs customer acme
 *   node scripts/prepare-and-build.mjs customer beta
 *
 * How it works:
 *   1. Reads content-source/ (single tagged source of truth)
 *   2. Filters files into docs/ based on target:
 *        - internal: everything (all customers, all visibility, + internal-general)
 *        - customer <slug>: ONLY that customer's visibility:public pages
 *          (no other customer's files ever touch this build's docs/ folder,
 *           and no internal-only pages for this customer either)
 *   3. Writes a target-specific docusaurus.config for baseUrl/outDir isolation
 *   4. Runs `docusaurus build` with an isolated build directory so that no
 *      sidebar JSON, search index, or build artifact from one target can
 *      leak into another target's output.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "content-source");
const DOCS_DIR = path.join(ROOT, "docs");
const OUTPUTS_DIR = path.join(ROOT, "multi-build-output");

const [, , mode, customerArg] = process.argv;

if (!["internal", "customer"].includes(mode)) {
  console.error("Usage: node prepare-and-build.mjs internal");
  console.error("       node prepare-and-build.mjs customer <slug>");
  process.exit(1);
}
if (mode === "customer" && !customerArg) {
  console.error("Missing customer slug, e.g. `customer acme`");
  process.exit(1);
}

const target = mode === "internal" ? "internal" : `customer-${customerArg}`;
console.log(`\n=== Building target: ${target} ===`);

// ---- 1. Clear docs/ ----
fs.rmSync(DOCS_DIR, { recursive: true, force: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

// ---- 2. Walk content-source, filter, copy ----
function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

const allFiles = walk(SOURCE_DIR);
let includedCount = 0;

for (const filePath of allFiles) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  const visibility = data.visibility || "internal"; // default-closed
  const customer = data.customer || null; // null = general internal doc

  let include = false;

  if (mode === "internal") {
    // Internal staff build sees literally everything.
    include = true;
  } else {
    // Customer build: ONLY this customer's public-tagged pages.
    // Explicitly excludes: other customers, internal-general docs,
    // and this customer's own internal-only pages.
    include = customer === customerArg && visibility === "public";
  }

  if (!include) continue;
  includedCount++;

  // Preserve relative structure under docs/, but flatten customer
  // namespace per-build (each customer build only ever contains its
  // own folder, so no need to nest under customers/<slug>/ there).
  const rel = path.relative(SOURCE_DIR, filePath);
  const destRel =
    mode === "customer"
      ? rel.replace(new RegExp(`^customers/${customerArg}/`), "")
      : rel;
  const dest = path.join(DOCS_DIR, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(filePath, dest);
}

console.log(`Included ${includedCount} / ${allFiles.length} source files.`);

// ---- 2b. Write a landing index page so the root path (/) resolves ----
const CUSTOMER_LABELS = { acme: "Acme Corp", beta: "Beta Industries" };
const landingTitle =
  mode === "internal"
    ? "Minnovation Internal Documentation"
    : `Minnovation Docs — ${CUSTOMER_LABELS[customerArg] || customerArg}`;
const landingBody =
  mode === "internal"
    ? "Welcome. This internal build includes every customer's public and staff-only pages, plus general internal-only documentation. Use the sidebar to browse."
    : `Welcome to your Minnovation documentation portal. Use the sidebar to browse your available guides.`;

fs.writeFileSync(
  path.join(DOCS_DIR, "index.md"),
  `---
title: ${landingTitle}
slug: /
sidebar_position: 0
---

# ${landingTitle}

${landingBody}
`
);

if (includedCount === 0) {
  console.error("No files matched — aborting build to avoid publishing an empty/broken site.");
  process.exit(1);
}

// ---- 3. Build with isolated env + outDir ----
// Internal now deploys to its own dedicated Cloudflare Pages site (gated
// by Cloudflare Access), so it lives at the site root, not a /docs/internal/
// subpath. Customer builds stay on Netlify as path-based deploys.
const baseUrl = mode === "internal" ? "/" : `/docs/${customerArg}/`;
const outDir = path.join(OUTPUTS_DIR, target);

process.env.DOCS_BASE_URL = baseUrl;
process.env.BUILD_TARGET = target;

console.log(`baseUrl: ${baseUrl}`);
console.log(`outDir:  ${outDir}`);

execSync(
  `npx docusaurus build --out-dir "${outDir}"`,
  { cwd: ROOT, stdio: "inherit", env: process.env }
);

console.log(`=== Done: ${target} -> ${outDir} ===\n`);
