"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean | null;
  createdAt: string | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {}
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  function handleClick(n: Notification) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "";
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-text3 hover:text-text transition-colors rounded-[6px] hover:bg-bg3"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] bg-bg border border-border rounded-[8px] overflow-hidden z-[900]"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
              Notificações
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-text3 hover:text-text bg-transparent border-none cursor-pointer"
                style={{ fontFamily: "inherit" }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-[13px] text-text4 text-center py-6">
                Nenhuma notificacao.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`
                    w-full text-left px-4 py-2.5 border-none cursor-pointer
                    flex items-start gap-2 transition-colors
                    ${n.isRead ? "bg-bg hover:bg-bg3" : "bg-bg2 hover:bg-bg3"}
                  `}
                  style={{ fontFamily: "inherit" }}
                >
                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] truncate ${n.isRead ? "text-text3" : "text-text font-medium"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-text4 truncate">{n.body}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-text4 flex-shrink-0">
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
