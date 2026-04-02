import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeAllArtists } from "@/lib/scraping";

export async function POST(req: NextRequest) {
  try {
    // Accept either Clerk auth or cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const hasCronAuth =
      cronSecret &&
      process.env.NETLIFY_FUNCTION_SECRET &&
      cronSecret === process.env.NETLIFY_FUNCTION_SECRET;

    let labelId: string;

    if (hasCronAuth) {
      // Cron mode: process all labels
      const allLabels = await db.select().from(labels);
      for (const label of allLabels) {
        scrapeAllArtists(label.id).catch((err) =>
          console.error(`Scraping failed for ${label.name}:`, err)
        );
      }
      return NextResponse.json(
        { message: "Scraping iniciado para todas as labels", count: allLabels.length },
        { status: 202 }
      );
    }

    // User auth mode
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

    scrapeAllArtists(label.id).catch((err) =>
      console.error("Scraping run failed:", err)
    );

    return NextResponse.json(
      { message: "Scraping iniciado", labelId: label.id },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/scraping/run error:", err);
    return NextResponse.json({ error: "Erro ao iniciar scraping" }, { status: 500 });
  }
}
