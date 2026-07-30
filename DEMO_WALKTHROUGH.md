# GitHub + Docusaurus: Multi-Tenant Demo Walkthrough

## What this proves

The refined requirement had three parts:

1. **Internal staff tier** — ~10 staff, login required, sees everything
2. **Per-customer isolated tiers** — unknown/growing count, no login, reachable
   only via an unguessable link, cannot see each other
3. **Mixed visibility within a customer's own section** — some pages public
   to that customer, some staff-only, coexisting in the same customer area

This demo proves all three using one GitHub repo, a single tagged content
source, and **two hosting providers split by audience**: Cloudflare Pages
(internal staff, gated by Cloudflare Access) and Netlify (customer sites,
no login). Isolation between customer builds is a build-time guarantee
either way — the split only changed *where* the internal build lives and
*how* it's gated.

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

## Two hosts, split by audience

This changed partway through building the demo, worth explaining why.

The original plan hosted all three builds on one Netlify site, with the
internal path gated by Basic Auth via a `_headers` file. In practice, that
turned out not to work: **Netlify's `Basic-Auth` header directive is a
Pro-plan-only feature** — on the Free plan it's silently ignored, no error,
just no auth prompt. Confirmed directly against Netlify's own docs after
testing the live deploy and finding `/docs/internal/` fully open with no
password challenge.

Two fixes were available: upgrade the Netlify team to Pro (~$20/month), or
move the internal build to a host with a genuinely free auth layer. Went
with the second, since **Cloudflare Access already has a free tier for up to
50 users** — comfortably covers Minnovation's ~10-person staff team — and
Cloudflare Access was already the leading long-term SSO candidate in this
project's notes anyway. This isn't a workaround; it's closer to the actual
production plan than Basic Auth ever was.

**Current split:**

| Build | Host | Access |
|---|---|---|
| `internal` | Cloudflare Pages | Cloudflare Access (free, up to 50 users) |
| `customer-acme` | Netlify | no login, obscure path |
| `customer-beta` | Netlify | no login, obscure path |

The internal build now deploys at its own domain root (`baseUrl: /`)
instead of a `/docs/internal/` subpath, since it's a dedicated site rather
than sharing Netlify with the customer builds. Nothing about the content
filtering or isolation logic changed — only where the internal output ships
and how it's gated.

### Netlify: customer sites only

```
deploy/
  index.html      neutral landing page — no customer links, no hints
  robots.txt       Disallow: / (customer links must never become
                    crawlable/searchable, or "unguessable" stops being true)
  _headers          baseline security headers only (X-Frame-Options etc.) —
                    no auth directive needed here anymore
  docs/
    index.html     explicit "Not Found" page — blocks directory listing
                    even on hosts that auto-list folders
    acme/          <- no login, only reachable if you have the link
    beta/          <- no login, only reachable if you have the link
```

Visiting `/docs/` resolves to a blocking page, not a list of customers.
Nothing anywhere in the deployment links to or enumerates `/docs/acme/` or
`/docs/beta/` — same "obscure link" model as the current GitBook setup.

**Netlify deploy steps:**
1. Push this repo to GitHub (`gthm1` account)
2. Netlify: **Add new site → Import an existing project → Deploy with
   GitHub**, select this repo
3. Netlify reads `netlify.toml` automatically — build command
   `npm run build:netlify` (builds Acme + Beta only, then assembles
   `deploy/`), publish directory `deploy`

### Cloudflare Pages: internal staff site

**Setup steps:**
1. Go to the Cloudflare dashboard → **Workers & Pages → Create → Pages →
   Connect to Git**, select this same GitHub repo
2. Build settings:
   - Framework preset: **Docusaurus** (or None, if not offered — the
     explicit build command below covers it either way)
   - Build command: `npm run build:cloudflare`
   - Build output directory: `multi-build-output/internal`
3. Deploy. This gives a `*.pages.dev` URL, fully open at this point — the
   gate comes from Access, added next.
4. Go to **Zero Trust → Access → Applications → Add an application →
   Self-hosted**
