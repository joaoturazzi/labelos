import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { submissions, labels } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getLabelId(): Promise<string | null> {
  const { orgId } = await auth();
  if (!orgId) return null;
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, orgId))
    .limit(1);
  return label?.id ?? null;
}

// PATCH — update submission status (tenant-isolated)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "reviewing", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Only update if submission belongs to this label
    const [updated] = await db
      .update(submissions)
      .set({
        status,
        reviewedAt:
          status === "approved" || status === "rejected" ? new Date() : null,
      })
      .where(and(eq(submissions.id, id), eq(submissions.labelId, labelId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Submission não encontrada" },
        { status: 404 }
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
  { params }: { params: { id: string } }
) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, id), eq(submissions.labelId, labelId)))
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
