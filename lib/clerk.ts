import { auth } from "@clerk/nextjs/server";

export async function getAuthOrRedirect() {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return { userId, orgId };
}

export async function requireOwnerId() {
  const { orgId, userId } = await auth();
  const ownerId = orgId || userId;

  if (!ownerId) {
    throw new Error("No authenticated user");
  }

  return ownerId;
}
