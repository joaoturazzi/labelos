import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { artistInsights, labels } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, orgId))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(artistInsights)
      .set({ isRead: true })
      .where(
        and(
          eq(artistInsights.id, params.id),
          eq(artistInsights.labelId, label.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/insights/[id]/read error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
