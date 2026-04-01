import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, labels } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// POST — create a new submission (called from public portal — no auth)
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

    if (!labelId || !artistName?.trim() || !artistEmail?.trim() || !trackTitle?.trim() || !audioFileUrl || !audioFileKey) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Verify label exists
    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.id, labelId))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label não encontrada" }, { status: 404 });
    }

    const [submission] = await db
      .insert(submissions)
      .values({
        labelId,
        artistName: artistName.trim(),
        artistEmail: artistEmail.trim(),
        trackTitle: trackTitle.trim(),
        genre: genre || null,
        bpm: bpm ? parseInt(bpm, 10) : null,
        mixador: mixador?.trim() || null,
        distributor: distributor?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        tiktokUrl: tiktokUrl?.trim() || null,
        spotifyUrl: spotifyUrl?.trim() || null,
        youtubeUrl: youtubeUrl?.trim() || null,
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

// GET — list submissions (requires auth, scoped to user's label)
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

    const results = await db
      .select()
      .from(submissions)
      .where(eq(submissions.labelId, label.id))
      .orderBy(desc(submissions.aiScore), desc(submissions.submittedAt));

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/submissions error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar submissions" },
      { status: 500 }
    );
  }
}
