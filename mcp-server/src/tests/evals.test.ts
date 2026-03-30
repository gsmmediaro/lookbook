import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import {
  buildCatalog,
  listScreens,
  readImageBase64,
  sampleIndices,
  parseAppName,
  findApp,
  resolveApp,
  type AppInfo,
} from "../helpers.js";

const DESIGNS_DIR = path.resolve(__dirname, "../../../designs");

// ==========================================================================
// Eval: Catalog Integrity
// ==========================================================================

describe("Catalog Integrity", () => {
  let catalog: AppInfo[];

  // Build once — this touches the real filesystem
  catalog = buildCatalog(DESIGNS_DIR);

  it("catalog is non-empty", () => {
    expect(catalog.length).toBeGreaterThan(0);
  });

  it("catalog contains web apps", () => {
    const webApps = catalog.filter((a) => a.category === "Web Apps");
    expect(webApps.length).toBeGreaterThan(20);
  });

  it("catalog contains mobile apps", () => {
    const mobileApps = catalog.filter((a) => a.category === "Mobile Apps");
    expect(mobileApps.length).toBeGreaterThan(15);
  });

  it("catalog contains landing pages", () => {
    const landingPages = catalog.filter((a) => a.category === "Landing Pages");
    expect(landingPages.length).toBeGreaterThan(5);
  });

  it("all non-zipped apps have positive screen counts", () => {
    const nonZipped = catalog.filter((a) => !a.isZipped);
    for (const app of nonZipped) {
      expect(app.screenCount, `${app.name} has 0 screens`).toBeGreaterThan(0);
    }
  });

  it("all non-zipped apps have screens arrays matching screenCount", () => {
    const nonZipped = catalog.filter((a) => !a.isZipped);
    for (const app of nonZipped) {
      expect(app.screens.length, `${app.name} screens.length != screenCount`).toBe(app.screenCount);
    }
  });

  it("zipped apps have screenCount of -1 and empty screens", () => {
    const zipped = catalog.filter((a) => a.isZipped);
    for (const app of zipped) {
      expect(app.screenCount).toBe(-1);
      expect(app.screens).toHaveLength(0);
    }
  });

  it("all app names are non-empty", () => {
    for (const app of catalog) {
      expect(app.name.trim().length, `Empty name found`).toBeGreaterThan(0);
    }
  });

  it("all screenDirs point to existing paths (non-zipped)", () => {
    const nonZipped = catalog.filter((a) => !a.isZipped);
    for (const app of nonZipped) {
      expect(fs.existsSync(app.screenDir), `${app.name}: ${app.screenDir} doesn't exist`).toBe(true);
    }
  });

  it("catalog is sorted alphabetically by name", () => {
    for (let i = 1; i < catalog.length; i++) {
      const cmp = catalog[i - 1].name.localeCompare(catalog[i].name);
      expect(cmp, `${catalog[i - 1].name} should come before ${catalog[i].name}`).toBeLessThanOrEqual(0);
    }
  });

  it("no duplicate app entries (same name + category)", () => {
    const seen = new Set<string>();
    for (const app of catalog) {
      const key = `${app.name}::${app.category}`;
      expect(seen.has(key), `Duplicate: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("all platforms are valid", () => {
    const validPlatforms = ["ios", "android", "web", "page", "unknown"];
    for (const app of catalog) {
      expect(validPlatforms, `Invalid platform '${app.platform}' for ${app.name}`).toContain(app.platform);
    }
  });

  it("all categories are valid", () => {
    const validCategories = ["Mobile Apps", "Web Apps", "Landing Pages"];
    for (const app of catalog) {
      expect(validCategories, `Invalid category '${app.category}' for ${app.name}`).toContain(app.category);
    }
  });
});

// ==========================================================================
// Eval: Known Apps Exist
// ==========================================================================

describe("Known Apps Exist", () => {
  let catalog: AppInfo[];
  catalog = buildCatalog(DESIGNS_DIR);

  const expectedWebApps = ["Claude", "Notion", "Cursor", "Stripe"];
  for (const name of expectedWebApps) {
    it(`web app "${name}" exists in catalog`, () => {
      const found = findApp(catalog, name);
      expect(found, `${name} not found`).toBeDefined();
      expect(found!.category).toBe("Web Apps");
    });
  }

  const expectedLandingPages = ["Claude", "Vercel", "Manus"];
  for (const lp of expectedLandingPages) {
    it(`landing page "${lp}" exists`, () => {
      const found = catalog.find(
        (a) => a.category === "Landing Pages" && a.name.toLowerCase().includes(lp.toLowerCase())
      );
      expect(found, `Landing page for ${lp} not found`).toBeDefined();
    });
  }
});

// ==========================================================================
// Eval: Image Data Quality
// ==========================================================================

describe("Image Data Quality", () => {
  let catalog: AppInfo[];
  catalog = buildCatalog(DESIGNS_DIR);

  it("readImageBase64 returns valid PNG data for a known screen", () => {
    const claude = catalog.find((a) => a.name === "Claude" && a.category === "Web Apps");
    expect(claude).toBeDefined();
    const filePath = path.join(claude!.screenDir, claude!.screens[0]);
    const { data, mimeType } = readImageBase64(filePath);

    expect(mimeType).toBe("image/png");
    expect(data.length).toBeGreaterThan(100);

    // Verify base64 decodes to valid PNG
    const buf = Buffer.from(data, "base64");
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });

  it("readImageBase64 handles WEBP files", () => {
    // Check if any webp files exist in landing pages
    const lpDir = path.join(DESIGNS_DIR, "Landing Pages");
    const webps = fs.existsSync(lpDir)
      ? fs.readdirSync(lpDir).filter((f) => f.endsWith(".webp"))
      : [];

    if (webps.length > 0) {
      const filePath = path.join(lpDir, webps[0]);
      const { mimeType } = readImageBase64(filePath);
      expect(mimeType).toBe("image/webp");
    }
  });

  it("screens are sorted by numeric index", () => {
    const claude = catalog.find((a) => a.name === "Claude" && a.category === "Web Apps");
    expect(claude).toBeDefined();

    for (let i = 1; i < claude!.screens.length; i++) {
      const numPrev = parseInt(claude!.screens[i - 1].match(/(\d+)/)?.[1] || "0", 10);
      const numCurr = parseInt(claude!.screens[i].match(/(\d+)/)?.[1] || "0", 10);
      expect(numCurr, `Screen sort order broken at index ${i}`).toBeGreaterThanOrEqual(numPrev);
    }
  });
});

// ==========================================================================
// Eval: Sampling Distribution
// ==========================================================================

describe("Sampling Distribution Quality", () => {
  it("sample of 8 from 200 covers full range", () => {
    const indices = sampleIndices(200, 8);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(199);

    // Check spread — no two adjacent samples should be too close
    for (let i = 1; i < indices.length; i++) {
      const gap = indices[i] - indices[i - 1];
      expect(gap, `Gap too small between ${indices[i - 1]} and ${indices[i]}`).toBeGreaterThanOrEqual(10);
    }
  });

  it("sample of 5 from 10 produces reasonable coverage", () => {
    const indices = sampleIndices(10, 5);
    expect(indices).toEqual([0, 2, 5, 7, 9]);
  });

  it("sample of 20 from 20 returns all", () => {
    const indices = sampleIndices(20, 20);
    expect(indices).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("extract_design_system regions don't produce duplicate indices", () => {
    // Simulate the region selection logic for a 100-screen app
    const total = 100;
    const max_screens = 12;
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
    const selectedIndices: number[] = [];

    for (const region of regions) {
      if (selectedIndices.length >= max_screens) break;
      const regionSize = region.end - region.start;
      if (regionSize <= 0) continue;
      const picks = Math.min(perRegion, regionSize, max_screens - selectedIndices.length);
      const regionIndices = sampleIndices(regionSize, picks).map((i) => i + region.start);
      selectedIndices.push(...regionIndices);
    }

    // No duplicates
    const unique = new Set(selectedIndices);
    expect(unique.size).toBe(selectedIndices.length);

    // All within bounds
    for (const idx of selectedIndices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(total);
    }

    // Covers early and late parts of the app
    expect(selectedIndices.some((i) => i < 10)).toBe(true);
    expect(selectedIndices.some((i) => i > 80)).toBe(true);
  });
});

// ==========================================================================
// Eval: Edge Cases
// ==========================================================================

describe("Edge Cases", () => {
  it("listScreens returns empty for non-existent directory", () => {
    expect(listScreens("/this/path/does/not/exist")).toEqual([]);
  });

  it("parseAppName handles names with multiple spaces", () => {
    const result = parseAppName("My Cool App ios Jan 2025");
    expect(result.name).toBe("My Cool App");
    expect(result.platform).toBe("ios");
  });

  it("buildCatalog does not crash on the real designs dir", () => {
    expect(() => buildCatalog(DESIGNS_DIR)).not.toThrow();
  });

  it("buildCatalog returns empty for non-existent dir", () => {
    const result = buildCatalog("/non/existent/designs/dir");
    expect(result).toEqual([]);
  });

  it("findApp returns undefined for empty catalog", () => {
    expect(findApp([], "anything")).toBeUndefined();
  });

  it("sampleIndices never returns negative indices", () => {
    for (const total of [0, 1, 2, 5, 10, 100, 1000]) {
      for (const count of [1, 2, 5, 8, 10, 20]) {
        const indices = sampleIndices(total, count);
        for (const idx of indices) {
          expect(idx).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("sampleIndices never returns out-of-bounds indices", () => {
    for (const total of [1, 2, 5, 10, 50, 200]) {
      for (const count of [1, 2, 3, 5, 8, 10]) {
        const indices = sampleIndices(total, count);
        for (const idx of indices) {
          expect(idx).toBeLessThan(total);
        }
      }
    }
  });

  it("resolveApp returns same object for non-zipped app with screens", () => {
    const app: AppInfo = {
      name: "Test",
      platform: "web",
      date: "",
      category: "Web Apps",
      genre: "Other",
      screenDir: "/fake",
      screenCount: 5,
      screens: ["a.png", "b.png", "c.png", "d.png", "e.png"],
      isZipped: false,
    };
    const resolved = resolveApp(app);
    expect(resolved).toBe(app); // same reference — no mutation
  });
});

// ==========================================================================
// Eval: Filesystem Consistency
// ==========================================================================

describe("Filesystem Consistency", () => {
  let catalog: AppInfo[];
  catalog = buildCatalog(DESIGNS_DIR);

  it("all screen files exist on disk for web apps (spot check)", () => {
    const webApps = catalog.filter((a) => a.category === "Web Apps" && !a.isZipped);
    // Spot check first 5 web apps
    for (const app of webApps.slice(0, 5)) {
      for (const screen of app.screens.slice(0, 3)) {
        const filePath = path.join(app.screenDir, screen);
        expect(fs.existsSync(filePath), `Missing: ${filePath}`).toBe(true);
      }
    }
  });

  it("all screen files have valid image extensions", () => {
    const validExts = [".png", ".jpg", ".jpeg", ".webp"];
    for (const app of catalog.filter((a) => !a.isZipped)) {
      for (const screen of app.screens) {
        const ext = path.extname(screen).toLowerCase();
        expect(validExts, `Invalid extension '${ext}' in ${app.name}/${screen}`).toContain(ext);
      }
    }
  });

  it("screen files are reasonably sized (not empty, not huge)", () => {
    const webApps = catalog.filter((a) => a.category === "Web Apps" && !a.isZipped);
    // Spot check 3 apps, 2 screens each
    for (const app of webApps.slice(0, 3)) {
      for (const screen of app.screens.slice(0, 2)) {
        const filePath = path.join(app.screenDir, screen);
        const stat = fs.statSync(filePath);
        expect(stat.size, `${filePath} is empty`).toBeGreaterThan(1000);
        expect(stat.size, `${filePath} is suspiciously large (>50MB)`).toBeLessThan(50 * 1024 * 1024);
      }
    }
  });
});
