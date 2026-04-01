import { db } from "@/db";
import { artists, artistPosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runApifyActor, getApifyDataset } from "./apify";

async function waitForRun(runId: string): Promise<string> {
  const token = process.env.APIFY_API_KEY;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (data.data?.status === "SUCCEEDED") return data.data.defaultDatasetId;
    if (data.data?.status === "FAILED" || data.data?.status === "ABORTED") {
      throw new Error(`Apify run ${data.data.status}`);
    }
  }
  throw new Error("Apify run timeout");
}

async function upsertPost(post: {
  artistId: string;
  labelId: string;
  platform: string;
  postType: string;
  externalId: string | null;
  content: string | null;
  mediaUrl: string | null;
  postUrl: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  playCount: number | null;
  postedAt: Date | null;
}) {
  // Dedup by external_id + artist_id + platform
  if (post.externalId) {
    const existing = await db
      .select({ id: artistPosts.id })
      .from(artistPosts)
      .where(
        and(
          eq(artistPosts.artistId, post.artistId),
          eq(artistPosts.platform, post.platform),
          eq(artistPosts.externalId, post.externalId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update metrics
      await db
        .update(artistPosts)
        .set({
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          views: post.views,
          playCount: post.playCount,
          collectedAt: new Date(),
        })
        .where(eq(artistPosts.id, existing[0].id));
      return;
    }
  }

  await db.insert(artistPosts).values(post);
}

export async function scrapeInstagramPosts(
  artistId: string,
  labelId: string,
  handle: string
): Promise<number> {
  const username = handle.replace(/^@/, "");
  const run = await runApifyActor({
    actorId: "apify/instagram-scraper",
    input: { usernames: [username], resultsType: "posts", resultsLimit: 12 },
  });

  const datasetId = await waitForRun(run.data.id);
  const items = await getApifyDataset(datasetId);
  let count = 0;

  for (const item of items) {
    await upsertPost({
      artistId,
      labelId,
      platform: "instagram",
      postType: item.type === "Video" ? "reel" : "post",
      externalId: item.id || item.shortCode || null,
      content: item.caption || null,
      mediaUrl: item.displayUrl || item.thumbnailUrl || null,
      postUrl: item.url || (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : null),
      likes: item.likesCount || 0,
      comments: item.commentsCount || 0,
      shares: null,
      views: item.videoViewCount || null,
      playCount: item.videoPlayCount || null,
      postedAt: item.timestamp ? new Date(item.timestamp) : null,
    });
    count++;
  }

  return count;
}

export async function scrapeTikTokPosts(
  artistId: string,
  labelId: string,
  handle: string
): Promise<number> {
  const username = handle.replace(/^@/, "");
  const run = await runApifyActor({
    actorId: "clockworks/tiktok-scraper",
    input: { profiles: [username], resultsType: "posts", maxProfilesPerQuery: 1 },
  });

  const datasetId = await waitForRun(run.data.id);
  const items = await getApifyDataset(datasetId);
  let count = 0;

  for (const item of items) {
    await upsertPost({
      artistId,
      labelId,
      platform: "tiktok",
      postType: "video",
      externalId: item.id || null,
      content: item.text || item.desc || null,
      mediaUrl: item.covers?.default || item.cover || null,
      postUrl: item.webVideoUrl || null,
      likes: item.diggCount || item.stats?.diggCount || 0,
      comments: item.commentCount || item.stats?.commentCount || 0,
      shares: item.shareCount || item.stats?.shareCount || 0,
      views: null,
      playCount: item.playCount || item.stats?.playCount || 0,
      postedAt: item.createTime ? new Date(item.createTime * 1000) : null,
    });
    count++;
  }

  return count;
}

export async function scrapeYouTubePosts(
  artistId: string,
  labelId: string,
  channelId: string
): Promise<number> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return 0;

  // Search for latest videos
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&part=snippet&order=date&maxResults=10&type=video&key=${apiKey}`
  );
  if (!searchRes.ok) return 0;
  const searchData = await searchRes.json();
  const videoItems = searchData.items || [];
  if (videoItems.length === 0) return 0;

  // Get stats for all videos
  const videoIds = videoItems.map((v: Record<string, unknown>) => (v.id as Record<string, string>)?.videoId).filter(Boolean);
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(",")}&part=statistics&key=${apiKey}`
  );
  const statsData = statsRes.ok ? await statsRes.json() : { items: [] };
  const statsMap = new Map<string, Record<string, string>>();
  for (const item of statsData.items || []) {
    statsMap.set(item.id, item.statistics);
  }

  let count = 0;
  for (const item of videoItems) {
    const videoId = (item.id as Record<string, string>)?.videoId;
    if (!videoId) continue;
    const stats = statsMap.get(videoId) || {};
    const snippet = item.snippet as Record<string, unknown>;

    await upsertPost({
      artistId,
      labelId,
      platform: "youtube",
      postType: "video",
      externalId: videoId,
      content: (snippet.title as string) || null,
      mediaUrl: ((snippet.thumbnails as Record<string, Record<string, string>>)?.medium?.url) || null,
      postUrl: `https://youtube.com/watch?v=${videoId}`,
      likes: parseInt(stats.likeCount || "0", 10),
      comments: parseInt(stats.commentCount || "0", 10),
      shares: null,
      views: parseInt(stats.viewCount || "0", 10),
      playCount: null,
      postedAt: snippet.publishedAt ? new Date(snippet.publishedAt as string) : null,
    });
    count++;
  }

  return count;
}

