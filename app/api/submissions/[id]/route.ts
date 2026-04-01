import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { submissions, labels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { submissionStatusSchema } from "@/lib/schemas";
import { sendStatusUpdate } from "@/lib/email";

async function getLabel() {
  const { orgId } = await auth();
  if (!orgId) return null;
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, orgId))
    .limit(1);
  return label ?? null;
}

// PATCH — update submission status (tenant-isolated + email)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const label = await getLabel();
    if (!label) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = submissionStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, rejectionMessage } = parsed.data;

    const [updated] = await db
      .update(submissions)
      .set({
        status,
        rejectionMessage: status === "rejected" ? rejectionMessage || null : null,
        reviewedAt:
          status === "approved" || status === "rejected" ? new Date() : null,
      })
      .where(and(eq(submissions.id, id), eq(submissions.labelId, label.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Submission não encontrada" },
        { status: 404 }
      );
    }

    // Fire-and-forget: send email to artist on approval/rejection
    if (status === "approved" || status === "rejected") {
      sendStatusUpdate(
        updated.artistEmail,
        updated.artistName,
        updated.trackTitle,
        label.name,
        status,
        rejectionMessage
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/submissions/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar submission" },
      { status: 500 }
    );
  }
}

// GET — get single submission (tenant-isolated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const label = await getLabel();
    if (!label) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, id), eq(submissions.labelId, label.id)))
      .limit(1);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(submission);
  } catch (err) {
    console.error("GET /api/submissions/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar submission" },
      { status: 500 }
    );
  }
}
