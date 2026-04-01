export async function getYouTubeChannel(channelId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API key not configured");
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
  );

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) {
    throw new Error(`YouTube channel not found: ${channelId}`);
  }

  const stats = item.statistics;
  return {
    subscriberCount: parseInt(stats.subscriberCount || "0", 10),
    viewCount: parseInt(stats.viewCount || "0", 10),
    videoCount: parseInt(stats.videoCount || "0", 10),
  };
}
