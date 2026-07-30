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
    // Local dev (npm run tina:dev) needs the admin bundle inside static/,
    // since Docusaurus's dev server only serves files from there — nothing
    // outside static/ is reachable at localhost:3000/admin/index.html.
    //
    // Production builds (npm run build:internal / build:acme / build:beta)
    // must NOT use static/ here, because Docusaurus copies static/ verbatim
    // into every build with no filtering — that would leak the Tina admin
    // bundle into the customer-facing Acme/Beta sites, letting anyone with
    // the link discover and potentially reach the CMS. TINA_LOCAL_DEV is
    // set only by the tina:dev script below, never by the build:* scripts.
    publicFolder: process.env.TINA_LOCAL_DEV ? "static" : "tina-admin-build",
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
