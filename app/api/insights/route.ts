import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, artistInsights } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const isReadParam = searchParams.get("isRead");
    const artistId = searchParams.get("artistId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const conditions = [eq(artistInsights.labelId, label.id)];
    if (isReadParam === "false") {
      conditions.push(eq(artistInsights.isRead, false));
    }
    if (artistId) {
      conditions.push(eq(artistInsights.artistId, artistId));
    }

    const results = await db
      .select()
      .from(artistInsights)
      .where(and(...conditions))
      .orderBy(desc(artistInsights.generatedAt))
      .limit(limit);

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/insights error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
