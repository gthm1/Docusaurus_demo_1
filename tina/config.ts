import { defineConfig } from "tinacms";

// Your Tina Cloud Client ID - set this after connecting the repo in
// app.tina.io (see DEMO_WALKTHROUGH.md for the exact steps).
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",

  build: {
    outputFolder: "admin",
    // Three distinct output targets, chosen by env vars set per script:
    //
    // 1. Local dev (npm run tina:dev, TINA_LOCAL_DEV=1) — needs the admin
    //    bundle inside static/, since Docusaurus's dev server only serves
    //    files from there.
    //
    // 2. Production internal build (npm run build:internal, which now also
    //    runs `tinacms build` afterward) — the editor is meant to be
    //    reachable at docusaurus-demo-internal.../admin/index.html,
    //    already behind Cloudflare Access. Output goes straight into
    //    multi-build-output/internal, the same folder Cloudflare deploys
    //    for that project.
    //
    // 3. Production customer builds (build:acme / build:beta) — MUST stay
    //    fully isolated in tina-admin-build/, well away from static/ or
    //    any customer output folder. An Acme or Beta visitor should have
    //    no way to even discover the CMS exists. TINA_BUILD_TARGET is only
    //    ever "internal" when this build is explicitly the internal one;
    //    for customer builds it's unset, so this falls through to the
    //    isolated folder by default — the safe default is "don't expose."
    publicFolder: process.env.TINA_LOCAL_DEV
      ? "static"
      : process.env.TINA_BUILD_TARGET === "internal"
        ? "multi-build-output/internal"
        : "tina-admin-build",
  },
  media: {
    tina: {
      mediaRoot: "img",
      publicFolder: "static",
    },
  },

  schema: {
    collections: [
      {
        name: "doc",
        label: "Documentation Pages",
        path: "content-source",
        format: "md",
        ui: {
          // Router lets editors preview the page they're editing, once a
          // preview server / deployed URL is wired up. Left simple for the
          // demo — editors land on the standard full-page form/rich-text
          // editor either way.
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "visibility",
            label: "Visibility",
            required: true,
            options: [
              { value: "public", label: "Public — visible to the customer / external visitors" },
              { value: "internal", label: "Internal — staff only" },
            ],
            description:
              "Controls which isolated build includes this page. Internal pages never appear in a customer's own site, even within that customer's folder.",
          },
          {
            type: "string",
            name: "customer",
            label: "Customer",
            options: [
              { value: "acme", label: "Acme Corp" },
              { value: "beta", label: "Beta Industries" },
            ],
            description:
              "Leave blank for general internal documentation not tied to any customer. Set this to scope the page to one customer's area.",
          },
          {
            type: "number",
            name: "sidebar_position",
            label: "Sidebar Position",
            description: "Lower numbers appear first in the sidebar.",
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
            templates: [
              {
                name: "Admonition",
                label: "Callout / Admonition",
                fields: [
                  {
                    type: "string",
                    name: "type",
                    label: "Type",
                    options: ["note", "tip", "info", "warning", "danger"],
                  },
                  {
                    type: "rich-text",
                    name: "children",
                    label: "Content",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
