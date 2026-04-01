import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/insights";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artistId, labelId } = body;

    if (!artistId || !labelId) {
      return NextResponse.json(
        { error: "artistId and labelId required" },
        { status: 400 }
      );
    }

    const count = await generateInsights({ artistId, labelId });

    return NextResponse.json({ generated: count || 0 });
  } catch (err) {
    console.error("POST /api/insights/generate error:", err);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
