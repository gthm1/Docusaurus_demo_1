// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Read env vars set by scripts/prepare-and-build.mjs so each isolated
// build gets its own baseUrl, title, and branding. Falls back to
// sensible dev defaults if run directly with `npm start`.
const BUILD_TARGET = process.env.BUILD_TARGET || 'internal';
const DOCS_BASE_URL = process.env.DOCS_BASE_URL || '/';

const isCustomerBuild = BUILD_TARGET.startsWith('customer-');
const customerSlug = isCustomerBuild ? BUILD_TARGET.replace('customer-', '') : null;

const CUSTOMER_LABELS = {
  acme: 'Acme Corp',
  beta: 'Beta Industries',
};

// Real Cloudflare Workers domains per target. The placeholder used here
// before (a fake example.com) was harmless for page rendering since most
// links are relative, but it broke the search plugin's runtime asset-path
// construction, which uses `url` + `baseUrl` to build absolute fetch URLs
// for the search index — pointing search at the wrong origin entirely.
const SITE_URLS = {
  internal: 'https://docusaurus-demo-internal.gowthamreddy020598.workers.dev',
  'customer-acme': 'https://docusaurus-demo-acme.gowthamreddy020598.workers.dev',
  'customer-beta': 'https://docusaurus-demo-beta.gowthamreddy020598.workers.dev',
};
const siteUrl = SITE_URLS[BUILD_TARGET] || SITE_URLS.internal;

const siteTitle = isCustomerBuild
  ? `Minnovation Docs — ${CUSTOMER_LABELS[customerSlug] || customerSlug}`
  : 'Minnovation Internal Docs';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: siteTitle,
  tagline: 'Minnovation Technologies documentation',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: siteUrl,
  baseUrl: DOCS_BASE_URL,

  organizationName: 'gthm1',
  projectName: 'gd-multitenant-demo',

  onBrokenLinks: 'throw',

  // No blog in this demo — reduces surface area for accidental leakage
  // and keeps each isolated build strictly docs-only.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // docs ARE the whole site for each isolated build
          editUrl: undefined, // no "edit this page" — avoids leaking a shared repo link on customer builds
        },
        blog: false,
        sitemap: false, // no sitemap.xml — pointless given robots.txt disallows all crawling, and one less generated file to reason about
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  // Offline/local search — builds its index at build time from whatever
  // ended up in THIS build's docs/ folder only. That's an important
  // property given everything else in this project: since each of the
  // three targets (internal/acme/beta) is a fully separate build with its
  // own filtered docs/, the search index can only ever contain that
  // target's own pages. There's no way for Acme's search to surface a
  // Beta or internal-only page, because the plugin never sees them in the
  // first place — same isolation guarantee as the rest of the site,
  // extended to search without any extra work. This also avoids sending
  // any search queries to a third-party service (e.g. Algolia), which
  // matters since customer search terms shouldn't leave the build itself.
  //
  // Using @cmfcmf/docusaurus-search-local (the original), not the
  // @easyops-cn fork — the fork silently failed to write its index file
  // in this environment: build logs stopped right after "parsing
  // documents" with no error and no search-index.json ever produced,
  // reproducible across repeated builds and confirmed unrelated to our
  // custom --out-dir wrapper (same failure with a completely plain
  // `docusaurus build`). Switching packages fixed it outright — @cmfcmf
  // writes its index correctly every time, confirmed with DEBUG logging
  // showing "Index ... written to disk". Isolation re-verified against
  // the working index: zero cross-tenant leakage either direction.
  plugins: [
    [
      require.resolve('@cmfcmf/docusaurus-search-local'),
      /** @type {any} */
      ({
        indexBlog: false,
        indexPages: false,
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: siteTitle,
        logo: {
          alt: 'Minnovation Technologies',
          src: 'img/logo.svg',
        },
        items: [],
      },
      footer: {
        // 'light' follows the active color mode instead of forcing a
        // dark bar in light theme — matches GitBook's minimal, low-
        // contrast footer treatment.
        style: 'light',
        links: [],
        copyright: isCustomerBuild
          ? `Minnovation Technologies — Documentation for ${CUSTOMER_LABELS[customerSlug] || customerSlug}`
          : `Minnovation Technologies — Internal Staff Documentation`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
