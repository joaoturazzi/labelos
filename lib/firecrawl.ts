export async function firecrawlScrape(
  url: string
): Promise<{ title: string; content: string; publishedAt?: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY not set");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl error: ${res.status}`);
  }

  const data = await res.json();
  return {
    title: data.data?.metadata?.title || data.metadata?.title || "",
    content: data.data?.markdown || data.markdown || "",
    publishedAt: data.data?.metadata?.publishedTime || data.metadata?.publishedTime,
  };
}
