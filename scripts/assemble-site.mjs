#!/usr/bin/env node
/**
 * Combines the three isolated builds (internal, customer-acme, customer-beta)
 * into a single deploy/ directory matching Netlify's publish root, then
 * writes the shared-surface protections:
 *   - deploy/index.html: a neutral landing page. Does NOT list customer
 *     paths/slugs (that would defeat the "unguessable link" model).
 *   - deploy/robots.txt: disallow everything, so search engines never crawl
 *     or index a customer path, which would otherwise make an "unguessable"
 *     link guessable via a Google cache.
 *   - deploy/_headers: Basic Auth applied ONLY to /docs/internal/* — no
 *     directory index is generated for /docs/ itself, so there's no
 *     browsable listing of which customer folders exist.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BUILD_OUTPUT = path.join(ROOT, "multi-build-output");
const DEPLOY = path.join(ROOT, "deploy");

fs.rmSync(DEPLOY, { recursive: true, force: true });
fs.mkdirSync(path.join(DEPLOY, "docs"), { recursive: true });

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const targets = [
  { dir: "internal", destSub: "docs/internal" },
  { dir: "customer-acme", destSub: "docs/acme" },
  { dir: "customer-beta", destSub: "docs/beta" },
];

for (const t of targets) {
  const src = path.join(BUILD_OUTPUT, t.dir);
  if (!fs.existsSync(src)) {
    console.error(`Missing build output for ${t.dir} — run its build first.`);
    process.exit(1);
  }
  copyDir(src, path.join(DEPLOY, t.destSub));
  console.log(`Copied ${t.dir} -> ${t.destSub}`);
}

// Neutral root landing page — intentionally does not enumerate customer
// slugs or link to /docs/internal/. Someone landing on the bare domain
// learns nothing about who else is hosted here.
fs.writeFileSync(
  path.join(DEPLOY, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Minnovation Technologies</title></head>
<body style="font-family: sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem;">
  <h1>Minnovation Technologies</h1>
  <p>Documentation is available at the link provided to you by your account contact.</p>
  <p><a href="https://minnovation.com.au/">minnovation.com.au</a></p>
</body>
</html>
`
);

// robots.txt: disallow everything. Customer links are meant to be reached
// only via the direct URL given to that customer, never discovered through
// a search engine index or crawl.
fs.writeFileSync(
  path.join(DEPLOY, "robots.txt"),
  `User-agent: *
Disallow: /
`
);

// _headers: Basic Auth scoped ONLY to /docs/internal/*. Customer paths get
// no auth challenge (no-login requirement) and, just as importantly, no
// directory index — Netlify does not auto-generate folder listings, so
// /docs/ itself resolves to nothing browsable.
fs.writeFileSync(
  path.join(DEPLOY, "_headers"),
  `/docs/internal/*
  Basic-Auth: demo:letmein
`
);

// Defense in depth: some static hosts auto-generate a directory listing
// when no index file is present. Explicitly place a blocking page at
// /docs/ so that even a host with listing-on-by-default reveals nothing.
fs.writeFileSync(
  path.join(DEPLOY, "docs", "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Not Found</title></head>
<body style="font-family: sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem;">
  <h1>Not Found</h1>
  <p>Use the link provided to you by your account contact.</p>
</body>
</html>
`
);

console.log("\nAssembled deploy/ directory:");
console.log("  /                 -> neutral landing page (no customer links)");
console.log("  /docs/internal/*  -> Basic Auth protected, full staff tree");
console.log("  /docs/acme/*      -> no login, Acme-only public content");
console.log("  /docs/beta/*      -> no login, Beta-only public content");
console.log("  /docs/            -> no index, nothing browsable");
console.log("\nDemo credentials for internal: demo / letmein (change before real use)");
