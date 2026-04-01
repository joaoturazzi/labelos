import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artists, artistSocials, submissions } from "@/db/schema";
import { eq, desc, and, like } from "drizzle-orm";

// GET — full artist profile with socials + submissions
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    // All social snapshots ordered by date
    const socials = await db
      .select()
      .from(artistSocials)
      .where(eq(artistSocials.artistId, id))
      .orderBy(desc(artistSocials.collectedAt));

    // Submissions matching artist name/email
    const artistSubmissions = await db
      .select()
      .from(submissions)
      .where(
        artist.labelId
          ? and(
              eq(submissions.labelId, artist.labelId),
              eq(submissions.artistName, artist.name)
            )
          : eq(submissions.artistName, artist.name)
      )
      .orderBy(desc(submissions.submittedAt));

    // Group socials by platform — latest per platform
    const latestByPlatform: Record<string, (typeof socials)[number]> = {};
    for (const s of socials) {
      if (s.platform && !latestByPlatform[s.platform]) {
        latestByPlatform[s.platform] = s;
      }
    }

    // Build growth history — aggregate by collected_at date
    const growthHistory = socials.reduce<
      { date: string; followers: number }[]
    >((acc, s) => {
      if (!s.collectedAt || !s.followers) return acc;
      const date = new Date(s.collectedAt).toISOString().split("T")[0];
      const existing = acc.find((a) => a.date === date);
      if (existing) {
        existing.followers += s.followers;
      } else {
        acc.push({ date, followers: s.followers });
      }
      return acc;
    }, []);
    growthHistory.sort((a, b) => a.date.localeCompare(b.date));

    // Detect alerts
    const alerts: { type: "success" | "danger"; message: string }[] = [];
    for (const [platform, latest] of Object.entries(latestByPlatform)) {
      const previous = socials.find(
        (s) =>
          s.platform === platform &&
          s.id !== latest.id &&
          s.collectedAt
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
      allSocials: socials,
    });
  } catch (err) {
    console.error("GET /api/artists/[id] error:", err);
    return NextResponse.json({ error: "Erro ao buscar artista" }, { status: 500 });
  }
}

// PATCH — edit artist
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
      .where(eq(artists.id, id))
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

// DELETE — remove artist
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete social snapshots first
    await db.delete(artistSocials).where(eq(artistSocials.artistId, id));

    const [deleted] = await db
      .delete(artists)
      .where(eq(artists.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Artista não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/artists/[id] error:", err);
    return NextResponse.json({ error: "Erro ao remover artista" }, { status: 500 });
  }
}
