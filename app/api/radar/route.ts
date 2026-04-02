import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, radarAlerts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET — list radar alerts for current label
export async function GET() {
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
      return NextResponse.json({ alerts: [], unreadCount: 0 });
    }

    const alerts = await db
      .select()
      .from(radarAlerts)
      .where(eq(radarAlerts.labelId, label.id))
      .orderBy(desc(radarAlerts.generatedAt))
      .limit(50);

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return NextResponse.json({ alerts, unreadCount });
  } catch (err) {
    console.error("GET /api/radar error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

// PATCH — mark all radar alerts as read
export async function PATCH() {
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
      return NextResponse.json({ ok: false });
    }

    await db
      .update(radarAlerts)
      .set({ isRead: true })
      .where(eq(radarAlerts.labelId, label.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/radar error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
