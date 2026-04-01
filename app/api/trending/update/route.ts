import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateAllTrending } from "@/lib/trending";

export async function POST() {
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

    // Fire-and-forget
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
