import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the label ID for the current authenticated user's organization.
 * Also accepts a cron secret header as fallback for scheduled functions.
 */
export async function requireLabelId(request?: Request): Promise<string> {
  // Check cron secret for Netlify scheduled functions
  if (request) {
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret && cronSecret === process.env.NETLIFY_FUNCTION_SECRET && process.env.NETLIFY_FUNCTION_SECRET) {
      // For cron jobs, we need a different approach — they operate on all labels
      throw new Error("CRON_MODE");
    }
  }

  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("UNAUTHORIZED");
  }

  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, orgId))
    .limit(1);

  if (!label) {
    throw new Error("LABEL_NOT_FOUND");
  }

  return label.id;
}

/**
 * Verify that a resource belongs to the authenticated user's label.
 */
export async function verifyOwnership(resourceLabelId: string | null): Promise<void> {
  if (!resourceLabelId) {
    throw new Error("RESOURCE_HAS_NO_LABEL");
  }

  const labelId = await requireLabelId();
  if (resourceLabelId !== labelId) {
    throw new Error("FORBIDDEN");
  }
}
