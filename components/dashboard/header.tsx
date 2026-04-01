"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "./notification-bell";

const pageTitles: Record<string, string> = {
  "/dashboard/submissions": "Submissions",
  "/dashboard/artists": "Artists",
  "/dashboard/trending": "Trending",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings/ai": "Settings",
  "/dashboard/settings/portal": "Portal",
  "/dashboard/onboarding": "Onboarding",
};

export function Header() {
  const pathname = usePathname();

  // Feed has its own header
  if (pathname === "/dashboard/feed") return null;

  const title = pageTitles[pathname]
    ?? (pathname.startsWith("/dashboard/artists/") ? "Artista" : "Dashboard");

  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-4">
      <h1 className="text-[22px] font-bold text-text tracking-[-0.3px]">
        {title}
      </h1>
      <NotificationBell />
    </header>
  );
}
