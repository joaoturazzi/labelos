"use client";

import { useState, useCallback, createContext, useContext } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ToastContext = createContext<{
  showToast: (message: string, type?: Toast["type"]) => void;
}>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const colors = {
    success: { bg: "#eafaf1", border: "#a9dfbf", text: "#1e8449" },
    error: { bg: "#fdf2f2", border: "#f5c6c6", text: "#c0392b" },
    info: { bg: "#eaf2fb", border: "#bdd3e8", text: "#1a5276" },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 flex flex-col gap-2 z-[1000]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-[8px] px-4 py-2.5 text-[13px] font-semibold"
            style={{
              background: colors[toast.type].bg,
              border: `1px solid ${colors[toast.type].border}`,
              color: colors[toast.type].text,
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              animation: "slideIn 0.2s ease",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
