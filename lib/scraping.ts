import { db } from "@/db";
import { artists, artistSocials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runApifyActor, getApifyDataset } from "./apify";
import { getSpotifyArtist } from "./spotify";
import { getYouTubeChannel } from "./youtube";

interface ScrapeResult {
  artistId: string;
  artistName: string;
  platforms: string[];
  errors: string[];
}

async function waitForRun(runId: string): Promise<string> {
  const token = process.env.APIFY_API_KEY;
  // Poll until finished (max 2 min)
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

async function scrapeInstagram(artistId: string, handle: string): Promise<void> {
  const username = handle.replace(/^@/, "");
  const run = await runApifyActor({
    actorId: "apify/instagram-profile-scraper",
    input: { usernames: [username] },
  });

  const datasetId = await waitForRun(run.data.id);
  const items = await getApifyDataset(datasetId);

  if (items.length > 0) {
    const profile = items[0];
    const followers = profile.followersCount || profile.edge_followed_by?.count || 0;
    const posts = profile.postsCount || profile.edge_owner_to_timeline_media?.count || 0;
    const avgLikes = profile.avgLikes || 0;
    const engagement = followers > 0 ? ((avgLikes / followers) * 100) : 0;

    await db.insert(artistSocials).values({
      artistId,
      platform: "instagram",
      followers,
      engagementRate: engagement.toFixed(2),
      lastPostAt: profile.latestPostDate ? new Date(profile.latestPostDate) : null,
      rawData: profile,
    });
  }
}

async function scrapeTikTok(artistId: string, handle: string): Promise<void> {
  const username = handle.replace(/^@/, "");
  const run = await runApifyActor({
    actorId: "clockworks/tiktok-profile-scraper",
    input: { profiles: [username], resultsType: "profiles" },
  });

  const datasetId = await waitForRun(run.data.id);
  const items = await getApifyDataset(datasetId);

  if (items.length > 0) {
    const profile = items[0];
    const followers = profile.fans || profile.followerCount || 0;
    const likes = profile.heart || profile.heartCount || 0;

    await db.insert(artistSocials).values({
      artistId,
      platform: "tiktok",
      followers,
      engagementRate: null,
      rawData: { ...profile, totalLikes: likes },
    });
  }
}

async function scrapeSpotify(artistId: string, spotifyArtistId: string): Promise<void> {
  const data = await getSpotifyArtist(spotifyArtistId);

  await db.insert(artistSocials).values({
    artistId,
    platform: "spotify",
    followers: data.followers,
    engagementRate: null,
    rawData: data,
  });
}

async function scrapeYouTube(artistId: string, channelId: string): Promise<void> {
  const data = await getYouTubeChannel(channelId);

  await db.insert(artistSocials).values({
    artistId,
    platform: "youtube",
    followers: data.subscriberCount,
    engagementRate: null,
    rawData: data,
  });
}

export async function scrapeArtist(artistId: string): Promise<ScrapeResult> {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  if (!artist) {
    return { artistId, artistName: "Unknown", platforms: [], errors: ["Artist not found"] };
  }

  const result: ScrapeResult = {
    artistId,
    artistName: artist.name,
    platforms: [],
    errors: [],
  };

  // Instagram
  if (artist.instagramHandle) {
    try {
      await scrapeInstagram(artistId, artist.instagramHandle);
      result.platforms.push("instagram");
    } catch (err) {
      result.errors.push(`Instagram: ${(err as Error).message}`);
    }
  }

  // TikTok
  if (artist.tiktokHandle) {
    try {
      await scrapeTikTok(artistId, artist.tiktokHandle);
      result.platforms.push("tiktok");
    } catch (err) {
      result.errors.push(`TikTok: ${(err as Error).message}`);
    }
  }

  // Spotify
  if (artist.spotifyId) {
    try {
      await scrapeSpotify(artistId, artist.spotifyId);
      result.platforms.push("spotify");
    } catch (err) {
      result.errors.push(`Spotify: ${(err as Error).message}`);
    }
  }

  // YouTube
  if (artist.youtubeChannel) {
    try {
      await scrapeYouTube(artistId, artist.youtubeChannel);
      result.platforms.push("youtube");
    } catch (err) {
      result.errors.push(`YouTube: ${(err as Error).message}`);
    }
  }

  return result;
}

export async function scrapeAllArtists(labelId: string): Promise<{
  artistas_processados: number;
  resultados: ScrapeResult[];
  erros: string[];
}> {
  const allArtists = await db
    .select()
    .from(artists)
    .where(eq(artists.labelId, labelId));

  const resultados: ScrapeResult[] = [];
  const erros: string[] = [];

  for (const artist of allArtists) {
    try {
      const result = await scrapeArtist(artist.id);
      resultados.push(result);
      erros.push(...result.errors);
    } catch (err) {
      erros.push(`${artist.name}: ${(err as Error).message}`);
    }
  }

  return {
    artistas_processados: allArtists.length,
    resultados,
    erros,
  };
}
