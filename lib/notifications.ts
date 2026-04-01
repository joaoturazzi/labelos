import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function createNotification(
  labelId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  try {
    await db.insert(notifications).values({
      labelId,
      type,
      title,
      body,
      link: link || null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
