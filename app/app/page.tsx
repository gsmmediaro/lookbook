import { getApps, getCategories } from "@/lib/designs";
import { AppGallery } from "@/components/app-gallery";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const apps = getApps();
  const categories = getCategories();

  return (
    <AppGallery
      apps={apps}
      categories={categories}
      user={{ name: session.user.name, email: session.user.email }}
    />
  );
}
