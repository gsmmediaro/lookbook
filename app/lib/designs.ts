import fs from "fs";
import path from "path";

const DESIGNS_DIR = path.join(process.cwd(), "public", "designs");

export type Category = "Web Apps" | "Landing Pages" | "Mobile Apps";

export interface AppEntry {
  name: string;
  slug: string;
  screenCount: number;
  coverImage: string;
  platform: string;
  date: string;
  category: Category;
  genre: string;
}

const APP_GENRES: Record<string, string> = {
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

function getGenre(name: string): string {
  return APP_GENRES[name] ?? "Other";
}

function parseDisplayName(folderName: string, category: Category): string {
  if (category === "Landing Pages") return folderName;
  const parts = folderName.split(" ");
  const platformIdx = parts.findIndex(
    (p) => p.toLowerCase() === "web" || p.toLowerCase() === "ios" || p.toLowerCase() === "android"
  );
  return platformIdx > 0 ? parts.slice(0, platformIdx).join(" ") : folderName;
}

export interface ScreenEntry {
  filename: string;
  src: string;
  index: number;
}

function parseAppFolder(
  folderName: string,
  category: Category
): { platform: string; date: string; displayName: string } {
  if (category === "Landing Pages") {
    return { platform: "web", date: "", displayName: folderName };
  }

  // Pattern: "AppName platform Month Year"
  const parts = folderName.split(" ");
  const year = parts[parts.length - 1];
  const month = parts[parts.length - 2];
  const platform = parts[parts.length - 3] || "web";
  const nameEnd = parts.findIndex(
    (p) =>
      p.toLowerCase() === "web" ||
      p.toLowerCase() === "ios" ||
      p.toLowerCase() === "android"
  );
  const displayName =
    nameEnd > 0 ? parts.slice(0, nameEnd).join(" ") : folderName;

  return { platform, date: `${month} ${year}`, displayName };
}

export function getCategories(): Category[] {
  if (!fs.existsSync(DESIGNS_DIR)) return [];
  return fs
    .readdirSync(DESIGNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name as Category);
}

export function getApps(category?: Category): AppEntry[] {
  if (!fs.existsSync(DESIGNS_DIR)) return [];

  const categories = category ? [category] : getCategories();
  const allApps: AppEntry[] = [];

  for (const cat of categories) {
    const catPath = path.join(DESIGNS_DIR, cat);
    if (!fs.existsSync(catPath)) continue;

    const folders = fs
      .readdirSync(catPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const folder of folders) {
      const folderPath = path.join(catPath, folder);
      const images = fs
        .readdirSync(folderPath)
        .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
        .sort((a, b) => {
          const numA = parseInt(a.match(/(\d+)\.\w+$/)?.[1] || "0");
          const numB = parseInt(b.match(/(\d+)\.\w+$/)?.[1] || "0");
          return numA - numB;
        });

      const { platform, date } = parseAppFolder(folder, cat as Category);
      const displayName = parseDisplayName(folder, cat as Category);

      allApps.push({
        name: folder,
        slug: `${encodeURIComponent(cat)}/${encodeURIComponent(folder)}`,
        screenCount: images.length,
        coverImage:
          images.length > 0
            ? `/designs/${cat}/${folder}/${images[0]}`
            : "",
        platform,
        date,
        category: cat as Category,
        genre: getGenre(displayName),
      });
    }
  }

  return allApps;
}

export function getAppScreens(
  category: string,
  name: string
): ScreenEntry[] {
  const folderPath = path.join(DESIGNS_DIR, category, name);
  if (!fs.existsSync(folderPath)) return [];

  return fs
    .readdirSync(folderPath)
    .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)\.\w+$/)?.[1] || "0");
      const numB = parseInt(b.match(/(\d+)\.\w+$/)?.[1] || "0");
      return numA - numB;
    })
    .map((filename, index) => ({
      filename,
      src: `/designs/${category}/${name}/${filename}`,
      index,
    }));
}
