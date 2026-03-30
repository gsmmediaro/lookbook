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
