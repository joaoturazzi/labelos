import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { labels, aiConfigs } from "./schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // 1. Upsert demo label (for local development only)
  const existing = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, "org_local_test"))
    .limit(1);

  let label;
  if (existing.length > 0) {
    label = existing[0];
    console.log("Label already exists:", label.name);
  } else {
    [label] = await db
      .insert(labels)
      .values({
        name: "Gravadora Demo",
        slug: "demo",
        clerkOrgId: "org_local_test",
        plan: "free",
      })
      .returning();
    console.log("Label created:", label.name);
  }

  // 2. Upsert default AI config
  const existingConfig = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.labelId, label.id));

  if (existingConfig.length === 0) {
    await db.insert(aiConfigs).values({
      labelId: label.id,
      criteria: {
        generos_preferidos: ["Funk", "Trap", "Pop"],
        bpm_ideal: "80-140",
        foco: "Potencial comercial e fit com TikTok/Reels",
        qualidade_minima: "Produção limpa, mix equilibrado",
      },
      model: "google/gemini-2.0-flash-001",
    });
    console.log("AI config created");
  } else {
    console.log("AI config already exists");
  }

  console.log("Seed completed!");
  console.log(`\nPortal: http://localhost:3000/submit/${label.slug}`);
  console.log("Dashboard: http://localhost:3000/dashboard/feed");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
