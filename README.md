# LookBook

A design reference library with two interfaces:

- **App** — A Next.js web app for humans to browse and explore design screenshots
- **MCP Server** — An MCP server for AI agents to search, analyze, and replicate designs

## What's inside

```
app/           → Next.js 16 design gallery (React 19, Tailwind, shadcn/ui)
mcp-server/    → LookBook MCP server (TypeScript, @modelcontextprotocol/sdk)
designs/       → Your Mobbin screenshot exports (gitignored, bring your own)
```

## Setup

### 1. Add your designs

Export app screenshots from [Mobbin](https://mobbin.com) and place them in `designs/`:

```
designs/
  Mobile Apps/
    Perplexity ios May 2025.zip
    BeReal. ios Jan 2023.zip
  Web Apps/
    Claude web Sep 2025/
      Claude web Sep 2025 0.png
      Claude web Sep 2025 1.png
      ...
    Notion web Jul 2025/
      ...
  Landing Pages/
    Claude page.png
    Vercel page.png
```

Mobile apps can be zipped — the MCP auto-extracts them on first access.

### 2. Run the web app

```bash
cd app
npm install
npm run dev
```

### 3. Use the MCP server

Build:

```bash
cd mcp-server
npm install
npm run build
```

Add to your Claude Code config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "lookbook": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

Works with any MCP-compatible client (Claude Code, Claude Desktop, Cursor, etc.)

## MCP Tools

| Tool | What it does |
|------|-------------|
| `list_apps` | Browse the full catalog, filter by category or platform |
| `search_apps` | Fuzzy search by app name |
| `get_app_info` | Metadata for one app: screen count, platform, date |
| `get_screenshots` | Returns base64 images — sample mode or specific indices |
| `get_screen` | Single full-res screenshot by index |
| `extract_design_system` | Smart sampler across UI regions + cached design spec |
| `get_design_spec` | Get or generate a structured design system spec |
| `save_design_spec` | Cache a completed spec for future sessions |
| `compare_apps` | Side-by-side screens from two apps |
| `get_landing_page` | Single landing page screenshot |

## Design Spec System

When you ask an AI to replicate an app's design, LookBook:

1. Serves representative screenshots from across the app's UI
2. Provides a 14-section design spec template covering: intent, token architecture, depth strategy, typography, spacing, components, motion, dark mode, layout, UX patterns, and anti-patterns
3. The AI fills it in by analyzing the screenshots
4. The spec is cached as `DESIGN.md` inside the app's directory
5. Future sessions get the spec instantly — no re-analysis

The template is informed by design skills including interface-design principles, audit checklists, and 152 UI/UX rules.

## Tests

```bash
cd mcp-server
npm test
```

113 tests across unit, integration (full MCP protocol via in-memory transport), and evals (catalog integrity, image validation, sampling distribution, filesystem consistency).
