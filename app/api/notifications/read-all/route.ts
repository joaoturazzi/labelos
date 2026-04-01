import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  try {
    const { orgId } = await auth();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [label] = await db.select().from(labels).where(eq(labels.clerkOrgId, orgId)).limit(1);
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.labelId, label.id), eq(notifications.isRead, false)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
