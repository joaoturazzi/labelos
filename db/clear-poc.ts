import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  labels, submissions, artists, artistSocials, artistPosts,
  artistInsights, trendingTracks, notifications, radarAlerts, aiConfigs,
} from "./schema";
import { eq, sql } from "drizzle-orm";

async function clearPOC() {
  const dbSql = neon(process.env.DATABASE_URL!);
  const db = drizzle(dbSql);

  console.log("🧹 Removendo dados POC...");

  const allLabels = await db.select().from(labels);
  if (allLabels.length === 0) {
    console.log("Nenhuma label encontrada.");
    process.exit(0);
  }

  const label = allLabels[0];
  console.log(`Label: ${label.name}`);

  try { await db.delete(radarAlerts).where(eq(radarAlerts.labelId, label.id)); } catch {}
  try { await db.delete(notifications).where(eq(notifications.labelId, label.id)); } catch {}
  try { await db.delete(trendingTracks).where(eq(trendingTracks.labelId, label.id)); } catch {}
  try { await db.delete(artistInsights).where(eq(artistInsights.labelId, label.id)); } catch {}
  try { await db.delete(artistPosts).where(eq(artistPosts.labelId, label.id)); } catch {}
  try { await db.execute(sql`DELETE FROM artist_socials WHERE artist_id IN (SELECT id FROM artists WHERE label_id = ${label.id})`); } catch {}
  try { await db.delete(submissions).where(eq(submissions.labelId, label.id)); } catch {}
  try { await db.delete(artists).where(eq(artists.labelId, label.id)); } catch {}
  try { await db.delete(aiConfigs).where(eq(aiConfigs.labelId, label.id)); } catch {}

  console.log("✅ Dados POC removidos. Sistema limpo.");
  process.exit(0);
}

clearPOC().catch(console.error);
