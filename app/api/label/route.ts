import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — get label for current org
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization" },
        { status: 401 }
      );
    }

    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, orgId))
      .limit(1);

    if (!label) {
      return NextResponse.json(
        { error: "Label not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(label);
  } catch (err) {
    console.error("GET /api/label error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar label" },
      { status: 500 }
    );
  }
}
