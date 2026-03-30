import { describe, it, expect } from "vitest";
import { parseAppName, sampleIndices, fuzzyMatch, findApp, type AppInfo } from "../helpers.js";

// ==========================================================================
// Unit Tests: parseAppName
// ==========================================================================

describe("parseAppName", () => {
  it("parses standard mobile app format", () => {
    const result = parseAppName("Perplexity ios May 2025");
    expect(result).toEqual({ name: "Perplexity", platform: "ios", date: "May 2025" });
  });

  it("parses web app format", () => {
    const result = parseAppName("Claude web Sep 2025");
    expect(result).toEqual({ name: "Claude", platform: "web", date: "Sep 2025" });
  });

  it("parses app name with special characters", () => {
    const result = parseAppName("Co–Star ios Feb 2025");
    expect(result).toEqual({ name: "Co–Star", platform: "ios", date: "Feb 2025" });
  });

  it("parses app name with periods", () => {
    const result = parseAppName("BeReal. ios Jan 2023");
    expect(result).toEqual({ name: "BeReal.", platform: "ios", date: "Jan 2023" });
  });

  it("parses app name with dots in name", () => {
    const result = parseAppName("Otter.ai web Nov 2025");
    expect(result).toEqual({ name: "Otter.ai", platform: "web", date: "Nov 2025" });
  });

  it("parses landing page format (no date)", () => {
    const result = parseAppName("Claude page");
    expect(result).toEqual({ name: "Claude", platform: "page", date: "" });
  });

  it("parses android platform", () => {
    const result = parseAppName("SomeApp android Mar 2025");
    expect(result).toEqual({ name: "SomeApp", platform: "android", date: "Mar 2025" });
  });

  it("handles names with spaces", () => {
    const result = parseAppName("Alan Mind ios Aug 2022");
    expect(result).toEqual({ name: "Alan Mind", platform: "ios", date: "Aug 2022" });
  });

  it("handles multi-word names with special chars", () => {
    const result = parseAppName("Peloton Strength+ ios Mar 2025");
    expect(result).toEqual({ name: "Peloton Strength+", platform: "ios", date: "Mar 2025" });
  });

  it("returns unknown for unrecognized format", () => {
    const result = parseAppName("SomeRandomDirectory");
    expect(result).toEqual({ name: "SomeRandomDirectory", platform: "unknown", date: "" });
  });

  it("is case-insensitive on platform", () => {
    const result = parseAppName("MyApp IOS Jun 2025");
    expect(result).toEqual({ name: "MyApp", platform: "ios", date: "Jun 2025" });
  });

  it("handles stoic. with period", () => {
    const result = parseAppName("stoic. ios Jul 2025");
    expect(result).toEqual({ name: "stoic.", platform: "ios", date: "Jul 2025" });
  });
});

// ==========================================================================
// Unit Tests: sampleIndices
// ==========================================================================

describe("sampleIndices", () => {
  it("returns all indices when total <= count", () => {
    expect(sampleIndices(3, 5)).toEqual([0, 1, 2]);
    expect(sampleIndices(5, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns exactly count indices when total > count", () => {
    const result = sampleIndices(100, 5);
    expect(result).toHaveLength(5);
  });

  it("always includes first and last index", () => {
    const result = sampleIndices(100, 5);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(99);
  });

  it("produces evenly spaced indices", () => {
    const result = sampleIndices(100, 5);
    // Step = 99/4 = 24.75, so: 0, 25, 50, 74, 99
    expect(result).toEqual([0, 25, 50, 74, 99]);
  });

  it("handles total of 1", () => {
    expect(sampleIndices(1, 5)).toEqual([0]);
  });

  it("handles count of 1", () => {
    expect(sampleIndices(100, 1)).toEqual([0]);
  });

  it("handles count of 2", () => {
    const result = sampleIndices(100, 2);
    expect(result).toEqual([0, 99]);
  });

  it("produces unique sorted indices", () => {
    const result = sampleIndices(200, 8);
    expect(result).toHaveLength(8);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it("all indices are within bounds", () => {
    const result = sampleIndices(50, 10);
    for (const idx of result) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(50);
    }
  });

  it("handles total of 0", () => {
    expect(sampleIndices(0, 5)).toEqual([]);
  });
});

// ==========================================================================
// Unit Tests: fuzzyMatch
// ==========================================================================

describe("fuzzyMatch", () => {
  it("matches exact substring", () => {
    expect(fuzzyMatch("Claude", "Claude web Sep 2025")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(fuzzyMatch("claude", "Claude")).toBe(true);
    expect(fuzzyMatch("CLAUDE", "Claude")).toBe(true);
  });

  it("matches partial name", () => {
    expect(fuzzyMatch("Perp", "Perplexity")).toBe(true);
  });

  it("fuzzy matches scattered characters", () => {
    expect(fuzzyMatch("plx", "Perplexity")).toBe(true);
  });

  it("does not match when characters are out of order", () => {
    expect(fuzzyMatch("xpl", "Perplexity")).toBe(false);
  });

  it("matches empty query to anything", () => {
    expect(fuzzyMatch("", "Anything")).toBe(true);
  });

  it("does not match completely unrelated text", () => {
    expect(fuzzyMatch("zzzzz", "Claude")).toBe(false);
  });

  it("matches single character", () => {
    expect(fuzzyMatch("C", "Claude")).toBe(true);
  });

  it("matches with dots in name", () => {
    expect(fuzzyMatch("otter", "Otter.ai")).toBe(true);
  });

  it("matches with special characters", () => {
    expect(fuzzyMatch("co-star", "Co–Star")).toBe(false); // different dash chars
    expect(fuzzyMatch("costar", "Co–Star")).toBe(true); // fuzzy chars match
  });
});

// ==========================================================================
// Unit Tests: findApp
// ==========================================================================

describe("findApp", () => {
  const mockCatalog: AppInfo[] = [
    {
      name: "Claude",
      platform: "web",
      date: "Sep 2025",
      category: "Web Apps",
      screenDir: "/mock/Claude",
      screenCount: 100,
      screens: [],
      isZipped: false,
    },
    {
      name: "Perplexity",
      platform: "ios",
      date: "May 2025",
      category: "Mobile Apps",
      screenDir: "/mock/Perplexity",
      screenCount: 50,
      screens: [],
      isZipped: false,
    },
    {
      name: "Notion",
      platform: "web",
      date: "Jul 2025",
      category: "Web Apps",
      screenDir: "/mock/Notion",
      screenCount: 200,
      screens: [],
      isZipped: false,
    },
  ];

  it("finds by exact name", () => {
    const result = findApp(mockCatalog, "Claude");
    expect(result?.name).toBe("Claude");
  });

  it("finds case-insensitively", () => {
    const result = findApp(mockCatalog, "claude");
    expect(result?.name).toBe("Claude");
  });

  it("finds by fuzzy match", () => {
    const result = findApp(mockCatalog, "Perp");
    expect(result?.name).toBe("Perplexity");
  });

  it("prefers exact match over fuzzy", () => {
    const catalog: AppInfo[] = [
      ...mockCatalog,
      {
        name: "ClaudeAI",
        platform: "web",
        date: "",
        category: "Web Apps",
        screenDir: "/mock/ClaudeAI",
        screenCount: 10,
        screens: [],
        isZipped: false,
      },
    ];
    const result = findApp(catalog, "Claude");
    expect(result?.name).toBe("Claude");
  });

  it("returns undefined for no match", () => {
    const result = findApp(mockCatalog, "NonExistentApp");
    expect(result).toBeUndefined();
  });
});
