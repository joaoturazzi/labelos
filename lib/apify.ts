const APIFY_BASE_URL = "https://api.apify.com/v2";

interface ApifyRunInput {
  actorId: string;
  input: Record<string, unknown>;
}

export async function runApifyActor({ actorId, input }: ApifyRunInput) {
  const res = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${process.env.APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    throw new Error(`Apify error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function getApifyDataset(datasetId: string) {
  const res = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${process.env.APIFY_API_KEY}`
  );

  if (!res.ok) {
    throw new Error(`Apify dataset error: ${res.status}`);
  }

  return res.json();
}
