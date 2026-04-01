import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH — update submission status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "reviewing", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(submissions)
      .set({
        status,
        reviewedAt:
          status === "approved" || status === "rejected"
            ? new Date()
            : null,
      })
      .where(eq(submissions.id, id))
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

// GET — get single submission
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
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
