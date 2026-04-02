import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConfigs, labels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

async function getLabelId(): Promise<string | null> {
  const { orgId, userId } = await auth();
  const ownerId = orgId || userId;
  if (!ownerId) return null;

  const [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, ownerId))
    .limit(1);

  return label?.id ?? null;
}

// GET — fetch AI config for current label
export async function GET() {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json(
        { error: "Label não encontrada" },
        { status: 404 }
      );
    }

    const [config] = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.labelId, labelId))
      .limit(1);

    return NextResponse.json(config || null);
  } catch (err) {
    console.error("GET /api/ai/config error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar configuração" },
      { status: 500 }
    );
  }
}

// POST — upsert AI config for current label
export async function POST(req: NextRequest) {
  try {
    const labelId = await getLabelId();
    if (!labelId) {
      return NextResponse.json(
        { error: "Label não encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { criteria, model, promptTemplate } = body;

    if (!criteria) {
      return NextResponse.json(
        { error: "Critérios são obrigatórios" },
        { status: 400 }
      );
    }

    // Check if config already exists
    const [existing] = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.labelId, labelId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(aiConfigs)
        .set({
          criteria,
          model: model || "google/gemini-flash-1.5",
          promptTemplate: promptTemplate || null,
          updatedAt: new Date(),
        })
        .where(eq(aiConfigs.labelId, labelId))
        .returning();
    } else {
      [result] = await db
        .insert(aiConfigs)
        .values({
          labelId,
          criteria,
          model: model || "google/gemini-flash-1.5",
          promptTemplate: promptTemplate || null,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/ai/config error:", err);
    return NextResponse.json(
      { error: "Erro ao salvar configuração" },
      { status: 500 }
    );
  }
}
