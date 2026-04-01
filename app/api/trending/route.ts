import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { trendingTracks, labels } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const tracks = await db
      .select()
      .from(trendingTracks)
      .where(eq(trendingTracks.labelId, label.id))
      .orderBy(trendingTracks.platform, trendingTracks.rank);

    // Group by platform
    const grouped: Record<string, typeof tracks> = {
      tiktok: [],
      reels: [],
      spotify: [],
    };

    for (const t of tracks) {
      const platform = t.platform || "tiktok";
      if (!grouped[platform]) grouped[platform] = [];
      grouped[platform].push(t);
    }

    // Get latest collected_at
    const latest = tracks.reduce<Date | null>((latest, t) => {
      if (!t.collectedAt) return latest;
      const d = new Date(t.collectedAt);
      return !latest || d > latest ? d : latest;
    }, null);

    return NextResponse.json({
      platforms: grouped,
      lastUpdated: latest?.toISOString() || null,
    });
  } catch (err) {
    console.error("GET /api/trending error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
