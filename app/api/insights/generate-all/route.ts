import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, artists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInsights } from "@/lib/insights";

export async function POST(req: NextRequest) {
  try {
    // Accept cron secret or Clerk auth
    const cronSecret = req.headers.get("x-cron-secret");
    const hasCronAuth =
      cronSecret &&
      process.env.NETLIFY_FUNCTION_SECRET &&
      cronSecret === process.env.NETLIFY_FUNCTION_SECRET;

    let labelIds: string[];

    if (hasCronAuth) {
      const allLabels = await db.select().from(labels);
      labelIds = allLabels.map((l) => l.id);
    } else {
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
      labelIds = [label.id];
    }

    let total = 0;
    for (const labelId of labelIds) {
      const allArtists = await db
        .select()
        .from(artists)
        .where(eq(artists.labelId, labelId));

      for (const artist of allArtists) {
        try {
          const count = await generateInsights({
            artistId: artist.id,
            labelId,
          });
          total += count || 0;
        } catch (err) {
          console.error(`Insight generation failed for ${artist.name}:`, err);
        }
      }
    }

    return NextResponse.json({ generated: total });
  } catch (err) {
    console.error("POST /api/insights/generate-all error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
