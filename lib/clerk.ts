import { auth } from "@clerk/nextjs/server";

export async function getAuthOrRedirect() {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return { userId, orgId };
}

export async function requireOrgId() {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("No organization selected");
  }

  return orgId;
}
