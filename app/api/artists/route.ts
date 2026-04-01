import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { artists, labels, artistSocials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

// GET — list artists for current label with latest social snapshot
export async function GET() {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const result = await db
      .select()
      .from(artists)
      .where(eq(artists.labelId, labelId))
      .orderBy(desc(artists.createdAt));

    // For each artist, get their latest socials
    const enriched = await Promise.all(
      result.map(async (artist) => {
        const socials = await db
          .select()
          .from(artistSocials)
          .where(eq(artistSocials.artistId, artist.id))
          .orderBy(desc(artistSocials.collectedAt));

        // Group by platform, keep latest per platform
        const latestByPlatform: Record<string, typeof socials[number]> = {};
        for (const s of socials) {
          if (s.platform && !latestByPlatform[s.platform]) {
            latestByPlatform[s.platform] = s;
          }
        }

        // Calculate total followers
        const totalFollowers = Object.values(latestByPlatform).reduce(
          (sum, s) => sum + (s.followers || 0),
          0
        );

        // Get previous week snapshot to calculate delta
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const previousSocials = socials.filter(
          (s) => s.collectedAt && new Date(s.collectedAt) <= oneWeekAgo
        );
        const prevByPlatform: Record<string, typeof socials[number]> = {};
        for (const s of previousSocials) {
          if (s.platform && !prevByPlatform[s.platform]) {
            prevByPlatform[s.platform] = s;
          }
        }
        const prevTotal = Object.values(prevByPlatform).reduce(
          (sum, s) => sum + (s.followers || 0),
          0
        );

        const delta = prevTotal > 0 ? totalFollowers - prevTotal : null;
        const lastCollected = socials[0]?.collectedAt || null;

        return {
          ...artist,
          totalFollowers,
          followersDelta: delta,
          lastCollected,
          platforms: latestByPlatform,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET /api/artists error:", err);
    return NextResponse.json({ error: "Erro ao buscar artistas" }, { status: 500 });
  }
}

// POST — create artist
export async function POST(req: NextRequest) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, instagramHandle, tiktokHandle, spotifyId, youtubeChannel } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const [artist] = await db
      .insert(artists)
      .values({
        labelId,
        name: name.trim(),
        email: email?.trim() || null,
        instagramHandle: instagramHandle?.trim() || null,
        tiktokHandle: tiktokHandle?.trim() || null,
        spotifyId: spotifyId?.trim() || null,
        youtubeChannel: youtubeChannel?.trim() || null,
      })
      .returning();

    return NextResponse.json(artist, { status: 201 });
  } catch (err) {
    console.error("POST /api/artists error:", err);
    return NextResponse.json({ error: "Erro ao criar artista" }, { status: 500 });
  }
}
