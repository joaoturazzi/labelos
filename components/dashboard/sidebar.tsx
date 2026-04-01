"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Rss, Music, Users, TrendingUp, BarChart3, Columns3, Settings, Palette, Menu, X } from "lucide-react";

const navItems = [
  { label: "Feed", href: "/dashboard/feed", icon: Rss },
  { label: "Submissions", href: "/dashboard/submissions", icon: Music },
  { label: "Pipeline", href: "/dashboard/pipeline", icon: Columns3 },
  { label: "Artists", href: "/dashboard/artists", icon: Users },
  { label: "Trending", href: "/dashboard/trending", icon: TrendingUp },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const settingsItems = [
  { label: "IA", href: "/dashboard/settings/ai", icon: Settings },
  { label: "Portal", href: "/dashboard/settings/portal", icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <aside
      className={`
        flex flex-col border-r border-border bg-bg2 overflow-y-auto
        fixed top-0 left-0 bottom-0 z-[800]
        md:relative md:translate-x-0
        transition-transform duration-200
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      style={{ width: 210, minWidth: 210 }}
    >
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between px-4 py-5">
        <span className="text-[15px] font-bold text-text tracking-[-0.3px]">
          LabelOS
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden flex items-center justify-center w-6 h-6 bg-transparent border-none text-text3 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2.5">
        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] px-2 mb-2.5">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-[6px]
                border-none cursor-pointer w-full no-underline
                transition-colors duration-[120ms]
                ${isActive
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

        <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] px-2 mt-4 mb-2.5">
          Configuração
        </p>
        {settingsItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-[6px]
                border-none cursor-pointer w-full no-underline
                transition-colors duration-[120ms]
                ${isActive
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

      <div className="px-4 py-4 border-t border-border">
        <p className="text-[11px] text-text4">Gravadora</p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[700] flex items-center justify-center w-8 h-8 bg-bg border border-border rounded-[6px] cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[799]"
          style={{ background: "rgba(0,0,0,0.22)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {nav}
    </>
  );
}
