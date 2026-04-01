import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SubmissionForm } from "@/components/submit/submission-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { orgSlug: string };
}): Promise<Metadata> {
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.slug, params.orgSlug))
    .limit(1);

  return {
    title: `Envie sua demo — ${label?.name || "Gravadora"}`,
    description: label?.portalSubtext || "Envie sua musica para avaliacao",
    robots: "index, follow",
  };
}

export default async function SubmitPage({
  params,
}: {
  params: { orgSlug: string };
}) {
  const { orgSlug } = params;

  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.slug, orgSlug))
    .limit(1);

  if (!label) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[15px] font-bold text-text mb-2">
            Gravadora nao encontrada.
          </p>
          <p className="text-[13px] text-text3">
            Verifique o link e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const accentColor = label.accentColor || "#1a1a1a";

  return (
    <div className="min-h-screen bg-bg2 flex items-start justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: 560 }}>
        <div className="mb-8">
          <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-1">
            {label.portalHeadline ? "" : "Enviar demo para"}
          </p>
          <h1
            className="text-[22px] font-bold tracking-[-0.3px]"
            style={{ color: accentColor }}
          >
            {label.portalHeadline || label.name}
          </h1>
          {label.portalSubtext && (
            <p className="text-[13px] text-text3 mt-1">{label.portalSubtext}</p>
          )}
        </div>

        <div className="bg-bg border border-border rounded-[8px] p-6">
          <SubmissionForm labelId={label.id} labelName={label.name} />
        </div>

        <p className="text-[11px] text-text4 text-center mt-6">
          Powered by LabelOS
        </p>
      </div>
    </div>
  );
}
