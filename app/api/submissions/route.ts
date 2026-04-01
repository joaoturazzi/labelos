import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// POST — create a new submission (called from public portal)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      labelId,
      artistName,
      artistEmail,
      trackTitle,
      genre,
      bpm,
      mixador,
      distributor,
      instagramUrl,
      tiktokUrl,
      spotifyUrl,
      youtubeUrl,
      audioFileUrl,
      audioFileKey,
    } = body;

    if (!labelId || !artistName || !artistEmail || !trackTitle || !audioFileUrl || !audioFileKey) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    const [submission] = await db
      .insert(submissions)
      .values({
        labelId,
        artistName,
        artistEmail,
        trackTitle,
        genre: genre || null,
        bpm: bpm ? parseInt(bpm, 10) : null,
        mixador: mixador || null,
        distributor: distributor || null,
        instagramUrl: instagramUrl || null,
        tiktokUrl: tiktokUrl || null,
        spotifyUrl: spotifyUrl || null,
        youtubeUrl: youtubeUrl || null,
        audioFileUrl,
        audioFileKey,
        status: "pending",
      })
      .returning();

    // Fire-and-forget AI analysis
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch((err) => console.error("AI analyze trigger failed:", err));

    return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    console.error("POST /api/submissions error:", err);
    return NextResponse.json(
      { error: "Erro ao criar submission" },
      { status: 500 }
    );
  }
}

// GET — list submissions for a label
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return NextResponse.json(
        { error: "labelId is required" },
        { status: 400 }
      );
    }

    const results = await db
      .select()
      .from(submissions)
      .where(eq(submissions.labelId, labelId))
      .orderBy(
        desc(submissions.aiScore),
        desc(submissions.submittedAt)
      );

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/submissions error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar submissions" },
      { status: 500 }
    );
  }
}
