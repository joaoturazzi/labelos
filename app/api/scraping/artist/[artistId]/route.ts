import { NextRequest, NextResponse } from "next/server";
import { scrapeArtist } from "@/lib/scraping";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
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
