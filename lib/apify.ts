const APIFY_BASE_URL = "https://api.apify.com/v2";

// ── Actor IDs (stable, prefer over slugs) ────────────────────────────
export const APIFY_ACTORS = {
  tiktok: "GdWCkxBtKWOsKjdch",
  instagram: "shu8hvrXbJbY3Eb9W",
  instagramComments: "nFJndFXA5zjCTuudP",
  twitter: "61RPP7dywgiy0JPD0",
  youtube: "h7sDV53CddomktSi5",
  spotify: "nfp1fpt5gUlBwPcor",
  googleSearch: "nFJndFXA5zjCTuudP",
  sentiment: "ycQuEFDDZmgX7BAsL",
  influencer: "SbK00X0JYCPblD2wp",
  rss: "r1dh70nXpzvJRQWje",
} as const;

// ── Centralized actor runner with polling ────────────────────────────

export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 120_000
): Promise<unknown[]> {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error("APIFY_API_KEY not set");

  // 1. Start the run
  const runRes = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    throw new Error(`Apify start error: ${runRes.status} ${await runRes.text()}`);
  }

  const { data: run } = await runRes.json();
  const runId: string = run.id;
  let status: string = run.status;
  let datasetId: string = run.defaultDatasetId;
  const deadline = Date.now() + timeoutMs;

  // 2. Poll until SUCCEEDED or FAILED
  while (
    status !== "SUCCEEDED" &&
    status !== "FAILED" &&
    status !== "ABORTED" &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );
    if (!statusRes.ok) continue;
    const { data: runData } = await statusRes.json();
    status = runData.status;
    datasetId = runData.defaultDatasetId;
  }

  if (status !== "SUCCEEDED") {
    console.error(`Apify run ${runId} ended with status: ${status}`);
    return [];
  }

  // 3. Fetch dataset items
  const dataRes = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&format=json`
  );

  if (!dataRes.ok) {
    throw new Error(`Apify dataset error: ${dataRes.status}`);
  }

  const items = await dataRes.json();
  return Array.isArray(items) ? items : [];
}
