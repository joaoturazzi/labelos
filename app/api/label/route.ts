import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — get label for current org (auto-create if missing)
export async function GET() {
  try {
    const { orgId, orgSlug } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization" },
        { status: 401 }
      );
    }

    // Try to find existing label
    const [existing] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, orgId))
      .limit(1);

    if (existing) {
      return NextResponse.json(existing);
    }

    // Auto-create label if it doesn't exist yet
    // This handles the case where the Clerk webhook hasn't fired
    // or the user is in local dev without webhooks
    const user = await currentUser();
    const orgName =
      orgSlug || user?.firstName
        ? `${user?.firstName || "Minha"} Gravadora`
        : "Minha Gravadora";
    const slug = orgSlug || orgId.replace("org_", "").slice(0, 12).toLowerCase();

    const [newLabel] = await db
      .insert(labels)
      .values({
        clerkOrgId: orgId,
        name: orgName,
        slug,
        plan: "free",
      })
      .returning();

    console.log(`[Label] Auto-created label "${orgName}" for org ${orgId}`);

    return NextResponse.json(newLabel);
  } catch (err) {
    console.error("GET /api/label error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar label" },
      { status: 500 }
    );
  }
}
