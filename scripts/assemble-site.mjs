#!/usr/bin/env node
/**
 * Combines the two customer builds (customer-acme, customer-beta) into a
 * single deploy/ directory matching Netlify's publish root, then writes the
 * shared-surface protections:
 *   - deploy/index.html: a neutral landing page. Does NOT list customer
 *     paths/slugs (that would defeat the "unguessable link" model).
 *   - deploy/robots.txt: disallow everything, so search engines never crawl
 *     or index a customer path, which would otherwise make an "unguessable"
 *     link guessable via a Google cache.
 *
 * The internal staff build is deployed SEPARATELY to Cloudflare Pages,
 * gated by Cloudflare Access (free for teams under 50 users) — Netlify's
 * Basic-Auth-via-_headers feature turned out to be a Pro-plan-only
 * capability, so staff auth moved to a host where a real free tier covers
 * it. This also means Netlify's shared surface here only ever has to
 * protect customer-vs-customer isolation, not staff-vs-customer — one
 * less thing that could be misconfigured.
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

// _headers: no auth directive needed here anymore — internal moved to
// Cloudflare Pages/Access. Kept as a minimal security-headers file so
// customer paths still get sane defaults (and so re-adding a rule later,
// if ever needed, has an obvious place to go).
fs.writeFileSync(
  path.join(DEPLOY, "_headers"),
  `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
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

console.log("\nAssembled deploy/ directory (Netlify — customer sites only):");
console.log("  /             -> neutral landing page (no customer links)");
console.log("  /docs/acme/*  -> no login, Acme-only public content");
console.log("  /docs/beta/*  -> no login, Beta-only public content");
console.log("  /docs/        -> no index, nothing browsable");
console.log("\nInternal staff site deploys SEPARATELY to Cloudflare Pages,");
console.log("gated by Cloudflare Access — see multi-build-output/internal/");
console.log("and DEMO_WALKTHROUGH.md for the Cloudflare setup steps.");
