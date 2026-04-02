import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Music,
  Users,
  TrendingUp,
  BarChart3,
  Columns3,
  Rss,
  ArrowRight,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Music,
    title: "Receba demos",
    desc: "Portal personalizado para artistas enviarem demos com metadados completos, splits de royalties e consentimento LGPD.",
  },
  {
    icon: Zap,
    title: "Triagem com IA",
    desc: "Ranking automático de demos com critérios customizáveis. Foque no que realmente importa.",
  },
  {
    icon: Columns3,
    title: "Pipeline visual",
    desc: "Kanban drag-and-drop para acompanhar cada demo do recebimento até o lançamento.",
  },
  {
    icon: Rss,
    title: "Feed social",
    desc: "Agregue posts do Instagram, TikTok, YouTube e Spotify dos seus artistas em um só lugar.",
  },
  {
    icon: Users,
    title: "CRM de artistas",
    desc: "Perfis completos com métricas de redes sociais atualizadas automaticamente.",
  },
  {
    icon: TrendingUp,
    title: "Trending tracks",
    desc: "Monitore as faixas em alta no TikTok, Reels e Spotify em tempo real.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Dashboards com métricas de engajamento, crescimento e performance do catálogo.",
  },
  {
    icon: Globe,
    title: "Multi-gravadora",
    desc: "Cada gravadora tem seu próprio espaço, portal e configurações independentes.",
  },
  {
    icon: Shield,
    title: "LGPD compliant",
    desc: "Consentimento explícito, política de privacidade e tratamento seguro de dados pessoais.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard/feed");

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border">
        <span className="text-[15px] font-bold text-text tracking-[-0.3px]">
          LabelOS
        </span>
        <Link
          href="/login"
          className="text-[13px] font-medium text-text no-underline px-4 py-2 rounded-[6px] border border-border hover:bg-bg3 transition-colors duration-150"
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text3 bg-bg2 border border-border rounded-full px-3 py-1 mb-6">
          <Zap size={12} />
          Para gravadoras independentes
        </div>
        <h1 className="text-[32px] md:text-[44px] font-bold text-text leading-[1.15] tracking-[-0.5px] max-w-[640px]">
          O sistema operacional da sua gravadora
        </h1>
        <p className="text-[15px] md:text-[17px] text-text2 mt-4 max-w-[520px] leading-[1.6]">
          Receba demos, gerencie artistas, acompanhe tendências e tome decisões
          com inteligência artificial — tudo em um só lugar.
        </p>
        <div className="flex items-center gap-3 mt-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-bg bg-text no-underline px-5 py-2.5 rounded-[6px] hover:opacity-90 transition-opacity duration-150"
          >
            Começar agora
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-10 pb-20">
        <div className="max-w-[960px] mx-auto">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-6 text-center">
            Funcionalidades
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="border border-border rounded-[8px] p-5 bg-bg hover:bg-bg2 transition-colors duration-150"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-bg3 mb-3">
                    <Icon size={16} className="text-text2" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-text mb-1">
                    {f.title}
                  </h3>
                  <p className="text-[12px] text-text3 leading-[1.5]">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-bg2 py-16 px-6 text-center">
        <h2 className="text-[22px] font-bold text-text tracking-[-0.3px]">
          Pronto para modernizar sua gravadora?
        </h2>
        <p className="text-[13px] text-text3 mt-2 mb-6">
          Crie sua conta gratuitamente e comece a receber demos hoje.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-bg bg-text no-underline px-5 py-2.5 rounded-[6px] hover:opacity-90 transition-opacity duration-150"
        >
          Entrar na plataforma
          <ArrowRight size={14} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-10 py-6 flex items-center justify-between">
        <span className="text-[11px] text-text4">
          &copy; {new Date().getFullYear()} LabelOS
        </span>
        <Link
          href="/privacidade"
          className="text-[11px] text-text4 no-underline hover:text-text3 transition-colors duration-150"
        >
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
