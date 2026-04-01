import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { labels, submissions, artists, aiConfigs } from "./schema";
import "dotenv/config";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // 1. Insert demo label
  const [label] = await db
    .insert(labels)
    .values({
      name: "Gravadora Demo",
      slug: "demo",
      clerkOrgId: "org_local_test",
      plan: "free",
    })
    .returning();

  console.log("Label created:", label.name);

  // 2. Insert artists
  const [artist1] = await db
    .insert(artists)
    .values({
      labelId: label.id,
      name: "MC Trovão",
      email: "trovao@email.com",
      instagramHandle: "@mctrovao",
      tiktokHandle: "@mctrovao",
    })
    .returning();

  const [artist2] = await db
    .insert(artists)
    .values({
      labelId: label.id,
      name: "DJ Aurora",
      email: "aurora@email.com",
      instagramHandle: "@djaurora",
      spotifyId: "spotify:artist:fake123",
    })
    .returning();

  console.log("Artists created:", artist1.name, artist2.name);

  // 3. Insert submissions
  await db.insert(submissions).values([
    {
      labelId: label.id,
      artistName: "MC Trovão",
      artistEmail: "trovao@email.com",
      trackTitle: "Tempestade no Beat",
      genre: "Funk",
      bpm: 130,
      audioFileUrl: "https://example.com/audio/tempestade.mp3",
      audioFileKey: "demo_key_1",
      status: "pending",
      aiScore: null,
    },
    {
      labelId: label.id,
      artistName: "DJ Aurora",
      artistEmail: "aurora@email.com",
      trackTitle: "Nascer do Sol",
      genre: "House",
      bpm: 124,
      audioFileUrl: "https://example.com/audio/nascer.mp3",
      audioFileKey: "demo_key_2",
      status: "reviewing",
      aiScore: 72,
      aiSummary:
        "Produção sólida com bom arranjo. Vocais precisam de mix mais limpo.",
    },
    {
      labelId: label.id,
      artistName: "Bia Santos",
      artistEmail: "bia@email.com",
      trackTitle: "Frequência Alta",
      genre: "Pop",
      bpm: 110,
      mixador: "Studio X",
      distributor: "DistroKid",
      instagramUrl: "https://instagram.com/biasantos",
      audioFileUrl: "https://example.com/audio/frequencia.mp3",
      audioFileKey: "demo_key_3",
      status: "approved",
      aiScore: 88,
      aiSummary:
        "Excelente composição, mix profissional, potencial comercial alto.",
      aiCriteriaUsed: {
        originalidade: 9,
        qualidadeMix: 8,
        potencialComercial: 9,
        letraRelevancia: 8,
      },
    },
  ]);

  console.log("Submissions created: 3");

  // 4. Insert AI config
  await db.insert(aiConfigs).values({
    labelId: label.id,
    criteria: {
      criterios: [
        {
          nome: "Originalidade",
          peso: 25,
          descricao: "Quão original e inovadora é a faixa",
        },
        {
          nome: "Qualidade de mix",
          peso: 25,
          descricao: "Qualidade técnica da mixagem e masterização",
        },
        {
          nome: "Potencial comercial",
          peso: 30,
          descricao: "Potencial de viralização e sucesso comercial",
        },
        {
          nome: "Relevância da letra",
          peso: 20,
          descricao: "Qualidade e relevância do conteúdo lírico",
        },
      ],
      scoreMinimo: 70,
    },
    model: "google/gemini-flash-1.5",
    promptTemplate:
      "Analise a seguinte demo musical e avalie nos critérios fornecidos. Retorne um score de 0 a 100 e um resumo em português.",
  });

  console.log("AI config created");
  console.log("Seed completed!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
