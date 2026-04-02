import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SubmissionForm } from "@/components/submit/submission-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.slug, orgSlug))
    .limit(1);

  return {
    title: label
      ? `Envie sua demo — ${label.portalHeadline || label.name}`
      : "Gravadora nao encontrada",
    description:
      label?.portalSubtext || "Envie sua musica para avaliacao",
    robots: "index, follow",
  };
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.slug, orgSlug))
    .limit(1);

  if (!label) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-[400px]">
          <div className="w-12 h-12 rounded-full bg-bg3 flex items-center justify-center mx-auto mb-4">
            <span className="text-[18px]">?</span>
          </div>
          <p className="text-[15px] font-bold text-text mb-2">
            Gravadora nao encontrada
          </p>
          <p className="text-[13px] text-text3">
            Verifique o link e tente novamente. Se o problema persistir, entre em contato com a gravadora.
          </p>
        </div>
      </div>
    );
  }

  const accentColor = label.accentColor || "#1a1a1a";

  return (
    <div className="min-h-screen bg-bg2 flex items-start justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: 560 }}>
        {/* Header with logo */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {label.logoUrl ? (
              <img
                src={label.logoUrl}
                alt={label.name}
                className="w-12 h-12 rounded-full object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold flex-shrink-0"
                style={{ background: accentColor }}
              >
                {label.name[0].toUpperCase()}
              </div>
            )}
            <div>
              {!label.portalHeadline && (
                <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
                  Enviar demo para
                </p>
              )}
              <h1
                className="text-[22px] font-bold tracking-[-0.3px]"
                style={{ color: accentColor }}
              >
                {label.portalHeadline || label.name}
              </h1>
            </div>
          </div>
          {label.portalSubtext && (
            <p className="text-[13px] text-text3 mt-1">{label.portalSubtext}</p>
          )}
          {label.contactEmail && (
            <p className="text-[11px] text-text4 mt-2">
              Contato:{" "}
              <a
                href={`mailto:${label.contactEmail}`}
                className="text-text3 underline"
              >
                {label.contactEmail}
              </a>
            </p>
          )}
        </div>

        <div className="bg-bg border border-border rounded-[8px] p-6">
          <SubmissionForm
            labelId={label.id}
            labelName={label.name}
            accentColor={accentColor}
          />
        </div>

        <div className="flex items-center justify-between mt-6 px-1">
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text4 hover:text-text3 no-underline transition-colors"
          >
            Politica de privacidade
          </a>
          <p className="text-[11px] text-text4">Powered by LabelOS</p>
        </div>
      </div>
    </div>
  );
}
