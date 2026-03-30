import { getAppScreens } from "@/lib/designs";
import { ScreenViewer } from "@/components/screen-viewer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  // slug = ["Category", "AppName"]
  const category = decodeURIComponent(slug[0]);
  const appName = decodeURIComponent(slug[1]);

  const screens = getAppScreens(category, appName);

  if (screens.length === 0) {
    notFound();
  }

  // Parse platform and date from folder name
  let platform = "web";
  let date = "";

  if (category !== "Landing Pages") {
    const parts = appName.split(" ");
    const year = parts[parts.length - 1];
    const month = parts[parts.length - 2];
    platform = parts[parts.length - 3] || "web";
    date = `${month} ${year}`;
  }

  return (
    <ScreenViewer
      appName={appName}
      screens={screens}
      platform={platform}
      date={date}
      category={category}
    />
  );
}
