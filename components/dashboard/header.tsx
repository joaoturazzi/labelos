"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard/submissions": "Submissions",
  "/dashboard/artists": "Artists",
  "/dashboard/trending": "Trending",
  "/dashboard/settings/ai": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname]
    ?? (pathname.startsWith("/dashboard/artists/") ? "Artista" : "Dashboard");

  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-4">
      <h1 className="text-[22px] font-bold text-text tracking-[-0.3px]">
        {title}
      </h1>
    </header>
  );
}
