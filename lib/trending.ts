import { db } from "@/db";
import { trendingTracks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runApifyActor, getApifyDataset } from "./apify";
import { getSpotifyPlaylistTracks } from "./spotify";

async function waitForRun(runId: string): Promise<string> {
  const token = process.env.APIFY_API_KEY;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (data.data?.status === "SUCCEEDED") {
      return data.data.defaultDatasetId;
    }
    if (data.data?.status === "FAILED" || data.data?.status === "ABORTED") {
      throw new Error(`Apify run ${data.data.status}`);
    }
  }
  throw new Error("Apify run timeout");
}

async function fetchTikTokTrending(labelId: string): Promise<void> {
  try {
    const run = await runApifyActor({
      actorId: "clockworks/tiktok-scraper",
      input: {
        hashtags: ["viral", "trending", "brasil"],
        resultsType: "posts",
        maxItems: 50,
      },
    });

    const datasetId = await waitForRun(run.data.id);
    const items = await getApifyDataset(datasetId);

    // Get previous tracks for delta calc
    const previous = await db
      .select()
      .from(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "tiktok"))
      );

    const prevByName = new Map(previous.map((t) => [t.trackName, t.rank]));

    // Delete old
    await db
      .delete(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "tiktok"))
      );

    // Extract music from posts
    const musicMap = new Map<string, { plays: number; artist: string }>();
    for (const item of items) {
      const musicName = item.musicMeta?.musicName || item.music?.title;
      const musicAuthor = item.musicMeta?.musicAuthor || item.music?.authorName || item.authorMeta?.name || "Unknown";
      const plays = item.playCount || item.stats?.playCount || 0;
      if (musicName) {
        const existing = musicMap.get(musicName);
        if (existing) {
          existing.plays += plays;
        } else {
          musicMap.set(musicName, { plays, artist: musicAuthor });
        }
      }
    }

    const sorted = [...musicMap.entries()]
      .sort((a, b) => b[1].plays - a[1].plays)
      .slice(0, 50);

    if (sorted.length > 0) {
      await db.insert(trendingTracks).values(
        sorted.map(([name, data], i) => ({
          labelId,
          platform: "tiktok",
          rank: i + 1,
          trackName: name,
          artistName: data.artist,
          plays: data.plays,
          deltaRank: prevByName.has(name)
            ? (prevByName.get(name)! - (i + 1))
            : null,
        }))
      );
    }
  } catch (err) {
    console.error("TikTok trending error:", err);
  }
}

async function fetchSpotifyTrending(labelId: string): Promise<void> {
  try {
    // Spotify Viral 50 - Brazil
    const tracks = await getSpotifyPlaylistTracks("37i9dQZEVXbMMy2roB9myp", 50);

    const previous = await db
      .select()
      .from(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "spotify"))
      );

    const prevByName = new Map(previous.map((t) => [t.trackName, t.rank]));

    await db
      .delete(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "spotify"))
      );

    if (tracks.length > 0) {
      await db.insert(trendingTracks).values(
        tracks.map((t: { rank: number; trackName: string; artistName: string; popularity: number }) => ({
          labelId,
          platform: "spotify",
          rank: t.rank,
          trackName: t.trackName,
          artistName: t.artistName,
          plays: t.popularity,
          deltaRank: prevByName.has(t.trackName)
            ? (prevByName.get(t.trackName)! - t.rank)
            : null,
        }))
      );
    }
  } catch (err) {
    console.error("Spotify trending error:", err);
  }
}

async function fetchReelsTrending(labelId: string): Promise<void> {
  try {
    const run = await runApifyActor({
      actorId: "apify/instagram-reel-scraper",
      input: {
        hashtags: ["viral", "tendencia", "reels"],
        resultsPerPage: 50,
      },
    });

    const datasetId = await waitForRun(run.data.id);
    const items = await getApifyDataset(datasetId);

    const previous = await db
      .select()
      .from(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "reels"))
      );

    const prevByName = new Map(previous.map((t) => [t.trackName, t.rank]));

    await db
      .delete(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "reels"))
      );

    // Sort by viewCount
    const sorted = items
      .filter((item: Record<string, unknown>) => item.caption || item.shortCode)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.viewCount as number) || 0) - ((a.viewCount as number) || 0)
      )
      .slice(0, 50);

    if (sorted.length > 0) {
      await db.insert(trendingTracks).values(
        sorted.map((item: Record<string, unknown>, i: number) => {
          const name = (item.caption as string || "").slice(0, 100) || `Reel #${i + 1}`;
          return {
            labelId,
            platform: "reels",
            rank: i + 1,
            trackName: name,
            artistName: (item.ownerUsername as string) || "Unknown",
            plays: (item.viewCount as number) || 0,
            deltaRank: prevByName.has(name)
              ? (prevByName.get(name)! - (i + 1))
              : null,
          };
        })
      );
    }
  } catch (err) {
    console.error("Reels trending error:", err);
  }
}

export async function updateAllTrending(labelId: string) {
  await Promise.allSettled([
    fetchTikTokTrending(labelId),
    fetchSpotifyTrending(labelId),
    fetchReelsTrending(labelId),
  ]);
}
