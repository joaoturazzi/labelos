import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// GET — get label for current org (auto-create if missing)
export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json(
        { error: "Sem organizacao ativa" },
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

    // Auto-create label using Clerk org data
    let orgName = "Minha Gravadora";
    let rawSlug = orgId.replace("org_", "").slice(0, 12).toLowerCase();

    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      orgName = org.name || orgName;
      rawSlug = slugify(org.slug || org.name || orgId);
    } catch (err) {
      console.warn("[api/label] Could not fetch Clerk org, using fallback:", err);
    }

    // Ensure slug is not empty
    if (!rawSlug) {
      rawSlug = orgId.replace("org_", "").slice(0, 12).toLowerCase();
    }

    // Ensure slug is unique
    const [slugConflict] = await db
      .select({ id: labels.id })
      .from(labels)
      .where(eq(labels.slug, rawSlug))
      .limit(1);

    const finalSlug = slugConflict
      ? `${rawSlug}-${orgId.slice(-4).toLowerCase()}`
      : rawSlug;

    const [newLabel] = await db
      .insert(labels)
      .values({
        clerkOrgId: orgId,
        name: orgName,
        slug: finalSlug,
        plan: "free",
      })
      .returning();

    console.log(`[api/label] Auto-created label "${orgName}" slug="${finalSlug}" for org ${orgId}`);

    return NextResponse.json(newLabel);
  } catch (err) {
    console.error("GET /api/label error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar label" },
      { status: 500 }
    );
  }
}
