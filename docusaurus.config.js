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

  url: 'https://minnovation-multitenant-demo.example.com',
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
        style: 'dark',
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
