import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getLabelByClerkOrgId(clerkOrgId: string) {
  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, clerkOrgId))
    .limit(1);

  return label ?? null;
}
