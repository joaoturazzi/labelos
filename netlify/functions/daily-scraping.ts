// Netlify Scheduled Function
// Schedule: "0 9 * * *" (6h BRT = 9h UTC)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: any, context: any) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labelos.netlify.app";
  const secret = process.env.NETLIFY_FUNCTION_SECRET;

  console.log("Daily scraping cron started");

  try {
    // Trigger scraping
    const scrapingRes = await fetch(`${appUrl}/api/scraping/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
      },
    });
    console.log("Scraping trigger:", scrapingRes.status);

    // Trigger trending update
    const trendingRes = await fetch(`${appUrl}/api/trending/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
      },
    });
    console.log("Trending trigger:", trendingRes.status);

    // Trigger insights generation
    const insightsRes = await fetch(`${appUrl}/api/insights/generate-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
      },
    });
    console.log("Insights trigger:", insightsRes.status);

    // Trigger radar scan (artist growth monitoring)
    const radarRes = await fetch(`${appUrl}/api/radar/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret } : {}),
      },
    });
    console.log("Radar trigger:", radarRes.status);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cron executed",
        scraping: scrapingRes.status,
        trending: trendingRes.status,
        insights: insightsRes.status,
        radar: radarRes.status,
      }),
    };
  } catch (err) {
    console.error("Cron error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (err as Error).message }),
    };
  }
};
