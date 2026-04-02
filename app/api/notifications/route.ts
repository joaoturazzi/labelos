import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  try {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [label] = await db.select().from(labels).where(eq(labels.clerkOrgId, ownerId)).limit(1);
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.labelId, label.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    const unreadCount = results.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications: results, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
