import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
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
} from "../helpers.js";

// ==========================================================================
// Integration Test: Full MCP server via in-memory transport
// ==========================================================================

const DESIGNS_DIR = path.resolve(__dirname, "../../../designs");

// Re-create the server tools inline so we can test via Client
function createTestServer(): McpServer {
  const server = new McpServer({ name: "lookbook-test", version: "1.0.0" });
  let catalog: AppInfo[] = [];

  function getCatalog(): AppInfo[] {
    if (catalog.length === 0) catalog = buildCatalog(DESIGNS_DIR);
    return catalog;
  }

  function findAppInCatalog(nameQuery: string): AppInfo | undefined {
    return findApp(getCatalog(), nameQuery);
  }

  // list_apps
  server.tool(
    "list_apps",
    "List all apps in the design library.",
    {
      category: z.enum(["Mobile Apps", "Web Apps", "Landing Pages", "all"]).default("all"),
      platform: z.string().optional(),
    },
    async ({ category, platform }) => {
      let apps = getCatalog();
      if (category !== "all") apps = apps.filter((a) => a.category === category);
      if (platform) apps = apps.filter((a) => a.platform === platform.toLowerCase());
      const lines = apps.map(
        (a) =>
          `${a.name} | ${a.platform} | ${a.date || "n/a"} | ${a.category} | ${a.isZipped ? "zipped" : a.screenCount + " screens"}`
      );
      return { content: [{ type: "text" as const, text: `Found ${apps.length} apps:\n\n` + lines.join("\n") }] };
    }
  );

  // search_apps
  server.tool(
    "search_apps",
    "Search for apps by name.",
    { query: z.string() },
    async ({ query }) => {
      const apps = getCatalog().filter((a) => fuzzyMatch(query, a.name));
      if (apps.length === 0) return { content: [{ type: "text" as const, text: `No apps found matching "${query}".` }] };
      const lines = apps.map(
        (a) => `${a.name} | ${a.platform} | ${a.date || "n/a"} | ${a.category}`
      );
      return { content: [{ type: "text" as const, text: `Found ${apps.length} apps matching "${query}":\n\n` + lines.join("\n") }] };
    }
  );

  // get_app_info
  server.tool(
    "get_app_info",
    "Get detailed info about a specific app.",
    { app_name: z.string() },
    async ({ app_name }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      const idx = catalog.findIndex((a) => a.name === resolved.name && a.category === resolved.category);
      if (idx >= 0) catalog[idx] = resolved;
      return {
        content: [{
          type: "text" as const,
          text: [
            `App: ${resolved.name}`,
            `Platform: ${resolved.platform}`,
            `Date: ${resolved.date || "unknown"}`,
            `Category: ${resolved.category}`,
            `Screens: ${resolved.screenCount}`,
          ].join("\n"),
        }],
      };
    }
  );

  // get_screenshots
  server.tool(
    "get_screenshots",
    "Get screenshots from an app.",
    {
      app_name: z.string(),
      mode: z.enum(["sample", "indices"]).default("sample"),
      count: z.number().min(1).max(20).default(8),
      indices: z.array(z.number()).optional(),
    },
    async ({ app_name, mode, count, indices }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      if (resolved.screenCount === 0) return { content: [{ type: "text" as const, text: `No screens.` }] };

      let selectedIndices: number[];
      if (mode === "indices" && indices) {
        selectedIndices = indices.filter((i) => i >= 0 && i < resolved.screenCount);
      } else {
        selectedIndices = sampleIndices(resolved.screenCount, count);
      }

      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
      content.push({ type: "text" as const, text: `Showing ${selectedIndices.length} of ${resolved.screenCount} screens` });

      for (const si of selectedIndices) {
        const filename = resolved.screens[si];
        const filePath = path.join(resolved.screenDir, filename);
        try {
          const { data, mimeType } = readImageBase64(filePath);
          content.push({ type: "text" as const, text: `Screen [${si}]: ${filename}` });
          content.push({ type: "image" as const, data, mimeType });
        } catch {
          content.push({ type: "text" as const, text: `Screen [${si}]: ${filename} (failed)` });
        }
      }
      return { content };
    }
  );

  // get_screen
  server.tool(
    "get_screen",
    "Get a single screenshot.",
    { app_name: z.string(), index: z.number().min(0) },
    async ({ app_name, index }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      if (index >= resolved.screenCount) {
        return { content: [{ type: "text" as const, text: `Index ${index} out of range (0-${resolved.screenCount - 1}).` }] };
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

  // extract_design_system
  server.tool(
    "extract_design_system",
    "Get curated screens for design system extraction.",
    { app_name: z.string(), max_screens: z.number().min(4).max(20).default(12) },
    async ({ app_name, max_screens }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      if (resolved.screenCount === 0) return { content: [{ type: "text" as const, text: `No screens.` }] };

      const total = resolved.screenCount;
      const regions = [
        { label: "Onboarding", start: 0, end: Math.floor(total * 0.1) },
        { label: "Navigation", start: Math.floor(total * 0.1), end: Math.floor(total * 0.25) },
        { label: "Content", start: Math.floor(total * 0.25), end: Math.floor(total * 0.45) },
        { label: "Detail", start: Math.floor(total * 0.45), end: Math.floor(total * 0.6) },
        { label: "Forms", start: Math.floor(total * 0.6), end: Math.floor(total * 0.75) },
        { label: "Settings", start: Math.floor(total * 0.75), end: Math.floor(total * 0.9) },
        { label: "Modals", start: Math.floor(total * 0.9), end: total },
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
          text: `Design System: ${resolved.name} — ${selectedScreens.length} screens\n\n=== CACHED DESIGN SPEC ===\n\n${cachedSpec}\n\n=== SCREENSHOTS ===`,
        });
      } else {
        content.push({
          type: "text" as const,
          text: `Design System: ${resolved.name} — ${selectedScreens.length} screens\n\nNO DESIGN SPEC CACHED YET.`,
        });
      }

      for (const { index: si, label } of selectedScreens) {
        const filename = resolved.screens[si];
        const filePath = path.join(resolved.screenDir, filename);
        try {
          const { data, mimeType } = readImageBase64(filePath);
          content.push({ type: "text" as const, text: `[${si}] ${label}: ${filename}` });
          content.push({ type: "image" as const, data, mimeType });
        } catch {
          content.push({ type: "text" as const, text: `[${si}] ${label}: ${filename} (failed)` });
        }
      }
      return { content };
    }
  );

  // compare_apps
  server.tool(
    "compare_apps",
    "Compare two apps.",
    {
      app_name_1: z.string(),
      app_name_2: z.string(),
      screens_per_app: z.number().min(2).max(10).default(5),
    },
    async ({ app_name_1, app_name_2, screens_per_app }) => {
      const app1 = findAppInCatalog(app_name_1);
      const app2 = findAppInCatalog(app_name_2);
      if (!app1 || !app2) {
        const missing = !app1 ? app_name_1 : app_name_2;
        return { content: [{ type: "text" as const, text: `App "${missing}" not found.` }] };
      }
      const resolved1 = resolveApp(app1);
      const resolved2 = resolveApp(app2);

      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];
      content.push({ type: "text" as const, text: `Comparing: ${resolved1.name} vs ${resolved2.name}` });

      for (const [resolved, label] of [[resolved1, "A"], [resolved2, "B"]] as const) {
        const indices = sampleIndices(resolved.screenCount, screens_per_app);
        for (const si of indices) {
          const filename = resolved.screens[si];
          const filePath = path.join(resolved.screenDir, filename);
          try {
            const { data, mimeType } = readImageBase64(filePath);
            content.push({ type: "text" as const, text: `[${label}:${si}] ${filename}` });
            content.push({ type: "image" as const, data, mimeType });
          } catch {
            content.push({ type: "text" as const, text: `[${label}:${si}] ${filename} (failed)` });
          }
        }
      }
      return { content };
    }
  );

  // get_landing_page
  server.tool(
    "get_landing_page",
    "Get a landing page screenshot.",
    { app_name: z.string() },
    async ({ app_name }) => {
      const apps = getCatalog().filter((a) => a.category === "Landing Pages");
      const match = apps.find((a) => fuzzyMatch(app_name, a.name));
      if (!match) {
        return {
          content: [{ type: "text" as const, text: `Landing page for "${app_name}" not found.` }],
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

  // get_design_spec
  server.tool(
    "get_design_spec",
    "Get cached DESIGN.md spec for an app.",
    { app_name: z.string() },
    async ({ app_name }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      const cached = readDesignSpec(resolved);
      if (cached) {
        return { content: [{ type: "text" as const, text: `Design spec for ${resolved.name}:\n\n${cached}` }] };
      }
      const template = fillSpecTemplateHeader(resolved);
      return { content: [{ type: "text" as const, text: `No spec cached. Template:\n\n${template}` }] };
    }
  );

  // save_design_spec
  server.tool(
    "save_design_spec",
    "Save a design spec for an app.",
    { app_name: z.string(), spec: z.string() },
    async ({ app_name, spec }) => {
      const app = findAppInCatalog(app_name);
      if (!app) return { content: [{ type: "text" as const, text: `App "${app_name}" not found.` }] };
      const resolved = resolveApp(app);
      const savedPath = saveDesignSpec(resolved, spec);
      return { content: [{ type: "text" as const, text: `Spec saved at ${savedPath}` }] };
    }
  );

  return server;
}

// ==========================================================================
// Test suite
// ==========================================================================

describe("MCP Integration Tests", () => {
  let client: Client;
  let mcpServer: McpServer;

  beforeAll(async () => {
    mcpServer = createTestServer();
    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);
  });

  afterAll(async () => {
    await client.close();
    await mcpServer.close();
  });

  // -----------------------------------------------------------------------
  // listTools — verify all tools are registered
  // -----------------------------------------------------------------------

  describe("listTools", () => {
    it("returns all 10 tools", async () => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "compare_apps",
        "extract_design_system",
        "get_app_info",
        "get_design_spec",
        "get_landing_page",
        "get_screen",
        "get_screenshots",
        "list_apps",
        "save_design_spec",
        "search_apps",
      ]);
    });

    it("every tool has a description", async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description!.length).toBeGreaterThan(10);
      }
    });

    it("every tool has an input schema", async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // list_apps
  // -----------------------------------------------------------------------

  describe("list_apps", () => {
    it("returns all apps with no filter", async () => {
      const result = await client.callTool({ name: "list_apps", arguments: {} });
      const text = (result.content as any)[0].text as string;
      expect(text).toMatch(/Found \d+ apps:/);
      // Should have a reasonable number of apps
      const count = parseInt(text.match(/Found (\d+)/)?.[1] || "0");
      expect(count).toBeGreaterThan(30);
    });

    it("filters by Web Apps category", async () => {
      const result = await client.callTool({ name: "list_apps", arguments: { category: "Web Apps" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toMatch(/Found \d+ apps:/);
      expect(text).toContain("Web Apps");
      expect(text).not.toContain("Mobile Apps");
    });

    it("filters by Mobile Apps category", async () => {
      const result = await client.callTool({ name: "list_apps", arguments: { category: "Mobile Apps" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("Mobile Apps");
    });

    it("filters by platform", async () => {
      const result = await client.callTool({ name: "list_apps", arguments: { platform: "ios" } });
      const text = (result.content as any)[0].text as string;
      const lines = text.split("\n").filter((l) => l.includes("|"));
      for (const line of lines) {
        expect(line).toContain("ios");
      }
    });

    it("filters by Landing Pages", async () => {
      const result = await client.callTool({ name: "list_apps", arguments: { category: "Landing Pages" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toMatch(/Found \d+ apps:/);
      const count = parseInt(text.match(/Found (\d+)/)?.[1] || "0");
      expect(count).toBeGreaterThan(5);
    });
  });

  // -----------------------------------------------------------------------
  // search_apps
  // -----------------------------------------------------------------------

  describe("search_apps", () => {
    it("finds apps by exact name", async () => {
      const result = await client.callTool({ name: "search_apps", arguments: { query: "Claude" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("Claude");
    });

    it("finds apps by partial name", async () => {
      const result = await client.callTool({ name: "search_apps", arguments: { query: "Notion" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("Notion");
    });

    it("returns no results for nonsense query", async () => {
      const result = await client.callTool({ name: "search_apps", arguments: { query: "xyzzyplugh" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("No apps found");
    });

    it("case-insensitive search", async () => {
      const result = await client.callTool({ name: "search_apps", arguments: { query: "cursor" } });
      const text = (result.content as any)[0].text as string;
      expect(text.toLowerCase()).toContain("cursor");
    });
  });

  // -----------------------------------------------------------------------
  // get_app_info
  // -----------------------------------------------------------------------

  describe("get_app_info", () => {
    it("returns info for known web app", async () => {
      const result = await client.callTool({ name: "get_app_info", arguments: { app_name: "Claude" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("App: Claude");
      expect(text).toContain("Platform: web");
      expect(text).toContain("Category: Web Apps");
      expect(text).toMatch(/Screens: \d+/);
    });

    it("returns not-found for unknown app", async () => {
      const result = await client.callTool({ name: "get_app_info", arguments: { app_name: "NonExistentApp99" } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });

    it("reports positive screen count for web apps", async () => {
      const result = await client.callTool({ name: "get_app_info", arguments: { app_name: "Notion" } });
      const text = (result.content as any)[0].text as string;
      const screenCount = parseInt(text.match(/Screens: (\d+)/)?.[1] || "0");
      expect(screenCount).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // get_screen
  // -----------------------------------------------------------------------

  describe("get_screen", () => {
    it("returns a single image for valid index", async () => {
      const result = await client.callTool({ name: "get_screen", arguments: { app_name: "Claude", index: 0 } });
      const content = result.content as any[];
      expect(content.length).toBe(2);
      expect(content[0].type).toBe("text");
      expect(content[1].type).toBe("image");
      expect(content[1].data.length).toBeGreaterThan(100);
      expect(content[1].mimeType).toBe("image/png");
    });

    it("returns error for out-of-range index", async () => {
      const result = await client.callTool({ name: "get_screen", arguments: { app_name: "Claude", index: 99999 } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("out of range");
    });

    it("returns error for unknown app", async () => {
      const result = await client.callTool({ name: "get_screen", arguments: { app_name: "FakeApp", index: 0 } });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });

    it("returns valid base64 image data", async () => {
      const result = await client.callTool({ name: "get_screen", arguments: { app_name: "Claude", index: 0 } });
      const content = result.content as any[];
      const imageContent = content.find((c: any) => c.type === "image");
      expect(imageContent).toBeDefined();
      // Verify it's valid base64
      const decoded = Buffer.from(imageContent.data, "base64");
      expect(decoded.length).toBeGreaterThan(0);
      // PNG magic bytes: 89 50 4E 47
      expect(decoded[0]).toBe(0x89);
      expect(decoded[1]).toBe(0x50);
      expect(decoded[2]).toBe(0x4e);
      expect(decoded[3]).toBe(0x47);
    });
  });

  // -----------------------------------------------------------------------
  // get_screenshots
  // -----------------------------------------------------------------------

  describe("get_screenshots", () => {
    it("returns sampled screenshots in sample mode", async () => {
      const result = await client.callTool({
        name: "get_screenshots",
        arguments: { app_name: "Claude", mode: "sample", count: 3 },
      });
      const content = result.content as any[];
      const images = content.filter((c: any) => c.type === "image");
      expect(images.length).toBe(3);
    });

    it("returns specific screenshots in indices mode", async () => {
      const result = await client.callTool({
        name: "get_screenshots",
        arguments: { app_name: "Claude", mode: "indices", indices: [0, 1, 2] },
      });
      const content = result.content as any[];
      const images = content.filter((c: any) => c.type === "image");
      expect(images.length).toBe(3);
    });

    it("filters out-of-range indices", async () => {
      const result = await client.callTool({
        name: "get_screenshots",
        arguments: { app_name: "Claude", mode: "indices", indices: [0, 99999] },
      });
      const content = result.content as any[];
      const images = content.filter((c: any) => c.type === "image");
      expect(images.length).toBe(1);
    });

    it("returns not-found for unknown app", async () => {
      const result = await client.callTool({
        name: "get_screenshots",
        arguments: { app_name: "FakeApp123" },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });

    it("all returned images are valid base64", async () => {
      const result = await client.callTool({
        name: "get_screenshots",
        arguments: { app_name: "Claude", mode: "sample", count: 2 },
      });
      const content = result.content as any[];
      const images = content.filter((c: any) => c.type === "image");
      for (const img of images) {
        const decoded = Buffer.from(img.data, "base64");
        expect(decoded.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // extract_design_system
  // -----------------------------------------------------------------------

  describe("extract_design_system", () => {
    it("returns multiple screens from different regions", async () => {
      const result = await client.callTool({
        name: "extract_design_system",
        arguments: { app_name: "Claude", max_screens: 6 },
      });
      const content = result.content as any[];
      const textParts = content.filter((c: any) => c.type === "text");
      const images = content.filter((c: any) => c.type === "image");

      // Should have header text + at least some images
      expect(images.length).toBeGreaterThanOrEqual(4);
      expect(images.length).toBeLessThanOrEqual(6);

      // First text should mention design system
      expect(textParts[0].text).toContain("Design System");
    });

    it("respects max_screens limit", async () => {
      const result = await client.callTool({
        name: "extract_design_system",
        arguments: { app_name: "Claude", max_screens: 4 },
      });
      const content = result.content as any[];
      const images = content.filter((c: any) => c.type === "image");
      expect(images.length).toBeLessThanOrEqual(4);
    });

    it("returns not-found for unknown app", async () => {
      const result = await client.callTool({
        name: "extract_design_system",
        arguments: { app_name: "NoSuchApp" },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });
  });

  // -----------------------------------------------------------------------
  // compare_apps
  // -----------------------------------------------------------------------

  describe("compare_apps", () => {
    it("returns screens from both apps", async () => {
      const result = await client.callTool({
        name: "compare_apps",
        arguments: { app_name_1: "Claude", app_name_2: "Notion", screens_per_app: 2 },
      });
      const content = result.content as any[];
      const texts = content.filter((c: any) => c.type === "text");
      const images = content.filter((c: any) => c.type === "image");

      // Should have header + labels for both apps
      expect(texts[0].text).toContain("Comparing");
      expect(images.length).toBe(4); // 2 per app
    });

    it("returns error when first app not found", async () => {
      const result = await client.callTool({
        name: "compare_apps",
        arguments: { app_name_1: "FakeApp", app_name_2: "Claude", screens_per_app: 2 },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("FakeApp");
      expect(text).toContain("not found");
    });

    it("returns error when second app not found", async () => {
      const result = await client.callTool({
        name: "compare_apps",
        arguments: { app_name_1: "Claude", app_name_2: "FakeApp", screens_per_app: 2 },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });
  });

  // -----------------------------------------------------------------------
  // get_landing_page
  // -----------------------------------------------------------------------

  describe("get_landing_page", () => {
    it("returns a landing page image for known app", async () => {
      const result = await client.callTool({
        name: "get_landing_page",
        arguments: { app_name: "Claude" },
      });
      const content = result.content as any[];
      expect(content.length).toBe(2);
      expect(content[0].type).toBe("text");
      expect(content[0].text).toContain("Landing page");
      expect(content[1].type).toBe("image");
      expect(content[1].data.length).toBeGreaterThan(100);
    });

    it("returns error for unknown landing page", async () => {
      const result = await client.callTool({
        name: "get_landing_page",
        arguments: { app_name: "NonExistentLandingPage99" },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });
  });

  // -----------------------------------------------------------------------
  // Design Spec Workflow: get_design_spec → save_design_spec → round-trip
  // -----------------------------------------------------------------------

  describe("design spec workflow", () => {
    const TEST_APP = "Claude";
    let specPath: string;

    it("get_design_spec returns template when no spec cached", async () => {
      const result = await client.callTool({
        name: "get_design_spec",
        arguments: { app_name: TEST_APP },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("No spec cached");
      expect(text).toContain("Template");
      expect(text).toContain("Token Architecture");
      expect(text).toContain("Typography");
      expect(text).toContain("Components");
      // Template should have app name filled in
      expect(text).toContain("Claude");
    });

    it("save_design_spec saves and returns path", async () => {
      const testSpec = `# Claude — Design System Specification

## Color Palette
- Primary: #D97706 (amber/orange)
- Background: #FAF9F6 (warm off-white)
- Text Primary: #1A1A1A
- Surface: #FFFFFF

## Typography
- Headings: Styrene A
- Body: Inter

## Components
- Buttons: rounded-md, amber primary
- Cards: white bg, subtle shadow
- Navigation: left sidebar, collapsible
`;

      const result = await client.callTool({
        name: "save_design_spec",
        arguments: { app_name: TEST_APP, spec: testSpec },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("Spec saved");
      expect(text).toContain("DESIGN.md");

      // Extract the path for cleanup
      const match = text.match(/at (.+)/);
      if (match) specPath = match[1].trim();
    });

    it("get_design_spec returns cached spec after save", async () => {
      const result = await client.callTool({
        name: "get_design_spec",
        arguments: { app_name: TEST_APP },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("Design spec for Claude");
      expect(text).toContain("#D97706");
      expect(text).toContain("Styrene A");
      expect(text).toContain("amber primary");
    });

    it("extract_design_system includes cached spec", async () => {
      const result = await client.callTool({
        name: "extract_design_system",
        arguments: { app_name: TEST_APP, max_screens: 4 },
      });
      const content = result.content as any[];
      const headerText = content[0].text as string;
      expect(headerText).toContain("CACHED DESIGN SPEC");
      expect(headerText).toContain("#D97706");
      expect(headerText).toContain("Styrene A");

      // Should also still have images
      const images = content.filter((c: any) => c.type === "image");
      expect(images.length).toBeGreaterThan(0);
    });

    it("get_design_spec returns not-found for unknown app", async () => {
      const result = await client.callTool({
        name: "get_design_spec",
        arguments: { app_name: "ZZZNonExistent" },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });

    it("save_design_spec returns not-found for unknown app", async () => {
      const result = await client.callTool({
        name: "save_design_spec",
        arguments: { app_name: "ZZZNonExistent", spec: "test" },
      });
      const text = (result.content as any)[0].text as string;
      expect(text).toContain("not found");
    });

    // Cleanup
    afterAll(() => {
      if (specPath && fs.existsSync(specPath)) {
        fs.unlinkSync(specPath);
      }
    });
  });
});
