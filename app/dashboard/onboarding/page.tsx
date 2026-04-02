"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Copy } from "lucide-react";

interface Step {
  key: string;
  label: string;
  description: string;
  href?: string;
  action?: "copy";
}

const STEPS: Step[] = [
  {
    key: "ai",
    label: "Configure os critérios da IA",
    description: "Defina como a IA deve avaliar as demos recebidas.",
    href: "/dashboard/settings/ai",
  },
  {
    key: "artist",
    label: "Cadastre seu primeiro artista",
    description: "Adicione artistas para monitorar nas redes sociais.",
    href: "/dashboard/artists",
  },
  {
    key: "link",
    label: "Compartilhe seu link de submissão",
    description: "Envie o link para artistas submeterem demos.",
    action: "copy",
  },
  {
    key: "submissions",
    label: "Aguarde as primeiras demos",
    description: "Quando chegar uma demo, voce vera aqui.",
    href: "/dashboard/submissions",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [labelSlug, setLabelSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/label")
      .then((r) => r.json())
      .then((label) => {
        if (label?.slug) setLabelSlug(label.slug);
        if (label?.onboardingCompleted) {
          router.push("/dashboard/feed");
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleStep = (key: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopy = async () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/submit/${labelSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toggleStep("link");
    setTimeout(() => setCopied(false), 2000);
  };

  const allDone = STEPS.every((s) => completed.has(s.key));

  const handleFinish = async () => {
    await fetch("/api/labels/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingCompleted: true }),
    });
    router.push("/dashboard/feed");
  };

  return (
    <div className="max-w-[520px] mx-auto py-8">
      <h2 className="text-[22px] font-bold text-text tracking-[-0.3px] mb-2">
        Bem-vindo ao LabelOS
      </h2>
      <p className="text-[13px] text-text3 mb-8">
        Complete estes passos para comecar a receber e avaliar demos.
      </p>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = completed.has(step.key);
          return (
            <div
              key={step.key}
              className={`bg-bg border rounded-[8px] px-4 py-3 transition-colors ${
                done ? "border-success bg-success-bg" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleStep(step.key)}
                  className={`
                    w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5
                    cursor-pointer transition-colors
                    ${done ? "bg-success border-success text-white" : "bg-bg border-border2 text-transparent"}
                  `}
                  style={{ fontFamily: "inherit" }}
                >
                  {done && <Check size={12} />}
                </button>
                <div className="flex-1">
                  <p className={`text-[13px] font-semibold ${done ? "text-success" : "text-text"}`}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-text3 mt-0.5">{step.description}</p>
                </div>
                {step.href && (
                  <button
                    onClick={() => { toggleStep(step.key); router.push(step.href!); }}
                    className="flex items-center gap-1 text-[11px] text-text3 hover:text-text bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: "inherit" }}
                  >
                    Ir <ArrowRight size={11} />
                  </button>
                )}
                {step.action === "copy" && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-text3 hover:text-text bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: "inherit" }}
                  >
                    <Copy size={11} />
                    {copied ? "Copiado!" : "Copiar link"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <button
          onClick={handleFinish}
          className="mt-6 w-full bg-text text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[10px] cursor-pointer hover:opacity-90 transition-opacity"
          style={{ fontFamily: "inherit" }}
        >
          Concluir e ir para o dashboard
        </button>
      )}
    </div>
  );
}
