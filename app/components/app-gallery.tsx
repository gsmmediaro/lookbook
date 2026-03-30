"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

type Category = "Web Apps" | "Landing Pages" | "Mobile Apps";

interface AppEntry {
  name: string;
  slug: string;
  screenCount: number;
  coverImage: string;
  platform: string;
  date: string;
  category: Category;
}

const DISCOVERY_BY_CATEGORY: Record<Category, { title: string; items: string[] }[]> = {
  "Web Apps": [
    { title: "Categories", items: ["Health & Fitness", "AI", "Finance", "Productivity", "Business"] },
    { title: "Screens", items: ["Home", "Login", "Charts", "Settings & Preferences", "Signup"] },
    { title: "UI Elements", items: ["Stepper", "Card", "Dialog", "Progress Indicator", "Table"] },
    { title: "Flows", items: ["Onboarding", "Editing Profile", "Logging In", "Chatting & Sending Messages", "Setting Up"] },
  ],
  "Landing Pages": [
    { title: "Categories", items: ["Business", "Finance", "Social", "Lifestyle", "Technology"] },
    { title: "Sections", items: ["Pricing", "About", "Stats", "Features", "Social Proof"] },
    { title: "", items: ["Footer", "FAQ", "Showcase", "404", "Blog"] },
    { title: "Styles", items: ["Scroll Effects", "Minimal", "Motion", "Colorful", "Illustration"] },
  ],
  "Mobile Apps": [
    { title: "Categories", items: ["Health & Fitness", "Business", "Travel & Transportation", "Finance", "AI"] },
    { title: "Screens", items: ["Welcome & Get Started", "Signup", "Dashboard", "Filter & Sort", "Home"] },
    { title: "UI Elements", items: ["Banner", "Tab Bar", "Progress Indicator", "Bottom Sheet", "Dropdown Menu"] },
    { title: "Flows", items: ["Subscribing & Upgrading", "Chatting & Sending Messages", "Creating Account", "Logging In", "Filtering & Sorting"] },
  ],
};

