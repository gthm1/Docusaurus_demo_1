# GitHub + Docusaurus: Multi-Tenant Demo Walkthrough

## What this proves

The refined requirement had three parts:

1. **Internal staff tier** — ~10 staff, login required, sees everything
2. **Per-customer isolated tiers** — unknown/growing count, no login, reachable
   only via an unguessable link, cannot see each other
3. **Mixed visibility within a customer's own section** — some pages public
   to that customer, some staff-only, coexisting in the same customer area

This demo proves all three using one GitHub repo, one Netlify site, and a
single tagged content source — while keeping isolation as a build-time
guarantee rather than a runtime access-control check.

## Architecture

```
content-source/                  <- single source of truth, git-tracked
  internal-general/
    support-playbook.md          visibility: internal
    pricing-notes.md             visibility: internal
  customers/
    acme/
      getting-started.md         customer: acme, visibility: public
      api-reference.md           customer: acme, visibility: public
      installation-guide.md      customer: acme, visibility: public
      account-notes.md           customer: acme, visibility: internal  <- staff-only
      support-history.md         customer: acme, visibility: internal <- staff-only
    beta/
      getting-started.md         customer: beta, visibility: public
      api-reference.md           customer: beta, visibility: public
      account-notes.md           customer: beta, visibility: internal <- staff-only
```

Every file carries `visibility` and (for customer content) `customer`
frontmatter. Nothing about access control lives in the page content itself —
it's metadata the build script reads.

## The build: three isolated static builds, not one

This is the part that needed real care. A single Docusaurus build with
"hidden" routes would still ship every customer's sidebar and search index
JSON to every visitor's browser — technically unlisted, but readable by
anyone who opens devtools. That's not real isolation.

Instead, `scripts/prepare-and-build.mjs` runs **three separate, independent
Docusaurus builds** from the same source:

| Build | Filter applied | Output |
|---|---|---|
| `internal` | everything | full staff tree: all customers (public + internal pages) + general internal docs |
| `customer-acme` | `customer: acme AND visibility: public` | only Acme's 3 public pages |
| `customer-beta` | `customer: beta AND visibility: public` | only Beta's 2 public pages |

Each build gets its own `docs/` folder (copied fresh from `content-source/`
per build, then wiped before the next), its own sidebar, and its own search
index. A customer build never has the other customer's files on disk during
its build — they're not filtered out after the fact, they're never copied in.

**Verified directly**, not just assumed: after building, I grepped the
compiled JS/HTML of Acme's build for the string `"beta"` and for the other
customer's and internal pages' slugs. Zero matches. Same check the other
direction for Beta. The isolation is real at the artifact level.

## The result: mixed visibility, proven

In the **internal** build's output:

```
customers/acme/getting-started/     <- public, visible to Acme too
customers/acme/api-reference/       <- public, visible to Acme too
customers/acme/installation-guide/  <- public, visible to Acme too
customers/acme/account-notes/       <- staff-only, NOT in Acme's build
customers/acme/support-history/     <- staff-only, NOT in Acme's build
```

Same folder, same customer, mixed visibility — exactly the requirement.
Staff browsing the internal site see all five pages in one place. Acme's own
site, built from the same source, only contains three of them.

## One deployment, three paths

Because of the Netlify credit constraint, this demo uses **one Netlify
site**, not one site per tenant. All three builds are assembled into a single
`deploy/` directory and published together:

```
deploy/
  index.html              neutral landing page — no customer links, no hints
  robots.txt               Disallow: / (customer links must never become
                            crawlable/searchable, or "unguessable" stops
                            being true)
  _headers                  Basic-Auth scoped ONLY to /docs/internal/*
  docs/
    index.html             explicit "Not Found" page — blocks directory
                            listing even on hosts that auto-list folders
    internal/              <- Basic Auth required
    acme/                  <- no login, only reachable if you have the link
    beta/                  <- no login, only reachable if you have the link
```

Visiting `/docs/` itself resolves to a blocking page, not a list of
customers. There is no page anywhere in the deployment that links to or
enumerates `/docs/acme/` or `/docs/beta/` — those paths only work if you
already have the URL, which is the same "obscure link" model the current
GitBook setup uses per-space.

## Honest tradeoff for the manager writeup

This is **one shared deployment surface**, not one isolated site per
customer (like GitBook, or like giving each customer their own Netlify
site). That was a deliberate choice to fit the current Netlify plan's
constraints. The consequence:

- **Cheaper and simpler to operate** — one site, one deploy, no per-customer
  infrastructure to provision as customer count grows
- **But isolation depends on careful configuration** — the `_headers` file,
  `robots.txt`, and blocking pages are all doing the isolation work. A future
  misconfiguration (e.g. someone accidentally adding a sitemap or an index
  page that lists paths) could weaken it. A one-site-per-customer model (or
  GitBook's native per-space hosting) doesn't have this shared-surface risk
  at all, because there's no shared infrastructure to misconfigure
- If customer count grows a lot, the per-customer path model also means
  every customer add requires a new build target + a new deploy step (though
  this is scriptable — adding a customer is one new folder in
  `content-source/customers/` plus one line in the build script's target
  list)

## How to deploy

1. Push this repo to GitHub (`gthm1` account)
2. In Netlify: **Add new site → Import an existing project → Deploy with
   GitHub**, select this repo
3. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build:all` (runs all three isolated builds,
     then assembles them into `deploy/`)
   - Publish directory: `deploy`
4. Deploy. Demo credentials for the internal path are `demo` / `letmein` —
   **change these before this touches anything real**, and note the repo is
   public, so anyone can read the demo credentials from source. For a real
   deployment, this is where Cloudflare Access would replace Basic Auth
   entirely, same as the two-tier demo before it.

## Local build commands

```
npm install
npm run build:internal   # builds just the staff site
npm run build:acme       # builds just Acme's site
npm run build:beta       # builds just Beta's site
npm run build:all        # builds all three + assembles deploy/
```

To add a new customer: create `content-source/customers/<slug>/`, tag files
with `customer: <slug>`, add a `build:<slug>` script following the existing
pattern, and add the target to `scripts/assemble-site.mjs`'s `targets` array.
