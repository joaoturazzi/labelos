import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { artists, artistSocials, submissions, labels } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

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

// GET — full artist profile (tenant-isolated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify artist belongs to this label
    const [artist] = await db
      .select()
      .from(artists)
      .where(and(eq(artists.id, id), eq(artists.labelId, labelId)))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    const socials = await db
      .select()
      .from(artistSocials)
      .where(eq(artistSocials.artistId, id))
      .orderBy(desc(artistSocials.collectedAt));

    const artistSubmissions = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.labelId, labelId),
          eq(submissions.artistName, artist.name)
        )
      )
      .orderBy(desc(submissions.submittedAt));

    // Latest per platform
    const latestByPlatform: Record<string, (typeof socials)[number]> = {};
    for (const s of socials) {
      if (s.platform && !latestByPlatform[s.platform]) {
        latestByPlatform[s.platform] = s;
      }
    }

    // Growth history — aggregate total followers per date
    const growthHistory = socials.reduce<{ date: string; followers: number }[]>(
      (acc, s) => {
        if (!s.collectedAt || !s.followers) return acc;
        const date = new Date(s.collectedAt).toISOString().split("T")[0];
        const existing = acc.find((a) => a.date === date);
        if (existing) {
          existing.followers += s.followers;
        } else {
          acc.push({ date, followers: s.followers });
        }
        return acc;
      },
      []
    );
    growthHistory.sort((a, b) => a.date.localeCompare(b.date));

    // Alerts
    const alerts: { type: "success" | "danger"; message: string }[] = [];
    for (const [platform, latest] of Object.entries(latestByPlatform)) {
      const previous = socials.find(
        (s) => s.platform === platform && s.id !== latest.id && s.collectedAt
      );
      if (previous && latest.followers && previous.followers && previous.followers > 0) {
        const delta = (latest.followers - previous.followers) / previous.followers;
        if (delta > 0.2) {
          alerts.push({
            type: "success",
            message: `Crescimento acelerado no ${platform} (+${Math.round(delta * 100)}%)`,
          });
        } else if (delta < -0.1) {
          alerts.push({
            type: "danger",
            message: `Queda no engajamento do ${platform} (${Math.round(delta * 100)}%)`,
          });
        }
      }
    }

    return NextResponse.json({
      ...artist,
      platforms: latestByPlatform,
      growthHistory,
      alerts,
      submissions: artistSubmissions,
    });
  } catch (err) {
    console.error("GET /api/artists/[id] error:", err);
    return NextResponse.json({ error: "Erro ao buscar artista" }, { status: 500 });
  }
}

// PATCH — edit artist (tenant-isolated)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, instagramHandle, tiktokHandle, spotifyId, youtubeChannel } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email?.trim() || null;
    if (instagramHandle !== undefined) updates.instagramHandle = instagramHandle?.trim() || null;
    if (tiktokHandle !== undefined) updates.tiktokHandle = tiktokHandle?.trim() || null;
    if (spotifyId !== undefined) updates.spotifyId = spotifyId?.trim() || null;
    if (youtubeChannel !== undefined) updates.youtubeChannel = youtubeChannel?.trim() || null;

    const [updated] = await db
      .update(artists)
      .set(updates)
      .where(and(eq(artists.id, id), eq(artists.labelId, labelId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/artists/[id] error:", err);
    return NextResponse.json({ error: "Erro ao atualizar artista" }, { status: 500 });
  }
}

// DELETE — remove artist (tenant-isolated)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before delete
    const [artist] = await db
      .select()
      .from(artists)
      .where(and(eq(artists.id, id), eq(artists.labelId, labelId)))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    await db.delete(artistSocials).where(eq(artistSocials.artistId, id));
    await db.delete(artists).where(eq(artists.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/artists/[id] error:", err);
    return NextResponse.json({ error: "Erro ao remover artista" }, { status: 500 });
  }
}