5. Set the application domain to the `*.pages.dev` URL (or a custom
   subdomain once one's mapped, e.g. `internal.minnovation.com.au`)
6. Add a policy — for the demo, an **Include** rule on staff email
   addresses (or an email domain match, e.g. `*@minnovation.com.au`) is
   the simplest starting policy. This is real per-person gating, not a
   single shared password — a meaningful upgrade over the Basic Auth demo
   credential model.
7. Visiting the site now prompts for Cloudflare Access login (email code or
   your chosen identity provider) before serving any content at all —
   the gate sits in front of Cloudflare's edge, not inside the site.

### Honest tradeoff for the manager writeup

Customer sites remain **one shared Netlify deployment surface**, not one
isolated site per customer — a deliberate choice to fit budget constraints,
carried over from the earlier decision:

- **Cheaper and simpler to operate** — one site, one deploy, no
  per-customer infrastructure to provision as customer count grows
- **But isolation depends on careful configuration** — `robots.txt` and
  blocking pages are doing real work here. A future misconfiguration (e.g.
  someone re-adding a sitemap, or an index page that lists paths) could
  weaken it. A one-site-per-customer model (or GitBook's native per-space
  hosting) doesn't carry this shared-surface risk, because there's no
  shared infrastructure to misconfigure
- The internal/customer split onto separate hosts is a net isolation
  *improvement* over the original single-site plan, incidentally: staff
  auth and customer content no longer share any deployment surface at all,
  which is a stronger boundary than Basic Auth on a shared site would ever
  have been

## Editing content: TinaCMS

Content editing uses [TinaCMS](https://tina.io) with a Tina Cloud backend —
a git-backed CMS with genuine block-style, in-context editing (slash-menu
tables, code blocks, and custom "Admonition" callout blocks), rather than a
plain markdown textarea.

### Why Tina points at `content-source/`, not `docs/`

`docs/` is a generated folder — it gets wiped and rewritten by
`scripts/prepare-and-build.mjs` on every build, filtered per target. Editing
it directly would be pointless; changes would vanish on the next build. Tina
is configured (`tina/config.ts`) to edit `content-source/` instead — the one
tagged source of truth that both Tina and our build script read from.

Tina's schema exposes exactly the fields our system relies on:

- **Visibility** — `public` or `internal`, as a dropdown (not free text, so
  it can't be mistyped in a way that silently breaks filtering)
- **Customer** — `acme`, `beta`, or left blank for general internal docs
- **Body** — rich-text block editor, with a custom `Admonition` block type
  for callouts, in addition to the built-in tables/code blocks

### Isolation: the CMS itself never ships to customer sites

This mattered enough to catch and fix during setup: Tina's own admin editor
bundle must **never** end up inside a customer's isolated public build — an
Acme visitor should have no way to even discover the CMS exists, let alone
reach it. Docusaurus copies its `static/` folder verbatim into every build
with no filtering at all, so `tina/config.ts` explicitly builds Tina's admin
UI into a separate `tina-admin-build/` folder outside `static/`, keeping it
structurally impossible for the editor to leak into `deploy/docs/acme/` or
`deploy/docs/beta/`. Verified directly: grepped every customer build's
compiled output for `admin`/`tina` strings and folders — clean, both before
and after publishing this fix.

The practical implication: Tina editing happens in its own environment
(local `npm run tina:dev`, or a protected staff-only deployment), completely
separate from the production static builds — which, since the hosting
split, now means it's also separate from *both* the Cloudflare and Netlify
deployments. Editors save through Tina → Tina commits to git → the next
`npm run build:internal` / `npm run build:netlify` (or CI running the same)
regenerates the affected isolated sites from the updated source.

### Tina Cloud setup (one-time, manual)

Tina Cloud's free tier covers up to 2 users — fine for this demo, worth
reviewing against the full ~10-person team size before deciding this is the
long-term CMS.

1. Push this repo to GitHub first (see above)
2. Go to **app.tina.io** and sign up / log in
3. **Create a new project → Import an existing repo**, pick
   `gthm1/gd-multitenant-demo`
4. Tina Cloud will detect `tina/config.ts` automatically
5. Copy the generated **Client ID** and **Read-only token** from the
   project's Overview page
6. Locally: `cp .env.local.example .env.local` and paste those two values in
7. Run `npm run tina:dev` — this starts Docusaurus alongside Tina's local
   editor, reachable at `http://localhost:3000/admin/index.html`
8. Log in with your Tina Cloud account, browse to a doc, and edit — changes
   save straight to the markdown files in `content-source/`

For a hosted (non-local) editing environment for your team, the same
`NEXT_PUBLIC_TINA_CLIENT_ID` / `TINA_TOKEN` env vars get set on a Netlify (or
Vercel) deployment that runs `npm run tina:build` instead of the production
`build:all` — kept as a **separate** deployment from the public/customer
Netlify site, consistent with the isolation principle above.

### Swapping CMS later

Content lives as plain markdown + frontmatter in `content-source/`, which
is portable across CMS tools — Tina, Dhub, or Decap all read/write the same
files. Only the CMS's own config/schema (`tina/config.ts` here) is
tool-specific and would need rewriting if the CMS changes; the content
itself would not need migrating.


```
npm install
npm run build:internal    # builds just the staff site (baseUrl: /)
npm run build:acme        # builds just Acme's site
npm run build:beta        # builds just Beta's site
npm run build:netlify     # builds Acme + Beta + assembles deploy/ (what Netlify runs)
npm run build:cloudflare  # alias for build:internal (what Cloudflare Pages runs)
npm run build:all         # builds all three locally, for testing everything at once
```

To add a new customer: create `content-source/customers/<slug>/`, tag files
with `customer: <slug>`, add a `build:<slug>` script following the existing
pattern, and add the target to `scripts/assemble-site.mjs`'s `targets` array
and to `build:netlify`.
