import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { PortalBanner } from "@/components/dashboard/portal-banner";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <PortalBanner />
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
