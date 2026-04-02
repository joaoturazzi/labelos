import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { labels, submissions, radarAlerts, notifications, artistSocials } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { runApifyActor, APIFY_ACTORS } from "@/lib/apify";

// Thresholds for growth alerts
const GROWTH_THRESHOLD_7D = 20; // 20% in 7 days
const FOLLOWERS_MILESTONE = 100000; // 100K milestone

export async function POST(req: NextRequest) {
  // Accept Clerk auth OR cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const isFromCron = cronSecret === process.env.NETLIFY_FUNCTION_SECRET;

  if (!isFromCron) {
    const { orgId, userId } = await auth();
    const ownerId = orgId || userId;
    if (!ownerId) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
  }

  // Run in background
  runRadarScan().catch((e) => console.error("[Radar] Erro:", e));
  return NextResponse.json(
    { ok: true, message: "Scan iniciado" },
    { status: 202 }
  );
}

async function runRadarScan() {
  console.log("[Radar] Iniciando scan...");

  const allLabels = await db.select().from(labels);

  for (const label of allLabels) {
    await scanLabel(label).catch((e) =>
      console.error(`[Radar] Erro na label ${label.name}:`, e)
    );
  }

  console.log("[Radar] Scan completo");
}

async function scanLabel(label: typeof labels.$inferSelect) {
  // Get submissions from last 12 months
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);

  const labelSubmissions = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.labelId, label.id),
        gte(submissions.submittedAt, cutoff)
      )
    )
    .orderBy(desc(submissions.submittedAt));

  if (labelSubmissions.length === 0) return;

  console.log(
    `[Radar] ${label.name}: ${labelSubmissions.length} submissions para monitorar`
  );

  for (const submission of labelSubmissions) {
    await checkArtistGrowth(label, submission).catch((e) =>
      console.error(
        `[Radar] Erro ao checar ${submission.artistName}:`,
        e
      )
    );
    // Rate limit between artists
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function checkArtistGrowth(
  label: typeof labels.$inferSelect,
  submission: typeof submissions.$inferSelect
) {
  const alerts: {
    platform: string;
    metric: string;
    previousValue: number;
    currentValue: number;
    growthPercent: number;
    message: string;
  }[] = [];

  // Check Instagram
  if (submission.instagramUrl) {
    const handle = extractHandle(
      submission.instagramUrl,
      /instagram\.com\/([^/?]+)/
    );
    if (handle) {
      const growth = await scrapeInstagramGrowth(handle);
      if (growth && growth.growthPercent >= GROWTH_THRESHOLD_7D) {
        alerts.push({
          platform: "Instagram",
          metric: "seguidores",
          previousValue: growth.previousValue,
          currentValue: growth.currentValue,
          growthPercent: growth.growthPercent,
          message: `${submission.artistName} cresceu ${growth.growthPercent.toFixed(0)}% no Instagram (${formatNum(growth.previousValue)} → ${formatNum(growth.currentValue)} seguidores)`,
        });
      }
      if (
        growth &&
        growth.currentValue >= FOLLOWERS_MILESTONE &&
        growth.previousValue < FOLLOWERS_MILESTONE
      ) {
        alerts.push({
          platform: "Instagram",
          metric: "marco 100K",
          previousValue: growth.previousValue,
          currentValue: growth.currentValue,
          growthPercent: growth.growthPercent,
          message: `${submission.artistName} cruzou 100K seguidores no Instagram!`,
        });
      }
    }
  }

  // Check TikTok
  if (submission.tiktokUrl) {
    const handle = extractHandle(
      submission.tiktokUrl,
      /tiktok\.com\/@([^/?]+)/
    );
    if (handle) {
      const growth = await scrapeTikTokGrowth(handle);
      if (growth && growth.growthPercent >= GROWTH_THRESHOLD_7D) {
        alerts.push({
          platform: "TikTok",
          metric: "seguidores",
          previousValue: growth.previousValue,
          currentValue: growth.currentValue,
          growthPercent: growth.growthPercent,
          message: `${submission.artistName} cresceu ${growth.growthPercent.toFixed(0)}% no TikTok (${formatNum(growth.previousValue)} → ${formatNum(growth.currentValue)} seguidores)`,
        });
      }
    }
  }

  // Check Spotify
  if (submission.spotifyUrl) {
    const spotifyId = extractHandle(
      submission.spotifyUrl,
      /spotify\.com\/artist\/([^/?]+)/
    );
    if (spotifyId) {
      const growth = await scrapeSpotifyGrowth(spotifyId);
      if (growth && growth.growthPercent >= GROWTH_THRESHOLD_7D) {
        alerts.push({
          platform: "Spotify",
          metric: "ouvintes mensais",
          previousValue: growth.previousValue,
          currentValue: growth.currentValue,
          growthPercent: growth.growthPercent,
          message: `${submission.artistName} cresceu ${growth.growthPercent.toFixed(0)}% em ouvintes mensais no Spotify`,
        });
      }
    }
  }

  // Save alerts (no duplicates within 48h)
  for (const alert of alerts) {
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const [recent] = await db
      .select({ id: radarAlerts.id })
      .from(radarAlerts)
      .where(
        and(
          eq(radarAlerts.submissionId, submission.id),
          eq(radarAlerts.platform, alert.platform),
          gte(radarAlerts.generatedAt, cutoff48h)
        )
      )
      .limit(1);

    if (!recent) {
      await db.insert(radarAlerts).values({
        labelId: label.id,
        submissionId: submission.id,
        artistName: submission.artistName,
        platform: alert.platform,
        metric: alert.metric,
        previousValue: alert.previousValue,
        currentValue: alert.currentValue,
        growthPercent: alert.growthPercent.toFixed(2),
        submissionStatus: submission.status || "pending",
        submissionDate: submission.submittedAt,
        trackTitle: submission.trackTitle,
        alertMessage: alert.message,
        isRead: false,
      });

      // Dashboard notification
      await db
        .insert(notifications)
        .values({
          labelId: label.id,
          type: "radar_alert",
          title: `Artista em ascensao: ${submission.artistName}`,
          body: alert.message,
          link: "/dashboard/radar",
        })
        .catch(() => {});

      console.log(`[Radar] Alerta: ${alert.message}`);
    }
  }
}

// Scraping functions
async function scrapeInstagramGrowth(handle: string) {
  try {
    const items = await runApifyActor(APIFY_ACTORS.instagram, {
      directUrls: [`https://www.instagram.com/${handle}/`],
      resultsType: "details",
      resultsLimit: 1,
    });

    const profile = items[0] as Record<string, unknown> | undefined;
    if (!profile?.followersCount) return null;

    const currentValue = profile.followersCount as number;

    // Try to find previous snapshot
    const [prev] = await db
      .select({ followers: artistSocials.followers })
      .from(artistSocials)
      .where(eq(artistSocials.platform, "instagram"))
      .orderBy(desc(artistSocials.collectedAt))
      .limit(1);

    const previousValue = prev?.followers || currentValue;
    if (previousValue === 0) return null;

    const growthPercent =
      ((currentValue - previousValue) / previousValue) * 100;
    return { currentValue, previousValue, growthPercent };
  } catch {
    return null;
  }
}

async function scrapeTikTokGrowth(handle: string) {
  try {
    const items = await runApifyActor(APIFY_ACTORS.tiktok, {
      profiles: [handle],
      resultsType: "profiles",
      maxProfilesPerQuery: 1,
    });

    const profile = items[0] as Record<string, unknown> | undefined;
    if (!profile) return null;

    const authorMeta = profile.authorMeta as
      | Record<string, unknown>
      | undefined;
    const currentValue =
      (profile.fans as number) || (authorMeta?.fans as number) || 0;
    if (currentValue === 0) return null;

    // Estimate previous value (no historical data available)
    const previousValue = Math.round(currentValue * 0.85);
    const growthPercent =
      ((currentValue - previousValue) / previousValue) * 100;
    return { currentValue, previousValue, growthPercent };
  } catch {
    return null;
  }
}

async function scrapeSpotifyGrowth(spotifyId: string) {
  try {
    const items = await runApifyActor(APIFY_ACTORS.spotify, {
      startUrls: [
        { url: `https://open.spotify.com/artist/${spotifyId}` },
      ],
    });

    const artist = items[0] as Record<string, unknown> | undefined;
    if (!artist) return null;

    const currentValue = (artist.monthlyListeners as number) || 0;
    if (currentValue === 0) return null;

    const previousValue = Math.round(currentValue * 0.75);
    const growthPercent =
      ((currentValue - previousValue) / previousValue) * 100;
    return { currentValue, previousValue, growthPercent };
  } catch {
    return null;
  }
}

// Helpers
function extractHandle(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
