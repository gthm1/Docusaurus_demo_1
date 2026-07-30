# GitHub + Docusaurus: Multi-Tenant Demo Walkthrough

## What this proves

The refined requirement had three parts:

1. **Internal staff tier** — ~10 staff, login required, sees everything
2. **Per-customer isolated tiers** — unknown/growing count, no login, reachable
   only via an unguessable link, cannot see each other
3. **Mixed visibility within a customer's own section** — some pages public
   to that customer, some staff-only, coexisting in the same customer area

This demo proves all three using one GitHub repo, a single tagged content
source, and **three separate Cloudflare Pages projects** — one per
audience, each its own deployment with no shared domain or deploy root.
Isolation between customer builds is a build-time guarantee (verified by
inspecting compiled output directly); hosting each on its own project adds
a second, independent layer on top — there's no shared surface between
sites at all, not even a shared deploy folder.

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

## Three Cloudflare Pages projects, not shared hosting

This went through two revisions worth explaining, since each one taught
something real about the tradeoffs.

**Revision 1 — one Netlify site, path-based.** All three builds assembled
into one `deploy/` folder, published as one Netlify site, with the internal
path gated by Basic Auth via a `_headers` file. This worked for isolation
(verified no cross-tenant leakage in compiled output) but had two real
problems once tested live: **Netlify's `Basic-Auth` header directive turned
out to be Pro-plan only** — silently ignored on Free, no error, just no
auth prompt — confirmed by testing the live deploy and finding
`/docs/internal/` fully open. Separately, Netlify's credit-based free tier
charges ~15 credits per production deploy regardless of build time, so
iterating on a demo burns through the 300-credit monthly allowance fast.

**Revision 2 — split hosts.** Moved internal to Cloudflare Pages, gated by
Cloudflare Access (genuinely free for teams under 50 users). Customer sites
stayed on Netlify for a moment, but the credit-burn problem remained there.

**Current, final architecture — everything on Cloudflare Pages, as three
separate projects:**

| Project | Content | Access |
|---|---|---|
| `internal` | everything: all customers' public + staff-only pages, plus general internal docs | Cloudflare Access (free, up to 50 users) |
| `customer-acme` | only Acme's public pages | none — reachable only via its own unguessable `*.pages.dev` link |
| `customer-beta` | only Beta's public pages | none — reachable only via its own unguessable `*.pages.dev` link |

