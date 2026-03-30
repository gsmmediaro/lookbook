import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const CATEGORIES = ["Mobile Apps", "Web Apps", "Landing Pages"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface AppInfo {
  name: string;
  platform: string;
  date: string;
  category: Category;
  genre: string;
  screenDir: string;
  screenCount: number;
  screens: string[];
  isZipped: boolean;
}

/** Semantic genre (app category) for each app, keyed by normalized app name */
export const APP_GENRES: Record<string, string> = {
  // Mobile Apps
  "Ada": "Mental Health",
  "Alan Mind": "Mental Health",
  "Alma": "Mental Health",
  "Angi": "Home Services",
  "BeReal.": "Social",
  "Bevel": "Lifestyle",
  "BFF": "Social",
  "BitePal": "Food & Nutrition",
  "Bloom": "Mental Health",
  "Brainly": "Education",
  "Cal AI": "AI",
  "Centr": "Health & Fitness",
  "Character AI": "AI",
  "Co–Star": "Lifestyle",
  "Docusign": "Productivity",
  "Dot": "AI",
  "Endel": "Wellness",
  "Expensify": "Finance",
  "Fitplan": "Health & Fitness",
  "Gas": "Social",
  "Greg": "Productivity",
  "Hevy": "Health & Fitness",
  "informed News": "News",
  "Ladder": "Finance",
  "Lifesum": "Health & Fitness",
  "Lovi": "AI",
  "MacroFactor": "Health & Fitness",
  "NGL": "Social",
  "Particle News": "News",
  "Peloton Strength+": "Health & Fitness",
  "Perplexity": "AI",
  "Pillow": "Health & Fitness",
  "pillowtalk": "Social",
  "QUITTR": "Wellness",
  "Raycast": "Productivity",
  "Speechify": "Education",
  "stoic.": "Wellness",
  "talktolewis": "AI",
  "Tolan": "AI",
  "Uxcel Go": "Education",
  "Vibecode": "Developer Tools",
  "Vocabulary": "Education",
  // Web Apps
  "Aboard": "Productivity",
  "Air": "Creative",
  "Amie": "Productivity",
  "Assembly": "AI",
  "Claude": "AI",
  "Clockwise": "Productivity",
  "Cursor": "Developer Tools",
  "ElevenLabs": "AI",
  "Elicit": "AI",
  "Employment Hero": "HR & Business",
  "Fabric": "Productivity",
  "Front": "Communication",
  "Grain": "Productivity",
  "Grammarly": "Productivity",
  "Graphite": "Developer Tools",
  "Gusto": "HR & Business",
  "Heidi": "Health & Fitness",
  "Lindy": "AI",
  "Lovable": "Developer Tools",
  "Manus": "AI",
  "Matter": "Productivity",
  "Mercury": "Finance",
  "Notion": "Productivity",
  "OpenAI": "AI",
  "Optimal Workshop": "UX Research",
  "Otter.ai": "AI",
  "Oyster": "HR & Business",
  "Peerlist": "Social",
  "Profound": "Marketing",
  "Remote": "HR & Business",
  "Sana AI": "AI",
  "Sketch": "Creative",
  "Slite": "Productivity",
  "Sprig": "UX Research",
  "Stripe": "Finance",
  "Superhuman Mail": "Communication",
  "Tally": "Productivity",
  // Landing Pages
  "Amplemarket": "Sales & CRM",
  "Apollo": "Sales & CRM",
  "Attio": "Sales & CRM",
  "Bird": "Communication",
  "Clay": "Sales & CRM",
  "Deta": "Developer Tools",
  "Duna": "Finance",
  "Duolingo": "Education",
  "Giga": "Developer Tools",
  "incident.io": "Developer Tools",
  "Loops": "Marketing",
  "mymind": "Productivity",
  "Okta": "Security",
  "Portrait": "Creative",
  "Qatalog": "Productivity",
  "Sequence": "Finance",
  "stop fraud": "Security",
  "Strut": "Creative",
  "Vercel": "Developer Tools",
  "Visitors": "Analytics",
};

/** Get the genre for an app by name, falling back to "Other" */
export function getGenre(name: string): string {
  return APP_GENRES[name] ?? "Other";
}

// ---------------------------------------------------------------------------
// Pure helpers (no I/O)
// ---------------------------------------------------------------------------

/** Parse app name, platform, and date from directory/zip name like "Perplexity ios May 2025" */
export function parseAppName(raw: string): { name: string; platform: string; date: string } {
  const match = raw.match(/^(.+?)\s+(ios|android|web|page)(?:\s+(.+))?$/i);
  if (match) {
    return {
      name: match[1].trim(),
      platform: match[2].toLowerCase(),
      date: match[3]?.trim() || "",
    };
  }
  return { name: raw, platform: "unknown", date: "" };
}

/** Sample N evenly-spaced indices from an array */
export function sampleIndices(total: number, count: number): number[] {
  if (total === 0) return [];
  if (count <= 1) return [0];
  if (total <= count) return Array.from({ length: total }, (_, i) => i);
  const step = (total - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(i * step));
}

/** Fuzzy match a query against text */
export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

/** Ensure a zipped mobile app is extracted, return the extracted directory path */
export function ensureUnzipped(zipPath: string): string {
  const dir = zipPath.replace(/\.zip$/i, "");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync("unzip", ["-q", "-o", zipPath, "-d", dir], { timeout: 30000 });
  }
  return dir;
}

