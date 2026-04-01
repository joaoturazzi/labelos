import { db } from "@/db";
import { artists, artistSocials, artistPosts, artistInsights } from "@/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

interface InsightInput {
  artistId: string;
  labelId: string;
}

const MILESTONES = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

async function hasRecentInsight(
  artistId: string,
  type: string,
  platform: string | null,
  hoursAgo = 24
): Promise<boolean> {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const existing = await db
    .select({ id: artistInsights.id })
    .from(artistInsights)
    .where(
      and(
        eq(artistInsights.artistId, artistId),
        eq(artistInsights.type, type),
        platform ? eq(artistInsights.platform, platform) : sql`true`,
        gte(artistInsights.generatedAt, cutoff)
      )
    )
    .limit(1);
  return existing.length > 0;
}

export async function generateInsights({ artistId, labelId }: InsightInput) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  if (!artist) return;

  const socials = await db
    .select()
    .from(artistSocials)
    .where(eq(artistSocials.artistId, artistId))
    .orderBy(desc(artistSocials.collectedAt));

  // Group by platform — latest 2 per platform
  const byPlatform: Record<string, (typeof socials)[number][]> = {};
  for (const s of socials) {
    if (!s.platform) continue;
    if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
    if (byPlatform[s.platform].length < 2) byPlatform[s.platform].push(s);
  }

  const inserts: {
    artistId: string;
    labelId: string;
    type: string;
    title: string;
    body: string;
    platform: string | null;
    value: string | null;
    delta: string | null;
    severity: string;
  }[] = [];

  for (const [platform, snapshots] of Object.entries(byPlatform)) {
    const latest = snapshots[0];
    const previous = snapshots[1];
    if (!latest?.followers) continue;

    // 1. Milestone check
    for (const milestone of MILESTONES) {
      if (
        latest.followers >= milestone &&
        (!previous || (previous.followers ?? 0) < milestone)
      ) {
        const label =
          milestone >= 1000000
            ? `${milestone / 1000000}M`
            : `${milestone / 1000}K`;
        if (!(await hasRecentInsight(artistId, "achievement", platform))) {
          inserts.push({
            artistId,
            labelId,
            type: "achievement",
            title: `${artist.name} chegou a ${label} seguidores no ${platform}!`,
            body: `Marco atingido: ${latest.followers.toLocaleString()} seguidores.`,
            platform,
            value: String(latest.followers),
            delta: null,
            severity: "success",
          });
        }
        break;
      }
    }

    // 2. Rapid growth (>15% in recent snapshot)
    if (previous?.followers && previous.followers > 0) {
      const growthPct =
        ((latest.followers - previous.followers) / previous.followers) * 100;
      if (growthPct > 15) {
        if (!(await hasRecentInsight(artistId, "alert", platform))) {
          inserts.push({
            artistId,
            labelId,
            type: "alert",
            title: `${platform}: +${growthPct.toFixed(1)}% de seguidores`,
            body: `Crescimento acelerado de ${previous.followers.toLocaleString()} para ${latest.followers.toLocaleString()}.`,
            platform,
            value: String(latest.followers),
            delta: growthPct.toFixed(2),
            severity: "success",
          });
        }
      }

      // 4. Engagement drop
      if (
        latest.engagementRate &&
        previous.engagementRate
      ) {
        const currentEng = parseFloat(latest.engagementRate);
        const prevEng = parseFloat(previous.engagementRate);
        if (prevEng > 0) {
          const engDrop = ((prevEng - currentEng) / prevEng) * 100;
          if (engDrop > 20) {
            if (!(await hasRecentInsight(artistId, "alert", platform + "_eng"))) {
              inserts.push({
                artistId,
                labelId,
                type: "alert",
                title: `Queda de engajamento no ${platform}`,
                body: `Engagement rate caiu de ${prevEng.toFixed(2)}% para ${currentEng.toFixed(2)}%.`,
                platform,
                value: currentEng.toFixed(2),
                delta: (-engDrop).toFixed(2),
                severity: "warning",
              });
            }
          }
        }
      }
    }
  }

  // 3. Viral post check
  const recentPosts = await db
    .select()
    .from(artistPosts)
    .where(eq(artistPosts.artistId, artistId))
    .orderBy(desc(artistPosts.collectedAt))
    .limit(20);

  if (recentPosts.length >= 3) {
    const viewValues = recentPosts
      .map((p) => p.views || p.playCount || 0)
      .filter((v) => v > 0);

    if (viewValues.length >= 3) {
      const avg =
        viewValues.slice(1).reduce((s, v) => s + v, 0) /
        (viewValues.length - 1);
      const latest = viewValues[0];

      if (latest > avg * 3 && avg > 0) {
        const post = recentPosts[0];
        if (!(await hasRecentInsight(artistId, "trend", post.platform))) {
          const formatted =
            latest >= 1_000_000
              ? `${(latest / 1_000_000).toFixed(1)}M`
              : latest >= 1_000
              ? `${(latest / 1_000).toFixed(1)}K`
              : String(latest);
          inserts.push({
            artistId,
            labelId,
            type: "trend",
            title: `Post viralizando no ${post.platform}: ${formatted} views`,
            body: post.content?.slice(0, 100) || "Post em alta",
            platform: post.platform,
            value: String(latest),
            delta: null,
            severity: "success",
          });
        }
      }
    }
  }

  // 5. News mentions
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentNews = await db
    .select()
    .from(artistPosts)
    .where(
      and(
        eq(artistPosts.artistId, artistId),
        eq(artistPosts.platform, "news"),
        gte(artistPosts.collectedAt, oneDayAgo)
      )
    );

  if (recentNews.length > 0) {
    if (!(await hasRecentInsight(artistId, "milestone", "news"))) {
      inserts.push({
        artistId,
        labelId,
        type: "milestone",
        title: `${artist.name} foi mencionado em ${recentNews.length} veiculo(s) de midia`,
        body: recentNews.map((n) => n.content?.slice(0, 60)).join("; "),
        platform: "news",
        value: String(recentNews.length),
        delta: null,
        severity: "info",
      });
    }
  }

  // 6. High activity
  const recentOwnPosts = await db
    .select()
    .from(artistPosts)
    .where(
      and(
        eq(artistPosts.artistId, artistId),
        gte(artistPosts.collectedAt, oneDayAgo)
      )
    );

  if (recentOwnPosts.length >= 3) {
    if (!(await hasRecentInsight(artistId, "trend", "activity"))) {
      inserts.push({
        artistId,
        labelId,
        type: "trend",
        title: `${artist.name} esta em alta atividade: ${recentOwnPosts.length} posts em 24h`,
        body: "Atividade acima do normal nas redes.",
        platform: null,
        value: String(recentOwnPosts.length),
        delta: null,
        severity: "info",
      });
    }
  }

  // Insert all
  if (inserts.length > 0) {
    await db.insert(artistInsights).values(inserts);
    console.log(`Generated ${inserts.length} insights for ${artist.name}`);
  }

  return inserts.length;
}
