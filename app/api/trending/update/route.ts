import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateAllTrending } from "@/lib/trending";

export async function POST(req: NextRequest) {
  try {
    // Accept either Clerk auth or cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const hasCronAuth =
      cronSecret &&
      process.env.NETLIFY_FUNCTION_SECRET &&
      cronSecret === process.env.NETLIFY_FUNCTION_SECRET;

    if (hasCronAuth) {
      const allLabels = await db.select().from(labels);
      for (const label of allLabels) {
        updateAllTrending(label.id).catch((err) =>
          console.error(`Trending update failed for ${label.name}:`, err)
        );
      }
      return NextResponse.json(
        { message: "Trending update iniciado para todas as labels", count: allLabels.length },
        { status: 202 }
      );
    }

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

    updateAllTrending(label.id).catch((err) =>
      console.error("Trending update failed:", err)
    );

    return NextResponse.json(
      { message: "Atualização iniciada" },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/trending/update error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
