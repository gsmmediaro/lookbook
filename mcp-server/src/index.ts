#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from "path";
import {
  type AppInfo,
  buildCatalog,
  fillSpecTemplateHeader,
  findApp,
  fuzzyMatch,
  readDesignSpec,
  readImageBase64,
  resolveApp,
  sampleIndices,
  saveDesignSpec,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DESIGNS_DIR = path.resolve(__dirname, "../../designs");

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "lookbook",
  version: "1.0.0",
});

let catalog: AppInfo[] = [];

function getCatalog(): AppInfo[] {
  if (catalog.length === 0) catalog = buildCatalog(DESIGNS_DIR);
  return catalog;
}

function findAppInCatalog(nameQuery: string): AppInfo | undefined {
  return findApp(getCatalog(), nameQuery);
}

// ---------------------------------------------------------------------------
// Tool: list_apps
// ---------------------------------------------------------------------------

server.tool(
  "list_apps",
  "List all apps in the design library. Optionally filter by category (Mobile Apps, Web Apps, Landing Pages) or platform (ios, web, android).",
  {
    category: z.enum(["Mobile Apps", "Web Apps", "Landing Pages", "all"]).default("all").describe("Filter by category"),
    platform: z.string().optional().describe("Filter by platform: ios, web, android"),
  },
  async ({ category, platform }) => {
    let apps = getCatalog();

    if (category !== "all") {
      apps = apps.filter((a) => a.category === category);
    }
    if (platform) {
      apps = apps.filter((a) => a.platform === platform.toLowerCase());
    }

    const lines = apps.map(
      (a) =>
        `${a.name} | ${a.platform} | ${a.date || "n/a"} | ${a.category} | ${a.isZipped ? "zipped" : a.screenCount + " screens"}`
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${apps.length} apps:\n\n` + lines.join("\n"),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: search_apps
// ---------------------------------------------------------------------------

server.tool(
  "search_apps",
  "Search for apps by name. Returns matching apps with metadata.",
  {
    query: z.string().describe("Search query — app name or partial match"),
  },
  async ({ query }) => {
    const apps = getCatalog().filter((a) => fuzzyMatch(query, a.name));

    if (apps.length === 0) {
      return {
        content: [{ type: "text" as const, text: `No apps found matching "${query}".` }],
      };
    }

    const lines = apps.map(
      (a) =>
        `${a.name} | ${a.platform} | ${a.date || "n/a"} | ${a.category} | ${a.isZipped ? "zipped" : a.screenCount + " screens"}`
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${apps.length} apps matching "${query}":\n\n` + lines.join("\n"),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_app_info
// ---------------------------------------------------------------------------

server.tool(
  "get_app_info",
  "Get detailed info about a specific app including screen count and available screen indices.",
  {
    app_name: z.string().describe("App name (e.g. 'Perplexity', 'Claude', 'Notion')"),
  },
  async ({ app_name }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found. Use list_apps or search_apps to browse.` }],
      };
    }

    const resolved = resolveApp(app);
    const idx = catalog.findIndex((a) => a.name === resolved.name && a.category === resolved.category);
    if (idx >= 0) catalog[idx] = resolved;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `App: ${resolved.name}`,
            `Platform: ${resolved.platform}`,
            `Date: ${resolved.date || "unknown"}`,
            `Category: ${resolved.category}`,
            `Screens: ${resolved.screenCount}`,
            `Screen indices: 0 to ${resolved.screenCount - 1}`,
            "",
            "First 20 screen filenames:",
            ...resolved.screens.slice(0, 20).map((s, i) => `  [${i}] ${s}`),
            resolved.screenCount > 20 ? `  ... and ${resolved.screenCount - 20} more` : "",
          ].join("\n"),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_screenshots
// ---------------------------------------------------------------------------

server.tool(
  "get_screenshots",
  "Get screenshot images from an app for visual analysis. Returns base64-encoded images. Use 'sample' mode for an overview (default 8 evenly-spaced screens) or 'indices' mode for specific screens.",
  {
    app_name: z.string().describe("App name"),
    mode: z.enum(["sample", "indices"]).default("sample").describe("'sample' = evenly-spaced overview, 'indices' = specific screens"),
    count: z.number().min(1).max(20).default(8).describe("Number of screens to sample (sample mode only)"),
    indices: z.array(z.number()).optional().describe("Specific screen indices to retrieve (indices mode only)"),
  },
  async ({ app_name, mode, count, indices }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found.` }],
      };
    }

    const resolved = resolveApp(app);
    const idx = catalog.findIndex((a) => a.name === resolved.name && a.category === resolved.category);
    if (idx >= 0) catalog[idx] = resolved;

    if (resolved.screenCount === 0) {
      return {
        content: [{ type: "text" as const, text: `No screens found for "${resolved.name}".` }],
      };
    }

    let selectedIndices: number[];
    if (mode === "indices" && indices) {
      selectedIndices = indices.filter((i) => i >= 0 && i < resolved.screenCount);
    } else {
      selectedIndices = sampleIndices(resolved.screenCount, count);
    }

    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
    content.push({
      type: "text" as const,
      text: `${resolved.name} (${resolved.platform}) — showing ${selectedIndices.length} of ${resolved.screenCount} screens:`,
    });

    for (const si of selectedIndices) {
      const filename = resolved.screens[si];
      const filePath = path.join(resolved.screenDir, filename);
      try {
        const { data, mimeType } = readImageBase64(filePath);
        content.push({
          type: "text" as const,
          text: `\n--- Screen [${si}]: ${filename} ---`,
        });
        content.push({
          type: "image" as const,
          data,
          mimeType,
        });
      } catch {
        content.push({
          type: "text" as const,
          text: `\n--- Screen [${si}]: ${filename} (failed to read) ---`,
        });
      }
    }

    return { content };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_screen
// ---------------------------------------------------------------------------

server.tool(
  "get_screen",
  "Get a single full-resolution screenshot by app name and screen index.",
  {
    app_name: z.string().describe("App name"),
    index: z.number().min(0).describe("Screen index (0-based)"),
  },
  async ({ app_name, index }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found.` }],
      };
    }

    const resolved = resolveApp(app);
    if (index >= resolved.screenCount) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Index ${index} out of range. ${resolved.name} has ${resolved.screenCount} screens (0-${resolved.screenCount - 1}).`,
          },
        ],
      };
    }

    const filename = resolved.screens[index];
    const filePath = path.join(resolved.screenDir, filename);
    const { data, mimeType } = readImageBase64(filePath);

    return {
      content: [
        { type: "text" as const, text: `${resolved.name} — Screen [${index}]: ${filename}` },
        { type: "image" as const, data, mimeType },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: extract_design_system
// ---------------------------------------------------------------------------

server.tool(
  "extract_design_system",
  "Get a curated set of representative screens from an app optimized for design system extraction. If a DESIGN.md spec has been previously saved (via save_design_spec), it is returned alongside the screenshots — giving you both the visual reference and the structured spec. If no spec exists yet, a blank template is provided for you to fill in by analyzing the screenshots, then save via save_design_spec.",
  {
    app_name: z.string().describe("App name to analyze"),
    max_screens: z.number().min(4).max(20).default(12).describe("Maximum number of screens to return"),
  },
  async ({ app_name, max_screens }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found.` }],
      };
    }

    const resolved = resolveApp(app);
    const idx = catalog.findIndex((a) => a.name === resolved.name && a.category === resolved.category);
    if (idx >= 0) catalog[idx] = resolved;

    if (resolved.screenCount === 0) {
      return {
        content: [{ type: "text" as const, text: `No screens found for "${resolved.name}".` }],
      };
    }

    const total = resolved.screenCount;
    const regions = [
      { label: "Onboarding / Login", start: 0, end: Math.floor(total * 0.1) },
      { label: "Main Navigation", start: Math.floor(total * 0.1), end: Math.floor(total * 0.25) },
      { label: "Content / Feed", start: Math.floor(total * 0.25), end: Math.floor(total * 0.45) },
      { label: "Detail Views", start: Math.floor(total * 0.45), end: Math.floor(total * 0.6) },
      { label: "Forms / Input", start: Math.floor(total * 0.6), end: Math.floor(total * 0.75) },
      { label: "Settings / Profile", start: Math.floor(total * 0.75), end: Math.floor(total * 0.9) },
      { label: "Modals / Other", start: Math.floor(total * 0.9), end: total },
    ];

    const perRegion = Math.max(1, Math.floor(max_screens / regions.length));
    const selectedScreens: { index: number; label: string }[] = [];

    for (const region of regions) {
      if (selectedScreens.length >= max_screens) break;
      const regionSize = region.end - region.start;
      if (regionSize <= 0) continue;
      const picks = Math.min(perRegion, regionSize, max_screens - selectedScreens.length);
      const regionIndices = sampleIndices(regionSize, picks).map((i) => i + region.start);
      for (const ri of regionIndices) {
        selectedScreens.push({ index: ri, label: region.label });
      }
    }

    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];

    // Check for cached design spec
    const cachedSpec = readDesignSpec(resolved);
    if (cachedSpec) {
      content.push({
        type: "text" as const,
        text: [
          `Design System Extraction: ${resolved.name}`,
          `Platform: ${resolved.platform} | Date: ${resolved.date || "unknown"} | Total screens: ${resolved.screenCount}`,
          "",
          "=== CACHED DESIGN SPEC (previously analyzed) ===",
          "",
          cachedSpec,
          "",
          "=== REFERENCE SCREENSHOTS ===",
          `Returning ${selectedScreens.length} representative screens for visual reference.`,
        ].join("\n"),
      });
    } else {
      content.push({
        type: "text" as const,
        text: [
          `Design System Extraction: ${resolved.name}`,
          `Platform: ${resolved.platform} | Date: ${resolved.date || "unknown"} | Total screens: ${resolved.screenCount}`,
          `Returning ${selectedScreens.length} representative screens across ${regions.length} UI regions.`,
          "",
          "NO DESIGN SPEC CACHED YET.",
          "Analyze these screenshots and then call save_design_spec with the completed spec.",
          "Use get_design_spec_template to get a blank template to fill in.",
          "",
          "=== SCREENSHOTS ===",
        ].join("\n"),
      });
    }

    for (const { index: si, label } of selectedScreens) {
      const filename = resolved.screens[si];
      const filePath = path.join(resolved.screenDir, filename);
      try {
        const { data, mimeType } = readImageBase64(filePath);
        content.push({
          type: "text" as const,
          text: `\n--- [${si}] ${label}: ${filename} ---`,
        });
        content.push({
          type: "image" as const,
          data,
          mimeType,
        });
      } catch {
        content.push({
          type: "text" as const,
          text: `\n--- [${si}] ${label}: ${filename} (failed to read) ---`,
        });
      }
    }

    return { content };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_design_spec
// ---------------------------------------------------------------------------

server.tool(
  "get_design_spec",
  "Get the cached DESIGN.md specification for an app. Returns the structured design system spec if one has been previously saved via save_design_spec. If no spec exists, returns the blank template for you to fill in.",
  {
    app_name: z.string().describe("App name"),
  },
  async ({ app_name }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found.` }],
      };
    }

    const resolved = resolveApp(app);
    const cachedSpec = readDesignSpec(resolved);

    if (cachedSpec) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Design spec for ${resolved.name} (cached):\n\n${cachedSpec}`,
          },
        ],
      };
    }

    // Return the blank template
    const template = fillSpecTemplateHeader(resolved);
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `No design spec cached for ${resolved.name} yet.`,
            "",
            "Here is the blank template — analyze the app's screenshots (use extract_design_system or get_screenshots),",
            "fill in every field, then call save_design_spec to cache it.",
            "",
            "=== TEMPLATE ===",
            "",
            template,
          ].join("\n"),
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: save_design_spec
// ---------------------------------------------------------------------------

server.tool(
  "save_design_spec",
  "Save a completed DESIGN.md specification for an app. This caches the design system analysis so it can be reused in future sessions without re-analyzing screenshots. The spec should be a filled-in version of the template from get_design_spec.",
  {
    app_name: z.string().describe("App name to save the spec for"),
    spec: z.string().describe("The complete design system specification in markdown format"),
  },
  async ({ app_name, spec }) => {
    const app = findAppInCatalog(app_name);
    if (!app) {
      return {
        content: [{ type: "text" as const, text: `App "${app_name}" not found.` }],
      };
    }

    const resolved = resolveApp(app);
    const savedPath = saveDesignSpec(resolved, spec);

    return {
      content: [
        {
          type: "text" as const,
          text: `Design spec saved for ${resolved.name} at:\n${savedPath}\n\nThis will be automatically included in future extract_design_system calls.`,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: compare_apps
// ---------------------------------------------------------------------------

server.tool(
  "compare_apps",
  "Compare screenshots from two apps side by side. Returns sampled screens from both apps for visual comparison of design systems, patterns, and approaches.",
  {
    app_name_1: z.string().describe("First app name"),
    app_name_2: z.string().describe("Second app name"),
    screens_per_app: z.number().min(2).max(10).default(5).describe("Number of screens from each app"),
  },
  async ({ app_name_1, app_name_2, screens_per_app }) => {
    const app1 = findAppInCatalog(app_name_1);
    const app2 = findAppInCatalog(app_name_2);

    if (!app1 || !app2) {
      const missing = !app1 ? app_name_1 : app_name_2;
      return {
        content: [{ type: "text" as const, text: `App "${missing}" not found.` }],
      };
    }

    const resolved1 = resolveApp(app1);
    const resolved2 = resolveApp(app2);

    const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
    content.push({
      type: "text" as const,
      text: [
        `Comparing: ${resolved1.name} (${resolved1.platform}) vs ${resolved2.name} (${resolved2.platform})`,
        `${resolved1.name}: ${resolved1.screenCount} screens | ${resolved2.name}: ${resolved2.screenCount} screens`,
        "",
        "Compare these aspects:",
        "- Visual style and aesthetic direction",
        "- Color palettes and usage",
        "- Typography choices",
        "- Component design (buttons, inputs, cards)",
        "- Navigation patterns",
        "- Information density and whitespace",
        "- Iconography",
      ].join("\n"),
    });

    for (const [resolved, label] of [[resolved1, "A"], [resolved2, "B"]] as const) {
      content.push({ type: "text" as const, text: `\n========== App ${label}: ${resolved.name} ==========` });

      const selectedIndices = sampleIndices(resolved.screenCount, screens_per_app);
      for (const si of selectedIndices) {
        const filename = resolved.screens[si];
        const filePath = path.join(resolved.screenDir, filename);
        try {
          const { data, mimeType } = readImageBase64(filePath);
          content.push({
            type: "text" as const,
            text: `[${label}:${si}] ${filename}`,
          });
          content.push({ type: "image" as const, data, mimeType });
        } catch {
          content.push({
            type: "text" as const,
            text: `[${label}:${si}] ${filename} (failed to read)`,
          });
        }
      }
    }

    return { content };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_landing_page
// ---------------------------------------------------------------------------

server.tool(
  "get_landing_page",
  "Get a landing page screenshot by app name. Landing pages are single full-page screenshots of marketing/homepage designs.",
  {
    app_name: z.string().describe("App or company name (e.g. 'Claude', 'Vercel', 'Attio')"),
  },
  async ({ app_name }) => {
    const apps = getCatalog().filter((a) => a.category === "Landing Pages");
    const match = apps.find((a) => fuzzyMatch(app_name, a.name));

    if (!match) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Landing page for "${app_name}" not found.\n\nAvailable landing pages:\n${apps.map((a) => `  - ${a.name}`).join("\n")}`,
          },
        ],
      };
    }

    const filePath = path.join(match.screenDir, match.screens[0]);
    const { data, mimeType } = readImageBase64(filePath);

    return {
      content: [
        { type: "text" as const, text: `Landing page: ${match.name}` },
        { type: "image" as const, data, mimeType },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LookBook MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
