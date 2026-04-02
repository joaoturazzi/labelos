import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { scrapeArtist } from "@/lib/scraping";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  const { orgId, userId } = await auth();
  const ownerId = orgId || userId;
  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { artistId } = await params;

  // Fire-and-forget
  scrapeArtist(artistId).catch((err) =>
    console.error(`Scraping artist ${artistId} failed:`, err)
  );

  return NextResponse.json(
    { message: "Coleta iniciada", artistId },
    { status: 202 }
  );
}
