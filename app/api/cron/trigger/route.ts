import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeAllArtists } from "@/lib/scraping";
import { updateAllTrending } from "@/lib/trending";

// POST — manual trigger for scraping + trending (local dev)
export async function POST() {
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

    // Run both in parallel, fire-and-forget
    Promise.allSettled([
      scrapeAllArtists(label.id),
      updateAllTrending(label.id),
    ]).catch((err) => console.error("Cron trigger failed:", err));

    return NextResponse.json(
      { message: "Scraping + trending iniciados", labelId: label.id },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/cron/trigger error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