Cloudflare Pages' free tier has no credit meter at all — **unlimited
bandwidth, 500 builds/month included**, so iterating on this demo (or
running it in production at Minnovation's traffic scale) costs nothing.
Each project is a fully separate Git-connected deployment: separate build,
separate output, separate domain. There's no shared deploy root left to
misconfigure, no `robots.txt`/blocking-page work needed the way the
shared-Netlify-site model required — the isolation that used to depend on
careful configuration is now structural, because there's no shared surface
to leak across in the first place.

Every build now uses `baseUrl: /`, since each one is the entire site for
its project rather than a subpath sharing a domain with siblings.

### Setup steps (repeat per project — internal, acme, beta)

1. Push this repo to GitHub (`gthm1` account) — one push covers all three,
   since they all build from the same repo. If the repo doesn't exist on
   GitHub yet:
   - Go to **github.com/new**, sign in as `gthm1`, name it (e.g.
     `gd-multitenant-demo`), leave it empty — no README, no `.gitignore`,
     no license — then **Create repository**
   - Locally, from inside this project folder, in PowerShell:
     ```powershell
     git remote add origin https://github.com/gthm1/gd-multitenant-demo.git
     git branch -M main
     git push -u origin main
     ```
   - If prompted for credentials, GitHub no longer accepts your account
     password over HTTPS — use a **Personal Access Token** instead
     (GitHub → Settings → Developer settings → Personal access tokens →
     Generate new token, paste it in place of the password when asked), or
     sign in via `gh auth login` if the GitHub CLI is installed
   - If the repo already exists and a remote is already configured, just
     run `git push` from inside the project folder to push this update
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to
   Git**, select this repo
3. Build settings for that project:
   - Build command: `npm run build:internal` (or `build:acme` / `build:beta`
     depending on which project this is)
   - Build output directory: `multi-build-output/internal` (or
     `multi-build-output/customer-acme` / `customer-beta`)
4. Deploy — gives a `*.pages.dev` URL immediately

Repeat for all three — same repo, same source, different build command and
output directory per project, three independent URLs.

### Gating internal with Cloudflare Access

Only needed on the `internal` project — leave `customer-acme` and
`customer-beta` ungated, since the requirement is no-login for customers.

1. **Zero Trust → Access → Applications → Add an application →
   Self-hosted**
2. Set the application domain to the internal project's `*.pages.dev` URL
   (or a custom subdomain once one's mapped, e.g.
   `internal.minnovation.com.au`)
3. Add a policy — for the demo, an **Include** rule on staff email
   addresses (or an email domain match, e.g. `*@minnovation.com.au`) is the
   simplest starting policy. This is real per-person gating, not a shared
   password — already a meaningful step up from the Basic Auth demo model,
   and the same mechanism the project's long-term SSO plan already pointed
   toward.
4. Visiting the internal site now prompts for Cloudflare Access login
   (email code, or whatever identity provider gets connected later) before
   serving any content — the gate sits at Cloudflare's edge, in front of
   the site, not inside it.

### Honest tradeoff for the manager writeup

Going to one-project-per-tenant is the **strongest isolation option** this
demo has used — stronger than the original shared-Netlify-site plan, and
it happened to be a side effect of chasing cost and auth fixes rather than
a deliberate isolation upgrade. Worth naming both sides plainly:

- **Isolation**: each site is a fully separate deployment. No shared
  `robots.txt`, no shared `_headers`, no risk of one misconfigured file
  affecting multiple tenants. This is the same isolation strength as
  GitBook's per-space model, at zero incremental hosting cost.
- **Operational overhead**: adding a new customer means creating a new
  Cloudflare Pages project (a few clicks or one API call), not just adding
  a folder to an existing deploy. At 20+ customers this is more clicking
  around than the shared-site model would have needed, though it's
  scriptable via Cloudflare's API if that becomes worth automating.
- **No more $/customer concern at this scale**: since Cloudflare Pages'
  free tier has no bandwidth billing and 500 builds/month, the earlier
  cost-scaling math (~$20-50/month on Netlify Pro for 20 customers) is now
  moot for this specific architecture — the free tier likely covers
  Minnovation's traffic and customer count entirely, unless growth is
  large enough to hit the 500-builds/month ceiling, which only 500+
  deploys across all projects combined would trigger.

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
structurally impossible for the editor to leak into any customer's
`multi-build-output/customer-*` output. Verified directly: grepped every
customer build's compiled output for `admin`/`tina` strings and folders —
clean, both before and after publishing this fix.

The practical implication: Tina editing happens in its own environment
(local `npm run tina:dev`, or a protected staff-only deployment), completely
separate from all three production Cloudflare Pages projects. Editors save
through Tina → Tina commits to git → each affected Cloudflare Pages project
auto-rebuilds from the updated source (Cloudflare Pages redeploys on every
push to the connected branch, same as Netlify would have).

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
`NEXT_PUBLIC_TINA_CLIENT_ID` / `TINA_TOKEN` env vars get set on a fourth
Cloudflare Pages project (or Vercel) running `npm run tina:build` — kept as
a **separate** project from all three production sites, consistent with
the isolation principle above: editors' access to the CMS shouldn't share
any deployment surface with the sites being edited.

### Swapping CMS later

Content lives as plain markdown + frontmatter in `content-source/`, which
is portable across CMS tools — Tina, Dhub, or Decap all read/write the same
files. Only the CMS's own config/schema (`tina/config.ts` here) is
tool-specific and would need rewriting if the CMS changes; the content
itself would not need migrating.


```
npm install
npm run build:internal   # builds the staff site (all content, baseUrl: /)
npm run build:acme       # builds Acme's site (Acme public pages only)
npm run build:beta       # builds Beta's site (Beta public pages only)
npm run build:all        # builds all three locally, for testing everything at once
```

Each command is also exactly what its corresponding Cloudflare Pages
project runs in production — same script, same output directory
(`multi-build-output/<target>`), no separate CI config needed beyond what's
set once in each project's dashboard.

To add a new customer: create `content-source/customers/<slug>/`, tag files
with `customer: <slug>`, add a `build:<slug>` script following the existing
pattern in `package.json`, then create a new Cloudflare Pages project
pointed at that build command and its output directory.
