"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Rss, Music, Users, TrendingUp, Settings } from "lucide-react";

const navItems = [
  {
    label: "Feed",
    href: "/dashboard/feed",
    icon: Rss,
  },
  {
    label: "Submissions",
    href: "/dashboard/submissions",
    icon: Music,
  },
  {
    label: "Artists",
    href: "/dashboard/artists",
    icon: Users,
  },
  {
    label: "Trending",
    href: "/dashboard/trending",
    icon: TrendingUp,
  },
  {
    label: "Settings",
    href: "/dashboard/settings/ai",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col border-r border-border bg-bg2 overflow-y-auto"
      style={{ width: 210, minWidth: 210 }}
    >
      {/* Logo */}
      <div className="px-4 py-5">
        <span className="text-[15px] font-bold text-text tracking-[-0.3px]">
          LabelOS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2.5">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] px-2 mb-2.5">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-[6px]
                border-none cursor-pointer w-full no-underline
                transition-colors duration-[120ms]
                ${
                  isActive
                    ? "bg-active-bg text-text font-bold"
                    : "bg-transparent text-neutral font-normal hover:bg-bg3"
                }
              `}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-[11px] text-text4">Gravadora</p>
      </div>
    </aside>
  );
}