/** List PNG/JPG/WEBP files in a directory, sorted by numeric index */
export function listScreens(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f: string) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a: string, b: string) => {
      const numA = parseInt(a.match(/(\d+)/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/(\d+)/)?.[1] || "0", 10);
      return numA - numB;
    });
}

/** Read an image file and return base64 + mime type */
export function readImageBase64(filePath: string): { data: string; mimeType: string } {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const data = fs.readFileSync(filePath).toString("base64");
  return { data, mimeType: mimeMap[ext] || "image/png" };
}

/** Build the full catalog index */
export function buildCatalog(designsDir: string): AppInfo[] {
  const apps: AppInfo[] = [];

  for (const category of CATEGORIES) {
    const catDir = path.join(designsDir, category);
    if (!fs.existsSync(catDir)) continue;

    const entries = fs.readdirSync(catDir);

    for (const entry of entries) {
      const fullPath = path.join(catDir, entry);
      const stat = fs.statSync(fullPath);

      if (category === "Landing Pages") {
        if (/\.(png|jpg|jpeg|webp)$/i.test(entry)) {
          const parsed = parseAppName(entry.replace(/\.(png|jpg|jpeg|webp)$/i, ""));
          apps.push({
            name: parsed.name,
            platform: "web",
            date: parsed.date,
            category,
            genre: getGenre(parsed.name),
            screenDir: catDir,
            screenCount: 1,
            screens: [entry],
            isZipped: false,
          });
        }
        continue;
      }

      if (stat.isDirectory()) {
        const parsed = parseAppName(entry);
        const screens = listScreens(fullPath);
        apps.push({
          name: parsed.name,
          platform: parsed.platform,
          date: parsed.date,
          category,
          genre: getGenre(parsed.name),
          screenDir: fullPath,
          screenCount: screens.length,
          screens,
          isZipped: false,
        });
      } else if (entry.endsWith(".zip")) {
        const baseName = entry.replace(/\.zip$/i, "");
        if (apps.some((a) => a.screenDir === path.join(catDir, baseName))) continue;

        const parsed = parseAppName(baseName);
        const unzippedDir = path.join(catDir, baseName);
        if (fs.existsSync(unzippedDir)) {
          const screens = listScreens(unzippedDir);
          apps.push({
            name: parsed.name,
            platform: parsed.platform,
            date: parsed.date,
            category,
            genre: getGenre(parsed.name),
            screenDir: unzippedDir,
            screenCount: screens.length,
            screens,
            isZipped: false,
          });
        } else {
          apps.push({
            name: parsed.name,
            platform: parsed.platform,
            date: parsed.date,
            category,
            genre: getGenre(parsed.name),
            screenDir: fullPath,
            screenCount: -1,
            screens: [],
            isZipped: true,
          });
        }
      }
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve an app — unzipping if necessary — and return up-to-date info */
export function resolveApp(app: AppInfo): AppInfo {
  if (app.isZipped) {
    const dir = ensureUnzipped(app.screenDir);
    const screens = listScreens(dir);
    return { ...app, screenDir: dir, screenCount: screens.length, screens, isZipped: false };
  }
  if (app.screens.length === 0 || app.screenCount <= 0) {
    const screens = listScreens(app.screenDir);
    return { ...app, screenCount: screens.length, screens };
  }
  return app;
}

/** Find an app by name with exact-then-fuzzy matching */
export function findApp(catalog: AppInfo[], nameQuery: string): AppInfo | undefined {
  const exact = catalog.find((a) => a.name.toLowerCase() === nameQuery.toLowerCase());
  if (exact) return exact;
  return catalog.find((a) => fuzzyMatch(nameQuery, a.name));
}

// ---------------------------------------------------------------------------
// Design spec helpers
// ---------------------------------------------------------------------------

const DESIGN_SPEC_FILENAME = "DESIGN.md";

/** Get the path to an app's design spec file */
export function getDesignSpecPath(app: AppInfo): string {
  return path.join(app.screenDir, DESIGN_SPEC_FILENAME);
}

/** Read a cached design spec, or return null if none exists */
export function readDesignSpec(app: AppInfo): string | null {
  const specPath = getDesignSpecPath(app);
  if (!fs.existsSync(specPath)) return null;
  return fs.readFileSync(specPath, "utf-8");
}

/** Save a design spec for an app */
export function saveDesignSpec(app: AppInfo, spec: string): string {
  const specPath = getDesignSpecPath(app);
  fs.writeFileSync(specPath, spec, "utf-8");
  return specPath;
}

/** The template an AI should follow when generating a design spec */
export const DESIGN_SPEC_TEMPLATE = `# {APP_NAME} — Design System Specification

> Auto-extracted from {SCREEN_COUNT} screens ({PLATFORM}, {DATE})
> Use this spec to replicate this app's interface 1:1.
> Every value below should be filled with exact measurements from the screenshots.
> If a section doesn't apply, write "N/A" — don't delete it.

---

## 1. Design Intent

**Who uses this?** (The actual person — role, context, mindset when using)
**What must they accomplish?** (The primary verb — not "use the app")
**How should it feel?** (Specific quality — not "clean and modern")
**Design direction:** (e.g. "Precision & Density" / "Warmth & Approachability" / "Calm & Focused")

---

## 2. Token Architecture

### Primitive Foundation
Every color traces back to these primitives:

#### Foreground (Text Hierarchy)
| Level | Hex | Opacity | Usage |
|-------|-----|---------|-------|
| Primary | #_____ | | Default text, highest contrast |
| Secondary | #_____ | | Supporting text, slightly muted |
| Tertiary | #_____ | | Metadata, timestamps, less important |
| Muted | #_____ | | Disabled, placeholder, lowest contrast |

#### Background (Surface Elevation)
| Level | Hex | Usage |
|-------|-----|-------|
| Base (Level 0) | #_____ | App canvas / page background |
| Raised (Level 1) | #_____ | Cards, panels (same visual plane) |
| Overlay (Level 2) | #_____ | Dropdowns, popovers (floating above) |
| Deep Overlay (Level 3) | #_____ | Nested dropdowns, stacked overlays |
| Inset/Recessed | #_____ | Code blocks, empty states, input wells |

#### Border Progression
| Level | Value | Usage |
|-------|-------|-------|
| Subtle | rgba(___) | Soft separation, barely visible |
| Default | rgba(___) | Standard borders, card edges |
| Strong | rgba(___) | Emphasis, hover states |
| Focus Ring | rgba(___) | Maximum emphasis, keyboard focus |

#### Brand & Accent
| Role | Hex | Usage |
|------|-----|-------|
| Primary Brand | #_____ | Main CTAs, active states, links |
| Primary Hover | #_____ | Hover/pressed variant |
| Accent (if any) | #_____ | Secondary emphasis |

#### Semantic Colors
| Role | Hex | Usage |
|------|-----|-------|
| Success | #_____ | Confirmations, positive states |
| Warning | #_____ | Alerts, caution states |
| Error/Destructive | #_____ | Errors, delete actions |
| Info | #_____ | Informational badges, tooltips |

#### Control Tokens (dedicated for form elements)
| Token | Hex | Usage |
|-------|-----|-------|
| Control Background | #_____ | Input/checkbox/select fill |
| Control Border | #_____ | Interactive element borders |
| Control Focus | #_____ | Focus ring / outline |

---

## 3. Depth & Elevation Strategy

**Chosen approach:** (ONE of: borders-only / subtle-shadows / layered-shadows / surface-shifts)

Provide the actual CSS values used:

\`\`\`css
/* Shadow values (if shadow-based) */
--shadow-sm: ;
--shadow-md: ;
--shadow-lg: ;

/* Or border approach */
--border-default: ;
--border-subtle: ;
\`\`\`

**Sidebar treatment:** (same bg as canvas with border / different bg / other)
**Dropdown elevation:** (how dropdowns distinguish from parent surface)
**Input treatment:** (inset/darker / outlined / flush)

---

## 4. Typography

### Font Stack
- **Headings:** (exact font name + fallback)
- **Body:** (exact font name + fallback)
- **Monospace/Code:** (exact font name + fallback)
- **Data/Numbers:** (font + \`font-variant-numeric: tabular-nums\`)

### Type Scale
| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Display | px | | | | Hero headings |
| H1 | px | | | | Page titles |
| H2 | px | | | | Section headings |
| H3 | px | | | | Card titles, subsections |
| Body Large | px | | | | Featured/lead text |
| Body | px | | | | Default text |
| Body Small | px | | | | Secondary text |
| Caption | px | | | | Labels, timestamps |
| Overline | px | | | (uppercase?) | Category labels |
| Code/Data | px | | | | Monospace content |

### Typography Rules Observed
- [ ] Headings use tighter letter-spacing for presence
- [ ] Labels use medium weight that works at smaller sizes
- [ ] Numbers/IDs in monospace with tabular-nums
- [ ] \`text-wrap: balance\` on headings (if observed)
- [ ] Uppercase text has extra letter-spacing

---

## 5. Spacing System

**Base unit:** px (e.g. 4px or 8px)

| Token | Value | Usage |
|-------|-------|-------|
| Micro | px | Icon-to-text gaps, tight pairs |
| xs | px | Inline element spacing |
| sm | px | Component internal padding |
| md | px | Card padding, section padding |
| lg | px | Between component groups |
| xl | px | Major section separation |
| 2xl | px | Page-level margins |

**Padding rule:** (symmetrical / asymmetrical — describe pattern)

---

## 6. Border Radius

**Overall feel:** (sharp/technical → friendly/rounded)

| Token | Value | Usage |
|-------|-------|-------|
| none | 0px | |
| sm | px | Inputs, buttons, small controls |
| md | px | Cards, dropdowns |
| lg | px | Modals, large containers |
| full | 9999px | Avatars, pills, toggles |

**Concentric radius rule:** inner radius = outer radius - padding (yes/no)

---

## 7. Components

### Buttons
| Variant | Background | Text | Border | Radius | Padding | Height | Font |
|---------|-----------|------|--------|--------|---------|--------|------|
| Primary | | | | | | | |
| Secondary | | | | | | | |
| Ghost | | | | | | | |
| Destructive | | | | | | | |
| Icon-only | | | | | | | |

**States observed:** default / hover / active(:active scale?) / focus / disabled / loading

### Inputs & Forms
| Property | Value |
|----------|-------|
| Height | px |
| Background | #_____ (inset/darker than surface?) |
| Border | (color, width, style) |
| Border Radius | px |
| Focus Ring | (color, width, offset, style) |
| Placeholder Color | #_____ |
| Label | (size, weight, spacing from input) |
| Error State | (border color, message color, icon?) |
| Disabled State | (opacity, bg change) |

### Cards
| Property | Value |
|----------|-------|
| Background | #_____ |
| Border | (value or "none") |
| Radius | px |
| Shadow | (CSS value) |
| Padding | px |
| Gap between cards | px |
| Hover state | (shadow change / border change / none) |

**Card variety:** (do different card types have different internal layouts but same surface treatment?)

### Navigation
| Property | Value |
|----------|-------|
| Type | (sidebar / top-bar / tab-bar / bottom-nav / combined) |
| Background | #_____ |
| Width (sidebar) | px |
| Active Item | (bg color, text color, indicator style) |
| Inactive Item | (text color, opacity) |
| Icon Size | px |
| Item Height | px |
| Item Padding | px |
| Dividers | (between sections? style?) |
| Collapse behavior | (fixed / collapsible / responsive) |

### Modals & Dialogs
| Property | Value |
|----------|-------|
| Overlay | rgba(___) |
| Background | #_____ |
| Radius | px |
| Shadow | (CSS value) |
| Max Width | px |
| Padding | px |
| Close Button | (position, style) |
| Entry Animation | (fade/scale/slide — duration, easing) |
| Exit Animation | (mirrors entry?) |

### Tables (if present)
| Property | Value |
|----------|-------|
| Header BG | #_____ |
| Header Font | (weight, size) |
| Row Height | px |
| Row Border | (between rows — style) |
| Row Hover | #_____ |
| Cell Padding | px |
| Monospace columns | (which data types?) |

### Badges, Tags, Pills
| Variant | Background | Text | Border | Radius | Padding |
|---------|-----------|------|--------|--------|---------|
| Default | | | | | |
| Success | | | | | |
| Warning | | | | | |
| Error | | | | | |

### Tooltips & Popovers
| Property | Value |
|----------|-------|
| Background | #_____ |
| Text Color | #_____ |
| Radius | px |
| Shadow | (CSS value) |
| Arrow | (yes/no, size) |
| Max Width | px |
| Animation | (fade? duration?) |

### Empty States
- **Illustration style:** (line art / flat / photos / icons)
- **Text style:** (heading + body + CTA pattern)
- **Background:** (inset/recessed or same as surface)

---

## 8. Iconography
- **Library:** (Lucide / Heroicons / Phosphor / SF Symbols / custom)
- **Style:** (outlined / filled / duotone)
- **Default size:** px
- **Stroke width:** px (if outlined)
- **Standalone treatment:** (bare / subtle background container)
- **Rule:** Icons clarify, not decorate — removable without losing meaning?

---

## 9. Motion & Animation

### Timing Rules
| Context | Duration | Easing |
|---------|----------|--------|
| Hover/Focus | ms | |
| Small state changes | ms | |
| Modals/Panels | ms | |
| Page transitions | ms | |
| Loading spinners | ms | |

**Easing function:** (ease-out / cubic-bezier values / spring?)
**Active state:** (does :active use scale transform? e.g. scale(0.97))
**Spring physics:** (used for gestures/drag? parameters?)
**Reduced motion:** (respected? how?)

### Animation Patterns Observed
- [ ] Fade in/out
- [ ] Slide up/down
- [ ] Scale
- [ ] Skeleton loading states
- [ ] Optimistic UI updates
- [ ] Stagger animations on lists (delay per item?)

---

## 10. Dark Mode (if applicable)

| Token | Light | Dark |
|-------|-------|------|
| Base Background | #_____ | #_____ |
| Raised Surface | #_____ | #_____ |
| Text Primary | #_____ | #_____ |
| Text Secondary | #_____ | #_____ |
| Border Default | rgba(___) | rgba(___) |
| Brand Color | #_____ | #_____ (adjusted?) |

**Dark mode strategy:**
- Shadows → borders (shadows less visible on dark)
- Semantic colors desaturated slightly
- Higher surface = slightly lighter (not darker)

---

## 11. Layout Patterns

| Property | Value |
|----------|-------|
| Page max-width | px |
| Content max-width | px |
| Sidebar width | px |
| Grid system | (columns, gap) |
| Breakpoints | (mobile/tablet/desktop values) |
| Container padding | px |

---

## 12. UX Patterns Observed

Check which patterns this app uses:
- [ ] Progressive disclosure (complexity revealed on demand)
- [ ] Optimistic UI (instant feedback before server response)
- [ ] Skeleton loading states
- [ ] Empty states with guidance
- [ ] Keyboard shortcuts
- [ ] Command palette / search
- [ ] Breadcrumbs / location indicators
- [ ] Toast notifications (position, style)
- [ ] Confirmation dialogs for destructive actions
- [ ] Inline editing
- [ ] Drag and drop
- [ ] Infinite scroll / pagination
- [ ] Multi-select / bulk actions

---

## 13. Anti-Patterns to Avoid

When replicating this design, do NOT introduce:
- Harsh borders (if original uses subtle rgba borders)
- Dramatic surface jumps (elevation changes should be whisper-quiet)
- Inconsistent spacing (every value must come from the scale above)
- Mixed depth strategies (use ONLY the approach documented above)
- Missing interaction states (hover, focus, disabled, loading, error)
- Pure white cards on colored backgrounds
- Different hues for different surfaces (shift lightness only, not hue)
- Decorative gradients/color not present in original
- AI slop tells: gradient text, glassmorphism, generic card grids, hero metrics

---

## 14. Implementation Notes

- **Framework:** (React/Vue/Svelte/etc. if identifiable)
- **Component library:** (shadcn/ui / Radix / MUI / custom)
- **CSS approach:** (Tailwind / CSS modules / styled-components / vanilla)
- **Key dependencies:** (identifiable from UI patterns)
- **Unique interactions:** (anything custom that needs special implementation)
`;

/** Fill in the template header with app metadata */
export function fillSpecTemplateHeader(app: AppInfo): string {
  return DESIGN_SPEC_TEMPLATE
    .replace("{APP_NAME}", app.name)
    .replace("{SCREEN_COUNT}", String(app.screenCount))
    .replace("{PLATFORM}", app.platform)
    .replace("{DATE}", app.date || "unknown");
}
