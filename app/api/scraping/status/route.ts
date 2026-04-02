import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, artists, artistSocials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, ownerId))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const allArtists = await db
      .select()
      .from(artists)
      .where(eq(artists.labelId, label.id));

    // Get the most recent collected_at across all socials
    const latestSocials = await db
      .select({ collectedAt: artistSocials.collectedAt })
      .from(artistSocials)
      .innerJoin(artists, eq(artistSocials.artistId, artists.id))
      .where(eq(artists.labelId, label.id))
      .orderBy(desc(artistSocials.collectedAt))
      .limit(1);

    return NextResponse.json({
      totalArtists: allArtists.length,
      lastRun: latestSocials[0]?.collectedAt || null,
    });
  } catch (err) {
    console.error("GET /api/scraping/status error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
