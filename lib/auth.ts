import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the identifier for the current user's "tenant".
 * Prefers orgId (Clerk Organizations), falls back to userId
 * for instances without Organizations enabled.
 */
export async function getOwnerId(): Promise<string | null> {
  const { orgId, userId } = await auth();
  return orgId || userId || null;
}

/**
 * Get the label ID for the current authenticated user.
 * Uses orgId if available, falls back to userId.
 */
export async function requireLabelId(request?: Request): Promise<string> {
  // Check cron secret for Netlify scheduled functions
  if (request) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (
      cronSecret &&
      cronSecret === process.env.NETLIFY_FUNCTION_SECRET &&
      process.env.NETLIFY_FUNCTION_SECRET
    ) {
      throw new Error("CRON_MODE");
    }
  }

  const ownerId = await getOwnerId();
  if (!ownerId) {
    throw new Error("UNAUTHORIZED");
  }

  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, ownerId))
    .limit(1);

  if (!label) {
    throw new Error("LABEL_NOT_FOUND");
  }

  return label.id;
}

/**
 * Verify that a resource belongs to the authenticated user's label.
 */
export async function verifyOwnership(
  resourceLabelId: string | null
): Promise<void> {
  if (!resourceLabelId) {
    throw new Error("RESOURCE_HAS_NO_LABEL");
  }

  const labelId = await requireLabelId();
  if (resourceLabelId !== labelId) {
    throw new Error("FORBIDDEN");
  }
}