export async function scrapeNewsMentions(
  artistId: string,
  labelId: string,
  artistName: string
): Promise<number> {
  try {
    const run = await runApifyActor({
      actorId: "apify/google-search-scraper",
      input: {
        queries: `"${artistName}" música OR lançamento OR clipe`,
        maxPagesPerQuery: 1,
        resultsPerPage: 5,
      },
    });

    const datasetId = await waitForRun(run.data.id);
    const items = await getApifyDataset(datasetId);
    let count = 0;

    for (const item of items) {
      if (!item.title || !item.url) continue;
      await upsertPost({
        artistId,
        labelId,
        platform: "news",
        postType: "news",
        externalId: item.url,
        content: item.title + (item.description ? ` — ${item.description}` : ""),
        mediaUrl: null,
        postUrl: item.url,
        likes: null,
        comments: null,
        shares: null,
        views: null,
        playCount: null,
        postedAt: item.date ? new Date(item.date) : null,
      });
      count++;
    }

    return count;
  } catch (err) {
    console.error("News scraping failed:", err);
    return 0;
  }
}

export async function scrapeAllPosts(artistId: string, labelId: string) {
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  if (!artist) return { posts: 0, errors: [] as string[] };

  let totalPosts = 0;
  const errors: string[] = [];

  if (artist.instagramHandle) {
    try {
      totalPosts += await scrapeInstagramPosts(artistId, labelId, artist.instagramHandle);
    } catch (err) {
      errors.push(`Instagram posts: ${(err as Error).message}`);
    }
  }

  if (artist.tiktokHandle) {
    try {
      totalPosts += await scrapeTikTokPosts(artistId, labelId, artist.tiktokHandle);
    } catch (err) {
      errors.push(`TikTok posts: ${(err as Error).message}`);
    }
  }

  if (artist.youtubeChannel) {
    try {
      totalPosts += await scrapeYouTubePosts(artistId, labelId, artist.youtubeChannel);
    } catch (err) {
      errors.push(`YouTube posts: ${(err as Error).message}`);
    }
  }

  // News mentions
  try {
    totalPosts += await scrapeNewsMentions(artistId, labelId, artist.name);
  } catch (err) {
    errors.push(`News: ${(err as Error).message}`);
  }

  return { posts: totalPosts, errors };
}
