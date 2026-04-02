import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
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

// GET — get label for current user (auto-create if missing)
// Supports both orgId (Organizations) and userId (fallback)
export async function GET() {
  try {
    const { orgId, userId, orgSlug } = await auth();
    const ownerId = orgId || userId;

    if (!ownerId) {
      return NextResponse.json(
        { error: "Sem autenticacao" },
        { status: 401 }
      );
    }

    // Try to find existing label
    const [existing] = await db
      .select()
      .from(labels)
      .where(eq(labels.clerkOrgId, ownerId))
      .limit(1);

    if (existing) {
      return NextResponse.json(existing);
    }

    // Auto-create label
    let labelName = "Minha Gravadora";
    let rawSlug = ownerId.replace(/^(org_|user_)/, "").slice(0, 12).toLowerCase();

    // Try to get better name from Clerk
    try {
      if (orgId) {
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({
          organizationId: orgId,
        });
        labelName = org.name || labelName;
        rawSlug = slugify(org.slug || org.name || orgId);
      } else {
        const user = await currentUser();
        if (user?.firstName) {
          labelName = `${user.firstName} Gravadora`;
          rawSlug = slugify(user.firstName);
        }
      }
    } catch {
      // Fallback to defaults
    }

    if (!rawSlug) rawSlug = ownerId.slice(-12).toLowerCase();

    // Ensure slug is unique
    const [slugConflict] = await db
      .select({ id: labels.id })
      .from(labels)
      .where(eq(labels.slug, rawSlug))
      .limit(1);

    const finalSlug = slugConflict
      ? `${rawSlug}-${ownerId.slice(-4).toLowerCase()}`
      : rawSlug;

    const [newLabel] = await db
      .insert(labels)
      .values({
        clerkOrgId: ownerId,
        name: labelName,
        slug: finalSlug,
        plan: "free",
      })
      .returning();

    console.log(
      `[api/label] Auto-created label "${labelName}" slug="${finalSlug}" for ${ownerId}`
    );

    return NextResponse.json(newLabel);
  } catch (err) {
    console.error("GET /api/label error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar label" },
      { status: 500 }
    );
  }
}