export function AppGallery({
  apps,
  categories,
}: {
  apps: AppEntry[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Web Apps");
  const [sort, setSort] = useState<"latest" | "name" | "popular" | "top">(
    "latest"
  );
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    let result = apps.filter((app) => {
      const matchesSearch = app.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [apps, search, activeCategory, sort]);

  function getDisplayName(fullName: string) {
    const parts = fullName.split(" ");
    const platformIdx = parts.findIndex(
      (p) =>
        p.toLowerCase() === "web" ||
        p.toLowerCase() === "ios" ||
        p.toLowerCase() === "android"
    );
    return platformIdx > 0 ? parts.slice(0, platformIdx).join(" ") : fullName;
  }

  const categoryTabMap: Record<Category, string> = {
    "Web Apps": "Apps",
    "Landing Pages": "Sites",
    "Mobile Apps": "Mobile",
  };

  const orderedCategories = useMemo(() => {
    const order: Category[] = ["Web Apps", "Landing Pages", "Mobile Apps"];
    return order.filter((c) => categories.includes(c));
  }, [categories]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0D0D0D]">
        <nav className="flex items-center justify-between px-4 sm:px-6 h-[60px] gap-4">
          {/* Left: Logo + nav tabs */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="flex items-center shrink-0"
              aria-label="Home"
            >
              <svg
                width="28"
                height="18"
                viewBox="0 0 32 20"
                fill="none"
                className="text-white"
              >
                <path
                  d="M5.6 0C2.507 0 0 2.507 0 5.6v8.8C0 17.493 2.507 20 5.6 20h20.8c3.093 0 5.6-2.507 5.6-5.6V5.6C32 2.507 29.493 0 26.4 0H5.6zm4.8 5.6c0-.884.716-1.6 1.6-1.6s1.6.716 1.6 1.6v8.8c0 .884-.716 1.6-1.6 1.6s-1.6-.716-1.6-1.6V5.6zm8 0c0-.884.716-1.6 1.6-1.6s1.6.716 1.6 1.6v8.8c0 .884-.716 1.6-1.6 1.6s-1.6-.716-1.6-1.6V5.6z"
                  fill="currentColor"
                />
              </svg>
            </Link>

            <div className="flex items-center gap-3">
              {orderedCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[15px] transition-colors ${
                    activeCategory === cat
                      ? "text-white font-semibold"
                      : "text-white/40 hover:text-white/60 font-medium"
                  }`}
                >
                  {categoryTabMap[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-[480px]">
            {searchFocused ? (
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search on Web..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search) setSearchFocused(false);
                  }}
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.08] text-sm text-white placeholder:text-white/30 border-0 focus:outline-none focus:ring-1 focus:ring-white/20"
                  aria-label="Search apps"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setSearchFocused(true)}
                className="w-full h-10 px-4 flex items-center gap-2.5 rounded-full bg-white/[0.08] text-sm text-white/30 hover:bg-white/[0.12] transition-colors"
                aria-label="Open search"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="shrink-0"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Search on Web...
              </button>
            )}
          </div>

          {/* Right: icons + Get Pro + avatar */}
          <div className="flex items-center gap-1">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white/80"
              aria-label="Bookmarks"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white/80"
              aria-label="Language"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white/80"
              aria-label="Notifications"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="ml-1 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[12px] font-semibold text-white">
              S
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Discovery sections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 pb-5">
            {DISCOVERY_BY_CATEGORY[activeCategory].map((section, i) => (
              <div key={section.title || `section-${i}`}>
                {section.title && (
                  <h3 className="text-[13px] font-medium text-white/40 mb-3">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item}>
                      <span className="text-[15px] font-semibold text-white hover:text-white/60 cursor-pointer transition-colors leading-7">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <div className="flex items-center gap-1">
              {/* iOS/Web toggle — only for Apps and Mobile */}
              {activeCategory !== "Landing Pages" && (
                <div className="flex items-center bg-white/[0.08] rounded-full p-1 mr-4">
                  <button
                    onClick={() => setActiveCategory("Mobile Apps")}
                    className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                      activeCategory === "Mobile Apps"
                        ? "bg-white/[0.15] text-white"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    iOS
                  </button>
                  <button
                    onClick={() => setActiveCategory("Web Apps")}
                    className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                      activeCategory === "Web Apps"
                        ? "bg-white/[0.15] text-white"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    Web
                  </button>
                </div>
              )}

              {/* Sort tabs — fewer for Landing Pages */}
              {(activeCategory === "Landing Pages"
                ? [
                    { key: "latest" as const, label: "Latest" },
                    { key: "popular" as const, label: "Most popular" },
                  ]
                : [
                    { key: "latest" as const, label: "Latest" },
                    { key: "popular" as const, label: "Most popular" },
                    { key: "top" as const, label: "Top rated" },
                    { key: "name" as const, label: "Animations" },
                  ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSort(tab.key)}
                  className={`px-3 py-1.5 text-[14px] transition-colors ${
                    sort === tab.key
                      ? "text-white font-medium underline underline-offset-[16px] decoration-2 decoration-white"
                      : "text-white/40 hover:text-white/60 font-normal"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter button */}
            <button className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
              <span className="text-[13px] font-medium">Filter</span>
            </button>
          </div>

          {/* App grid */}
          <div className="pb-12">
            <div className={`grid gap-5 ${
              activeCategory === "Mobile Apps"
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }`}>
              {filtered.map((app) => (
                <Link
                  key={`${app.category}-${app.name}`}
                  href={`/apps/${app.slug}`}
                  className="group block"
                >
                  {/* Card preview */}
                  <div className={`relative overflow-hidden rounded-2xl bg-[#1A1A1A] flex items-center justify-center transition-[background-color] duration-200 group-hover:bg-[#222] ${
                    activeCategory === "Mobile Apps" ? "aspect-[9/16]" : "aspect-[4/3]"
                  }`}>
                    {app.coverImage ? (
                      <div className={`relative overflow-hidden rounded-lg ${
                        activeCategory === "Mobile Apps"
                          ? "w-[80%] h-[80%]"
                          : "w-[85%] h-[75%]"
                      }`}>
                        <Image
                          src={app.coverImage}
                          alt={`${getDisplayName(app.name)} preview`}
                          fill
                          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                          sizes={activeCategory === "Mobile Apps"
                            ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-white/20 text-sm">
                        No preview
                      </div>
                    )}
                  </div>

                  {/* App info */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50 text-[13px] font-semibold shrink-0">
                      {getDisplayName(app.name).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-white truncate leading-tight">
                        {getDisplayName(app.name)}
                      </h3>
                      <p className="text-[13px] text-white/40 truncate">
                        {app.screenCount} screen
                        {app.screenCount !== 1 ? "s" : ""}
                        {app.date ? ` · ${app.date}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-32 text-white/30">
                No apps match your search.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
