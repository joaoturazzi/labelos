import { db } from "@/db";
import { trendingTracks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runApifyActor, APIFY_ACTORS } from "./apify";

// ── TikTok trending ─────────────────────────────────────────────────

async function fetchTikTokTrending(labelId: string): Promise<void> {
  try {
    const items = await runApifyActor(APIFY_ACTORS.tiktok, {
      hashtags: ["viral", "trending", "brasil"],
      resultsType: "posts",
      maxItems: 50,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });

    const previous = await db
      .select()
      .from(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "tiktok"))
      );

    const prevByName = new Map(previous.map((t) => [t.trackName, t.rank]));

    await db
      .delete(trendingTracks)
      .where(
        and(eq(trendingTracks.labelId, labelId), eq(trendingTracks.platform, "tiktok"))
      );

    // Extract music from posts
    const musicMap = new Map<string, { plays: number; artist: string }>();
    for (const item of items as Record<string, unknown>[]) {
      const meta = item.musicMeta as Record<string, string> | undefined;
      const music = item.music as Record<string, string> | undefined;
      const musicName = meta?.musicName || music?.title;
      const musicAuthor = meta?.musicAuthor || music?.authorName ||
        (item.authorMeta as Record<string, string>)?.name || "Unknown";
      const plays = (item.playCount as number) ||
        ((item.stats as Record<string, number>)?.playCount) || 0;

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
            ? prevByName.get(name)! - (i + 1)
            : null,
        }))
      );
    }
  } catch (err) {
    console.error("TikTok trending error:", err);
  }
}

// ── Spotify trending (via Apify actor) ──────────────────────────────

async function fetchSpotifyTrending(labelId: string): Promise<void> {
  try {
    // Use the Spotify Apify actor to scrape Viral 50 Brazil playlist
    const items = await runApifyActor(APIFY_ACTORS.spotify, {
      startUrls: [
        { url: "https://open.spotify.com/playlist/37i9dQZEVXbMMy2roB9myp" },
      ],
      maxItems: 50,
    });

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

    const tracks = (items as Record<string, unknown>[])
      .filter((i) => i.name || i.trackName)
      .slice(0, 50);

    if (tracks.length > 0) {
      await db.insert(trendingTracks).values(
        tracks.map((t, i) => {
          const trackName = (t.name as string) || (t.trackName as string) || "Unknown";
          const artistName = (t.artistName as string) ||
            ((t.artists as Record<string, string>[]))?.[0]?.name || "Unknown";
          return {
            labelId,
            platform: "spotify",
            rank: i + 1,
            trackName,
            artistName,
            plays: (t.popularity as number) || (t.playCount as number) || 0,
            deltaRank: prevByName.has(trackName)
              ? prevByName.get(trackName)! - (i + 1)
              : null,
          };
        })
      );
    }
  } catch (err) {
    console.error("Spotify trending error:", err);
  }
}

// ── Instagram Reels trending ────────────────────────────────────────

async function fetchReelsTrending(labelId: string): Promise<void> {
  try {
    const items = await runApifyActor(APIFY_ACTORS.instagram, {
      hashtags: ["viral", "tendencia", "reels"],
      resultsType: "posts",
      resultsLimit: 50,
    });

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

    const sorted = (items as Record<string, unknown>[])
      .filter((item) => item.caption || item.shortCode)
      .sort((a, b) =>
        ((b.videoViewCount as number) || 0) - ((a.videoViewCount as number) || 0)
      )
      .slice(0, 50);

    if (sorted.length > 0) {
      await db.insert(trendingTracks).values(
        sorted.map((item, i) => {
          const name = ((item.caption as string) || "").slice(0, 100) || `Reel #${i + 1}`;
          return {
            labelId,
            platform: "reels",
            rank: i + 1,
            trackName: name,
            artistName: (item.ownerUsername as string) || "Unknown",
            plays: (item.videoViewCount as number) || 0,
            deltaRank: prevByName.has(name)
              ? prevByName.get(name)! - (i + 1)
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
