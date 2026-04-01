import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { labelSettingsSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = labelSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(labels)
      .set(parsed.data)
      .where(eq(labels.clerkOrgId, orgId))
      .returning();

    if (!updated) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/labels/settings error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
