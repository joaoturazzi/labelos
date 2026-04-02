import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, submissions } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [label] = await db.select().from(labels).where(eq(labels.clerkOrgId, ownerId)).limit(1);
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const conditions = [eq(submissions.labelId, label.id)];
    if (status) conditions.push(eq(submissions.status, status));
    if (dateFrom) conditions.push(gte(submissions.submittedAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(submissions.submittedAt, new Date(dateTo)));

    const rows = await db
      .select()
      .from(submissions)
      .where(and(...conditions))
      .orderBy(desc(submissions.submittedAt));

    // Build CSV
    const headers = [
      "artista", "email", "track", "gênero", "bpm", "mixador", "distribuidora",
      "score_ia", "status", "data_envio", "instagram", "tiktok", "spotify", "youtube", "audio_url",
    ];

    const csvRows = rows.map((r) =>
      [
        esc(r.artistName), esc(r.artistEmail), esc(r.trackTitle),
        esc(r.genre || ""), String(r.bpm || ""), esc(r.mixador || ""), esc(r.distributor || ""),
        String(r.aiScore ?? ""), r.status || "",
        r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
        esc(r.instagramUrl || ""), esc(r.tiktokUrl || ""),
        esc(r.spotifyUrl || ""), esc(r.youtubeUrl || ""), esc(r.audioFileUrl),
      ].join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const date = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${date}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/submissions/export error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

function esc(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
