"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface ScreenEntry {
  filename: string;
  src: string;
  index: number;
}

function Lightbox({
  screens,
  currentIndex,
  onClose,
  onNavigate,
  appName,
}: {
  screens: ScreenEntry[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  appName: string;
}) {
  const screen = screens[currentIndex];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0)
        onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < screens.length - 1)
        onNavigate(currentIndex + 1);
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [currentIndex, screens.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0D0D0D] flex flex-col animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Screen preview"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-14 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/50 text-xs font-semibold">
            {appName.charAt(0)}
          </div>
          <span className="text-[14px] font-semibold text-white">{appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-white/30 tabular-nums mr-2">
            {currentIndex + 1} / {screens.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Nav arrows */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white transition-colors"
            aria-label="Previous screen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {currentIndex < screens.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white transition-colors"
            aria-label="Next screen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <div className="min-h-full flex items-center justify-center px-16 py-8">
          <img
            src={screen.src}
            alt={screen.filename}
            className="rounded-lg shadow-2xl"
            style={{ width: "min(85vw, 1100px)" }}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 h-12 shrink-0 border-t border-white/[0.06]">
        <div />
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Save
          </button>
          <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="More options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="6" cy="12" r="1.5" />
              <circle cx="18" cy="12" r="1.5" />
            </svg>
          </button>
        </div>
        <span className="text-[12px] text-white/30">More info</span>
      </div>
    </div>
  );
}

export function ScreenViewer({
  appName,
  screens,
  platform,
  date,
  category,
}: {
  appName: string;
  screens: ScreenEntry[];
  platform: string;
  date: string;
  category: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleClose = useCallback(() => setLightboxIndex(null), []);
  const handleNavigate = useCallback(
    (index: number) => setLightboxIndex(index),
    []
  );

  const decodedName = decodeURIComponent(appName);
  const parts = decodedName.split(" ");
  const platformIndex = parts.findIndex(
    (p) => p === "web" || p === "ios" || p === "android"
  );
  const displayName =
    platformIndex > 0 ? parts.slice(0, platformIndex).join(" ") : decodedName;

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0D0D0D]">
        <nav className="flex items-center justify-between px-4 sm:px-6 h-[60px] gap-4">
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

            <Link
              href="/"
              className="flex items-center gap-1.5 text-[14px] text-white/40 hover:text-white/70 font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </Link>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white/80"
              aria-label="Notifications"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[12px] font-semibold text-white">
              S
            </div>
          </div>
        </nav>

      </header>

      {/* App info section */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-2">
        {/* App icon */}
        <div className="w-14 h-14 rounded-2xl bg-white/[0.08] flex items-center justify-center text-white/50 text-xl font-semibold mb-4">
          {displayName.charAt(0)}
        </div>

        {/* App name */}
        <h1 className="text-3xl font-bold text-white tracking-tight mb-5">
          {displayName}
        </h1>

        {/* Metadata row — varies by category */}
        <div className="flex items-center gap-8 text-sm mb-6">
          {category === "Landing Pages" ? (
            <>
              <div>
                <div className="text-white/40 mb-1">Category</div>
                <div className="text-white font-medium">{category}</div>
              </div>
              <div>
                <div className="text-white/40 mb-1">Style</div>
                <div className="text-white font-medium">Light</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-white/40 mb-1">Platform</div>
                <div className="text-white font-medium capitalize">{platform}</div>
              </div>
              {date && (
                <div>
                  <div className="text-white/40 mb-1">Date</div>
                  <div className="text-white font-medium">{date}</div>
                </div>
              )}
              <div>
                <div className="text-white/40 mb-1">Category</div>
                <div className="text-white font-medium">{category}</div>
              </div>
            </>
          )}
        </div>

        {/* Action buttons — varies by category */}
        <div className="flex items-center gap-2 mb-8">
          {category === "Landing Pages" ? (
            <button className="h-9 px-4 flex items-center gap-2 rounded-full border border-white/[0.15] text-sm font-medium text-white hover:bg-white/[0.06] transition-colors">
              Visit site
            </button>
          ) : (
            <>
              <button className="h-9 px-4 flex items-center gap-2 rounded-full border border-white/[0.15] text-sm font-medium text-white hover:bg-white/[0.06] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Save
              </button>
              <button className="h-9 px-4 flex items-center gap-2 rounded-full bg-white/[0.1] text-sm font-medium text-white hover:bg-white/[0.15] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Rate
              </button>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.15] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="More options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Sub-navigation tabs — varies by category */}
        <div className="flex items-center gap-6 border-b border-white/[0.08]">
          {category === "Landing Pages" ? (
            <>
              <button className="text-[15px] font-medium text-white pb-3 border-b-2 border-white">
                Preview
              </button>
              <button className="text-[15px] font-medium text-white/40 pb-3 border-b-2 border-transparent hover:text-white/60 transition-colors">
                Sections
              </button>
            </>
          ) : (
            <>
              <button className="text-[15px] font-medium text-white pb-3 border-b-2 border-white">
                Screens
              </button>
              <button className="text-[15px] font-medium text-white/40 pb-3 border-b-2 border-transparent hover:text-white/60 transition-colors">
                UI Elements
              </button>
              <button className="text-[15px] font-medium text-white/40 pb-3 border-b-2 border-transparent hover:text-white/60 transition-colors">
                Flows
              </button>
            </>
          )}
        </div>
      </div>

      {/* Screen grid — layout varies by category */}
      <div className={`mx-auto px-4 sm:px-6 py-8 ${
        category === "Landing Pages" ? "max-w-[1400px]" : "max-w-[1200px]"
      }`}>
        {category === "Landing Pages" ? (
          /* Landing pages: single large preview */
          <div className="space-y-4">
            {screens.map((screen) => (
              <button
                key={screen.index}
                onClick={() => setLightboxIndex(screen.index)}
                className="group relative w-full overflow-hidden rounded-2xl bg-[#1A1A1A] transition-[background-color] duration-200 hover:bg-[#222] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <div className="relative overflow-hidden rounded-2xl outline outline-1 outline-white/[0.06] aspect-[16/10]">
                  <Image
                    src={screen.src}
                    alt={`${displayName} preview ${screen.index + 1}`}
                    fill
                    className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.01]"
                    sizes="100vw"
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Apps: grid layout — 6 cols for mobile, 3 cols for web */
          <div className={`grid gap-4 ${
            category === "Mobile Apps"
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {screens.map((screen) => (
              <button
                key={screen.index}
                onClick={() => setLightboxIndex(screen.index)}
                className="group relative overflow-hidden rounded-xl bg-[#1A1A1A] transition-[background-color,box-shadow,scale] duration-200 hover:bg-[#222] hover:ring-1 hover:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.98]"
              >
                <div
                  className={`relative overflow-hidden rounded-xl outline outline-1 outline-white/[0.06] ${
                    category === "Mobile Apps" ? "aspect-[9/16]" : "aspect-[16/10]"
                  }`}
                >
                  <Image
                    src={screen.src}
                    alt={`${displayName} screen ${screen.index + 1}`}
                    fill
                    className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes={category === "Mobile Apps"
                      ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    }
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          screens={screens}
          currentIndex={lightboxIndex}
          onClose={handleClose}
          onNavigate={handleNavigate}
          appName={displayName}
        />
      )}
    </div>
  );
}
