import { db } from "@/db";
import { artists, artistSocials, artistPosts, labels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runApifyActor, APIFY_ACTORS } from "./apify";
import { firecrawlScrape } from "./firecrawl";
import { generateInsights } from "./insights";

// ── Types ────────────────────────────────────────────────────────────

interface ScrapeResult {
  artistId: string;
  artistName: string;
  platforms: string[];
  errors: string[];
}

interface PostData {
  externalId: string | null;
  platform: string;
  postType: string;
  content: string | null;
  mediaUrl: string | null;
  postUrl: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  playCount: number | null;
  postedAt: Date | null;
}

// ── Upsert helper (dedup by external_id + artist_id + platform) ─────

async function upsertPost(
  artistId: string,
  labelId: string,
  post: PostData
) {
  if (post.externalId) {
    const existing = await db
      .select({ id: artistPosts.id })
      .from(artistPosts)
      .where(
        and(
          eq(artistPosts.artistId, artistId),
          eq(artistPosts.platform, post.platform),
          eq(artistPosts.externalId, post.externalId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
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

  await db.insert(artistPosts).values({
    artistId,
    labelId,
    ...post,
  });
}

async function upsertPosts(artistId: string, labelId: string, posts: PostData[]) {
  for (const post of posts) {
    try {
      await upsertPost(artistId, labelId, post);
    } catch (err) {
      console.error(`Failed to upsert post ${post.externalId}:`, err);
    }
  }
}

// ── TikTok (actor: GdWCkxBtKWOsKjdch) ──────────────────────────────

async function scrapeTikTok(artistId: string, labelId: string, handle: string) {
  const username = handle.replace(/^@/, "");
  const items = await runApifyActor(APIFY_ACTORS.tiktok, {
    profiles: [username],
    resultsType: "posts",
    resultsPerPage: 20,
    maxProfilesPerQuery: 1,
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: false,
  });

  // Extract profile data
  const profileItem = (items as Record<string, unknown>[]).find(
    (i) => i.authorMeta || i.fans !== undefined
  );
  const authorMeta = profileItem?.authorMeta as Record<string, number> | undefined;
  const followers = authorMeta?.fans || (profileItem?.fans as number) || 0;
  const hearts = authorMeta?.heart || (profileItem?.heart as number) || 0;

  // Save profile snapshot
  await db.insert(artistSocials).values({
    artistId,
    platform: "tiktok",
    followers,
    rawData: { followers, hearts, source: "apify-tiktok" },
  });

  // Extract and save posts
  const posts = (items as Record<string, unknown>[])
    .filter((i) => i.id && i.webVideoUrl)
    .map((p): PostData => ({
      externalId: String(p.id),
      platform: "tiktok",
      postType: "video",
      content: (p.text as string) || "",
      mediaUrl: ((p.covers as Record<string, string>)?.default) || (p.videoMeta as Record<string, string>)?.coverUrl || null,
      postUrl: p.webVideoUrl as string,
      likes: (p.diggCount as number) || 0,
      comments: (p.commentCount as number) || 0,
      shares: (p.shareCount as number) || 0,
      views: 0,
      playCount: (p.playCount as number) || 0,
      postedAt: (p.createTime as number) ? new Date((p.createTime as number) * 1000) : null,
    }));

  await upsertPosts(artistId, labelId, posts);
  return { postsCount: posts.length };
}

// ── Instagram (actor: shu8hvrXbJbY3Eb9W) ────────────────────────────

async function scrapeInstagram(artistId: string, labelId: string, handle: string) {
  const username = handle.replace(/^@/, "");
  const items = await runApifyActor(APIFY_ACTORS.instagram, {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "posts",
    resultsLimit: 20,
    searchType: "user",
    searchLimit: 1,
  });

  const typedItems = items as Record<string, unknown>[];

  // Extract profile
  const profileItem = typedItems.find(
    (i) => i.followersCount !== undefined && !i.shortCode
  );
  const followers = (profileItem?.followersCount as number) || 0;
  const postsCount = (profileItem?.postsCount as number) || 0;
  const avgLikes = (profileItem?.avgLikes as number) || 0;
  const engagement = followers > 0 ? (avgLikes / followers) * 100 : 0;

  await db.insert(artistSocials).values({
    artistId,
    platform: "instagram",
    followers,
    engagementRate: engagement.toFixed(2),
    lastPostAt: profileItem?.latestPostDate
      ? new Date(profileItem.latestPostDate as string)
      : null,
    rawData: { followers, postsCount, engagement, source: "apify-instagram" },
  });

  // Extract and save posts
  const postItems = typedItems.filter(
    (i) => i.shortCode || (i.url as string)?.includes("/p/") || (i.url as string)?.includes("/reel/")
  );

  const posts = postItems.map((p): PostData => ({
    externalId: (p.id as string) || (p.shortCode as string),
    platform: "instagram",
    postType: (p.type === "Video" || (p.url as string)?.includes("/reel/")) ? "reel" : "post",
    content: (p.caption as string) || (p.alt as string) || "",
    mediaUrl: (p.displayUrl as string) || (p.thumbnailUrl as string) || null,
    postUrl: (p.url as string) || `https://instagram.com/p/${p.shortCode}`,
    likes: (p.likesCount as number) || 0,
    comments: (p.commentsCount as number) || 0,
    shares: 0,
    views: (p.videoViewCount as number) || 0,
    playCount: (p.videoPlayCount as number) || 0,
    postedAt: (p.timestamp as string) ? new Date(p.timestamp as string) : null,
  }));

  await upsertPosts(artistId, labelId, posts);
  return { postsCount: posts.length };
}

// ── YouTube (actor: h7sDV53CddomktSi5) ──────────────────────────────

async function scrapeYouTube(artistId: string, labelId: string, channelUrl: string) {
  const url = channelUrl.startsWith("http")
    ? channelUrl
    : `https://www.youtube.com/channel/${channelUrl}`;

  const items = await runApifyActor(APIFY_ACTORS.youtube, {
    startUrls: [{ url }],
    maxResultsShorts: 0,
    maxResultsStreams: 0,
    maxResults: 10,
  });

  const typedItems = items as Record<string, unknown>[];

  // Extract channel data
  const channel = typedItems.find((i) => i.channelName && !i.videoUrl);
  const subscribers = (channel?.numberOfSubscribers as number) || 0;
  const totalViews = (channel?.channelTotalViews as number) || 0;

  await db.insert(artistSocials).values({
    artistId,
    platform: "youtube",
    followers: subscribers,
    rawData: { subscribers, totalViews, source: "apify-youtube" },
  });

  // Extract videos
  const videos = typedItems.filter(
    (i) => i.videoUrl || (i.url as string)?.includes("watch")
  );

  const posts = videos.map((v): PostData => ({
    externalId: (v.id as string) || (v.videoId as string),
    platform: "youtube",
    postType: "video",
    content: (v.title as string) || "",
    mediaUrl: (v.thumbnailUrl as string) || null,
    postUrl: (v.url as string) || (v.videoUrl as string),
    likes: (v.likes as number) || 0,
    comments: (v.commentsCount as number) || 0,
    shares: 0,
    views: (v.viewCount as number) || 0,
    playCount: (v.viewCount as number) || 0,
    postedAt: (v.date as string) ? new Date(v.date as string) : null,
  }));

  await upsertPosts(artistId, labelId, posts);
  return { postsCount: posts.length };
}

// ── Spotify (actor: nfp1fpt5gUlBwPcor) ──────────────────────────────

async function scrapeSpotify(artistId: string, artistName: string, spotifyId?: string | null) {
  const items = await runApifyActor(APIFY_ACTORS.spotify, {
    startUrls: spotifyId
      ? [{ url: `https://open.spotify.com/artist/${spotifyId}` }]
      : [],
    searchQueries: spotifyId ? [] : [artistName],
    maxItems: 1,
  });

  const artist = (items as Record<string, unknown>[])[0];
  if (!artist) return;

  const monthlyListeners = (artist.monthlyListeners as number) || (artist.monthly_listeners as number) || 0;
  const followers = (artist.followers as number) || 0;

  await db.insert(artistSocials).values({
    artistId,
    platform: "spotify",
    followers: monthlyListeners || followers,
    rawData: { monthlyListeners, followers, popularity: artist.popularity, source: "apify-spotify" },
  });
}

// ── Twitter/X mentions (actor: 61RPP7dywgiy0JPD0) ───────────────────

async function scrapeTwitter(artistId: string, labelId: string, artistName: string) {
  const items = await runApifyActor(APIFY_ACTORS.twitter, {
    searchTerms: [`"${artistName}"`],
    maxTweets: 20,
    filter: "Latest",
  });

  const posts = (items as Record<string, unknown>[]).map((t): PostData => ({
    externalId: (t.id as string) || (t.tweetId as string),
    platform: "twitter",
    postType: "mention",
    content: (t.text as string) || (t.fullText as string) || "",
    mediaUrl: ((t.photos as Record<string, string>[]))?.[0]?.url || null,
    postUrl: (t.url as string) || `https://twitter.com/i/web/status/${t.id}`,
    likes: (t.likeCount as number) || (t.favorites as number) || 0,
    comments: (t.replyCount as number) || 0,
    shares: (t.retweetCount as number) || 0,
    views: (t.viewCount as number) || 0,
    playCount: 0,
    postedAt: (t.createdAt as string) ? new Date(t.createdAt as string) : null,
  }));

  await upsertPosts(artistId, labelId, posts);
  return posts.length;
}

// ── Web mentions: Google Search + Firecrawl ─────────────────────────

async function scrapeWebMentions(artistId: string, labelId: string, artistName: string) {
  const searchResults = await runApifyActor(APIFY_ACTORS.googleSearch, {
    queries: `"${artistName}" música lançamento clipe`,
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    countryCode: "br",
    languageCode: "pt",
  });

  const posts: PostData[] = [];
  for (const result of (searchResults as Record<string, unknown>[]).slice(0, 5)) {
    const url = result.url as string;
    if (!url) continue;
    try {
      const content = await firecrawlScrape(url);
      posts.push({
        externalId: url,
        platform: "news",
        postType: "news",
        content: content.title + "\n\n" + content.content.slice(0, 500),
        mediaUrl: null,
        postUrl: url,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        playCount: 0,
        postedAt: content.publishedAt ? new Date(content.publishedAt) : new Date(),
      });
    } catch {
      // Skip URLs that fail
    }
  }

  await upsertPosts(artistId, labelId, posts);
  return posts.length;
}

// ── RSS: Brazilian music portals (actor: r1dh70nXpzvJRQWje) ─────────

const MUSIC_RSS_FEEDS = [
  "https://www.correio24horas.com.br/rss",
  "https://rollingstone.uol.com.br/feed/",
  "https://www.papelpop.com/feed/",
  "https://www.billboard.com.br/feed/",
  "https://vejario.abril.com.br/feed/",
];

async function scrapeRSSMentions(artistId: string, labelId: string, artistName: string) {
  const items = await runApifyActor(APIFY_ACTORS.rss, {
    urls: MUSIC_RSS_FEEDS,
    maxItems: 100,
  });

  const nameNormalized = artistName.toLowerCase();
  const matching = (items as Record<string, unknown>[]).filter((i) => {
    const text = `${i.title || ""} ${i.description || ""}`.toLowerCase();
    return text.includes(nameNormalized);
  });

  const posts = matching.map((i): PostData => ({
    externalId: (i.link as string) || (i.guid as string),
    platform: "news",
    postType: "news",
    content: (i.title as string) + "\n" + ((i.description as string) || ""),
    mediaUrl: (i.image as string) || null,
    postUrl: (i.link as string) || (i.url as string),
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    playCount: 0,
    postedAt: (i.pubDate as string) ? new Date(i.pubDate as string) : new Date(),
  }));

  await upsertPosts(artistId, labelId, posts);
  return posts.length;
}

// ── Main scrape function for a single artist ─────────────────────────

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

  const labelId = artist.labelId;
  if (!labelId) {
    result.errors.push("Artist has no labelId");
    return result;
  }

  // Run all platform scrapes in parallel
  const tasks: Promise<void>[] = [];

  if (artist.tiktokHandle) {
    tasks.push(
      scrapeTikTok(artistId, labelId, artist.tiktokHandle)
        .then(() => { result.platforms.push("tiktok"); })
        .catch((err) => { result.errors.push(`TikTok: ${(err as Error).message}`); })
    );
  }

  if (artist.instagramHandle) {
    tasks.push(
      scrapeInstagram(artistId, labelId, artist.instagramHandle)
        .then(() => { result.platforms.push("instagram"); })
        .catch((err) => { result.errors.push(`Instagram: ${(err as Error).message}`); })
    );
  }

  if (artist.youtubeChannel) {
    tasks.push(
      scrapeYouTube(artistId, labelId, artist.youtubeChannel)
        .then(() => { result.platforms.push("youtube"); })
        .catch((err) => { result.errors.push(`YouTube: ${(err as Error).message}`); })
    );
  }

  // Spotify — use spotifyId or name
  tasks.push(
    scrapeSpotify(artistId, artist.name, artist.spotifyId)
      .then(() => { result.platforms.push("spotify"); })
      .catch((err) => { result.errors.push(`Spotify: ${(err as Error).message}`); })
  );

  // Mentions always run
  tasks.push(
    scrapeTwitter(artistId, labelId, artist.name)
      .then(() => { result.platforms.push("twitter"); })
      .catch((err) => { result.errors.push(`Twitter: ${(err as Error).message}`); })
  );

  tasks.push(
    scrapeWebMentions(artistId, labelId, artist.name)
      .then(() => { result.platforms.push("web"); })
      .catch((err) => { result.errors.push(`Web mentions: ${(err as Error).message}`); })
  );

  tasks.push(
    scrapeRSSMentions(artistId, labelId, artist.name)
      .then(() => { result.platforms.push("rss"); })
      .catch((err) => { result.errors.push(`RSS: ${(err as Error).message}`); })
  );

  // Wait for all — failures don't break others
  await Promise.allSettled(tasks);

  // Generate insights after all scraping
  try {
    await generateInsights({ artistId, labelId });
  } catch (err) {
    result.errors.push(`Insights: ${(err as Error).message}`);
  }

  console.log(
    `Scrape complete for ${artist.name}: ${result.platforms.join(", ")} | errors: ${result.errors.length}`
  );

  return result;
}

// ── Scrape all artists in a label ────────────────────────────────────

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

  // Update scraping status on label
  try {
    await db
      .update(labels)
      .set({
        lastScrapingAt: new Date(),
        lastScrapingStatus:
          erros.length === 0
            ? "success"
            : erros.length < allArtists.length
            ? "partial"
            : "failed",
        scrapingErrorLog: erros.length > 0 ? JSON.stringify(erros.slice(0, 20)) : null,
      })
      .where(eq(labels.id, labelId));
  } catch (err) {
    console.error("Failed to update scraping status:", err);
  }

  return {
    artistas_processados: allArtists.length,
    resultados,
    erros,
  };
}
