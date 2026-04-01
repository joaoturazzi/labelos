import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, labels } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { submissionSchema } from "@/lib/schemas";
import { sendSubmissionConfirmation } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

// POST — create a new submission (public portal — no auth)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify label exists
    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.id, data.labelId))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label nao encontrada" }, { status: 404 });
    }

    // Check for duplicate submission
    const existing = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.labelId, data.labelId),
          eq(submissions.artistEmail, data.artistEmail),
          eq(submissions.trackTitle, data.trackTitle)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Esta track ja foi enviada para esta gravadora." },
        { status: 409 }
      );
    }

    const [submission] = await db
      .insert(submissions)
      .values({
        labelId: data.labelId,
        artistName: data.artistName.trim(),
        artistEmail: data.artistEmail.trim(),
        trackTitle: data.trackTitle.trim(),
        genre: data.genre || null,
        bpm: data.bpm || null,
        mixador: data.mixador?.trim() || null,
        distributor: data.distributor?.trim() || null,
        instagramUrl: data.instagramUrl?.trim() || null,
        tiktokUrl: data.tiktokUrl?.trim() || null,
        spotifyUrl: data.spotifyUrl?.trim() || null,
        youtubeUrl: data.youtubeUrl?.trim() || null,
        audioFileUrl: data.audioFileUrl,
        audioFileKey: data.audioFileKey,
        status: "pending",
        lgpdConsentAt: data.lgpdConsent ? new Date() : null,
      })
      .returning();

    // Fire-and-forget: AI analysis
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: submission.id }),
    }).catch((err) => console.error("AI analyze trigger failed:", err));

    // Fire-and-forget: emails + notification
    sendSubmissionConfirmation(
      data.artistEmail,
      data.artistName,
      data.trackTitle,
      label.name
    );

    createNotification(
      label.id,
      "new_submission",
      `Nova demo: ${data.trackTitle}`,
      `${data.artistName} enviou uma demo`,
      "/dashboard/submissions"
    );

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
