import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { submissions, labels } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_STAGES = ["triage", "review", "committee", "contract", "approved", "rejected"];

const STAGE_TO_STATUS: Record<string, string> = {
  triage: "pending",
  review: "reviewing",
  committee: "reviewing",
  contract: "reviewing",
  approved: "approved",
  rejected: "rejected",
};

async function getLabel() {
  const { orgId, userId } = await auth();
  const ownerId = orgId || userId;
  if (!ownerId) return null;
  const [label] = await db.select().from(labels).where(eq(labels.clerkOrgId, ownerId)).limit(1);
  return label ?? null;
}

// PATCH — advance submission through pipeline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const label = await getLabel();
    if (!label) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { stage, assignee, deadline, note } = body;

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
    }

    // Get current submission
    const [sub] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, id), eq(submissions.labelId, label.id)))
      .limit(1);

    if (!sub) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    // Build history entry
    const historyEntry = {
      from: sub.pipelineStage || "triage",
      to: stage,
      at: new Date().toISOString(),
      by: assignee || null,
      note: note || null,
    };

    const existingHistory = (sub.pipelineHistory as unknown[]) || [];

    const [updated] = await db
      .update(submissions)
      .set({
        pipelineStage: stage,
        pipelineAssignee: assignee || null,
        pipelineDeadline: deadline ? new Date(deadline) : null,
        pipelineHistory: [...existingHistory, historyEntry],
        status: STAGE_TO_STATUS[stage] || sub.status,
        reviewedAt:
          stage === "approved" || stage === "rejected" ? new Date() : sub.reviewedAt,
      })
      .where(eq(submissions.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH pipeline error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
