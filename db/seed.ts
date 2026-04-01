import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  labels,
  submissions,
  artists,
  aiConfigs,
  artistSocials,
  trendingTracks,
  artistPosts,
  artistInsights,
} from "./schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // 1. Upsert demo label
  const existing = await db
    .select()
    .from(labels)
    .where(eq(labels.clerkOrgId, "org_local_test"))
    .limit(1);

  let label;
  if (existing.length > 0) {
    label = existing[0];
    console.log("Label already exists:", label.name);
  } else {
    [label] = await db
      .insert(labels)
      .values({
        name: "Gravadora Demo",
        slug: "demo",
        clerkOrgId: "org_local_test",
        plan: "free",
      })
      .returning();
    console.log("Label created:", label.name);
  }

  // 2. Upsert artists
  const existingArtists = await db
    .select()
    .from(artists)
    .where(eq(artists.labelId, label.id));

  let artist1, artist2;
  if (existingArtists.length >= 2) {
    artist1 = existingArtists[0];
    artist2 = existingArtists[1];
    console.log("Artists already exist");
  } else {
    [artist1] = await db
      .insert(artists)
      .values({
        labelId: label.id,
        name: "MC Trovão",
        email: "trovao@email.com",
        instagramHandle: "@mctrovao",
        tiktokHandle: "@mctrovao",
        spotifyId: null,
      })
      .returning();

    [artist2] = await db
      .insert(artists)
      .values({
        labelId: label.id,
        name: "DJ Aurora",
        email: "aurora@email.com",
        instagramHandle: "@djaurora",
        tiktokHandle: null,
        spotifyId: "4Z8W4fKeB5YxbusRsdQVPb",
      })
      .returning();
    console.log("Artists created:", artist1.name, artist2.name);
  }

  // 3. Upsert submissions (check by track title)
  const existingSubs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.labelId, label.id));

  if (existingSubs.length === 0) {
    await db.insert(submissions).values([
      {
        labelId: label.id,
        artistName: "MC Trovão",
        artistEmail: "trovao@email.com",
        trackTitle: "Tempestade no Beat",
        genre: "Funk",
        bpm: 130,
        audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        audioFileKey: "demo_key_1",
        status: "pending",
      },
      {
        labelId: label.id,
        artistName: "DJ Aurora",
        artistEmail: "aurora@email.com",
        trackTitle: "Nascer do Sol",
        genre: "House",
        bpm: 124,
        audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        audioFileKey: "demo_key_2",
        status: "reviewing",
        aiScore: 72,
        aiSummary: "Produção sólida com bom arranjo. Vocais precisam de mix mais limpo.",
        aiCriteriaUsed: {
          recomendacao: "talvez",
          pontos_fortes: ["Arranjo criativo", "Bom groove"],
          pontos_fracos: ["Mix precisa de limpeza", "Vocal baixo"],
          fit_criterios: "Encaixa parcialmente nos critérios de qualidade",
          score: 72,
        },
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
        audioFileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        audioFileKey: "demo_key_3",
        status: "approved",
        aiScore: 88,
        aiSummary: "Excelente composição, mix profissional, potencial comercial alto.",
        aiCriteriaUsed: {
          recomendacao: "sim",
          pontos_fortes: ["Composição forte", "Mix profissional", "Potencial viral"],
          pontos_fracos: ["Intro longa demais"],
          fit_criterios: "Encaixa perfeitamente nos critérios da gravadora",
          score: 88,
        },
      },
    ]);
    console.log("Submissions created: 3");
  } else {
    console.log("Submissions already exist:", existingSubs.length);
  }

  // 4. Upsert AI config
  const existingConfig = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.labelId, label.id));

  if (existingConfig.length === 0) {
    await db.insert(aiConfigs).values({
      labelId: label.id,
      criteria: {
        generos_preferidos: ["Funk", "Trap", "Pop"],
        bpm_ideal: "80-140",
        foco: "Potencial comercial e fit com TikTok/Reels",
        qualidade_minima: "Produção limpa, mix equilibrado",
      },
      model: "google/gemini-flash-1.5",
      promptTemplate:
        "Analise a seguinte demo musical e avalie nos critérios fornecidos. Retorne um score de 0 a 100 e um resumo em português.",
    });
    console.log("AI config created");
  } else {
    console.log("AI config already exists");
  }

  // 5. Mock social snapshots (for growth chart and alerts)
  const existingSocials = await db
    .select()
    .from(artistSocials)
    .where(eq(artistSocials.artistId, artist1.id));

  if (existingSocials.length === 0) {
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // MC Trovão — Instagram growing
    await db.insert(artistSocials).values([
      {
        artistId: artist1.id,
        platform: "instagram",
        followers: 12000,
        engagementRate: "3.20",
        collectedAt: daysAgo(14),
        rawData: { followersCount: 12000, postsCount: 45 },
      },
      {
        artistId: artist1.id,
        platform: "instagram",
        followers: 14500,
        engagementRate: "3.80",
        collectedAt: daysAgo(7),
        rawData: { followersCount: 14500, postsCount: 48 },
      },
      {
        artistId: artist1.id,
        platform: "instagram",
        followers: 18200,
        engagementRate: "4.10",
        collectedAt: daysAgo(0),
        rawData: { followersCount: 18200, postsCount: 52 },
      },
      {
        artistId: artist1.id,
        platform: "tiktok",
        followers: 45000,
        collectedAt: daysAgo(7),
        rawData: { fans: 45000, heart: 320000 },
      },
      {
        artistId: artist1.id,
        platform: "tiktok",
        followers: 52000,
        collectedAt: daysAgo(0),
        rawData: { fans: 52000, heart: 410000 },
      },
    ]);

    // DJ Aurora — Spotify + Instagram
    await db.insert(artistSocials).values([
      {
        artistId: artist2.id,
        platform: "instagram",
        followers: 8500,
        engagementRate: "2.50",
        collectedAt: daysAgo(7),
        rawData: { followersCount: 8500, postsCount: 120 },
      },
      {
        artistId: artist2.id,
        platform: "instagram",
        followers: 8200,
        engagementRate: "2.10",
        collectedAt: daysAgo(0),
        rawData: { followersCount: 8200, postsCount: 122 },
      },
      {
        artistId: artist2.id,
        platform: "spotify",
        followers: 3200,
        collectedAt: daysAgo(7),
        rawData: { followers: 3200, popularity: 42 },
      },
      {
        artistId: artist2.id,
        platform: "spotify",
        followers: 3400,
        collectedAt: daysAgo(0),
        rawData: { followers: 3400, popularity: 44 },
      },
    ]);

    console.log("Social snapshots created");
  } else {
    console.log("Social snapshots already exist");
  }

  // 6. Mock trending tracks
  const existingTrending = await db
    .select()
    .from(trendingTracks)
    .where(eq(trendingTracks.labelId, label.id));

  if (existingTrending.length === 0) {
    const tiktokTracks = [
      { rank: 1, trackName: "Beat Envolvente", artistName: "MC Zin", plays: 45000000 },
      { rank: 2, trackName: "Automotivo Celestial", artistName: "DJ Biel", plays: 38000000 },
      { rank: 3, trackName: "Mega Funk 2024", artistName: "MC Trovão", plays: 22000000 },
      { rank: 4, trackName: "Montagem Lunar", artistName: "DJ Kaio", plays: 18000000 },
      { rank: 5, trackName: "Funk do TikTok", artistName: "MC Lari", plays: 15000000 },
    ];

    const spotifyTracks = [
      { rank: 1, trackName: "Coração Partido", artistName: "Ana Vitória", plays: 92 },
      { rank: 2, trackName: "Saudade Infinita", artistName: "Projota", plays: 88 },
      { rank: 3, trackName: "Pé de Moleque", artistName: "Seu Jorge", plays: 85 },
      { rank: 4, trackName: "Noite Estrelada", artistName: "DJ Aurora", plays: 81 },
      { rank: 5, trackName: "Fim de Semana", artistName: "Natiruts", plays: 78 },
    ];

    const reelsTracks = [
      { rank: 1, trackName: "Trend do momento #viral", artistName: "creator_br", plays: 8500000 },
      { rank: 2, trackName: "Challenge dance #tendencia", artistName: "danca_viral", plays: 6200000 },
      { rank: 3, trackName: "Som que ta bombando #reels", artistName: "music_br", plays: 4100000 },
    ];

    await db.insert(trendingTracks).values([
      ...tiktokTracks.map((t) => ({
        labelId: label.id,
        platform: "tiktok" as const,
        ...t,
        deltaRank: Math.floor(Math.random() * 5) - 2,
      })),
      ...spotifyTracks.map((t) => ({
        labelId: label.id,
        platform: "spotify" as const,
        ...t,
        deltaRank: Math.floor(Math.random() * 3) - 1,
      })),
      ...reelsTracks.map((t) => ({
        labelId: label.id,
        platform: "reels" as const,
        ...t,
        deltaRank: null,
      })),
    ]);
    console.log("Trending tracks created");
  } else {
    console.log("Trending tracks already exist");
  }

  // 7. Mock artist posts (for feed)
  const existingPosts = await db
    .select()
    .from(artistPosts)
    .where(eq(artistPosts.labelId, label.id));

  if (existingPosts.length === 0) {
    const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

    await db.insert(artistPosts).values([
      {
        artistId: artist1.id,
        labelId: label.id,
        platform: "instagram",
        postType: "reel",
        externalId: "ig_001",
        content: "Novo clipe saindo em breve! Preparados? 🔥 #funk #novidade #lançamento",
        mediaUrl: "https://picsum.photos/seed/post1/640/360",
        postUrl: "https://instagram.com/p/fake1",
        likes: 4520,
        comments: 312,
        views: 89000,
        playCount: 89000,
        postedAt: hoursAgo(2),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        platform: "tiktok",
        postType: "video",
        externalId: "tt_001",
        content: "Beat novo no studio 🎵 quem quer ouvir primeiro?",
        mediaUrl: "https://picsum.photos/seed/post2/640/360",
        postUrl: "https://tiktok.com/@mctrovao/video/fake1",
        likes: 12800,
        comments: 890,
        shares: 2100,
        playCount: 450000,
        postedAt: hoursAgo(5),
      },
      {
        artistId: artist2.id,
        labelId: label.id,
        platform: "instagram",
        postType: "post",
        externalId: "ig_002",
        content: "Set completo do festival disponivel no canal! Link na bio 🎧",
        mediaUrl: "https://picsum.photos/seed/post3/640/360",
        postUrl: "https://instagram.com/p/fake2",
        likes: 2100,
        comments: 145,
        views: null,
        postedAt: hoursAgo(8),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        platform: "youtube",
        postType: "video",
        externalId: "yt_001",
        content: "MC Trovão - Tempestade no Beat (Clipe Oficial)",
        mediaUrl: "https://picsum.photos/seed/post4/640/360",
        postUrl: "https://youtube.com/watch?v=fake1",
        likes: 8900,
        comments: 567,
        views: 1200000,
        postedAt: hoursAgo(24),
      },
      {
        artistId: artist2.id,
        labelId: label.id,
        platform: "youtube",
        postType: "video",
        externalId: "yt_002",
        content: "DJ Aurora Live Set - Festival de Verão 2025",
        mediaUrl: "https://picsum.photos/seed/post5/640/360",
        postUrl: "https://youtube.com/watch?v=fake2",
        likes: 3400,
        comments: 210,
        views: 87000,
        postedAt: hoursAgo(48),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        platform: "news",
        postType: "news",
        externalId: "https://g1.globo.com/fake-mc-trovao",
        content: "MC Trovão é destaque na nova geração do funk brasileiro — G1",
        postUrl: "https://g1.globo.com/fake-mc-trovao",
        likes: null,
        comments: null,
        postedAt: hoursAgo(72),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        platform: "tiktok",
        postType: "video",
        externalId: "tt_002",
        content: "Esse beat vai dominar o verão ☀️ marca alguem",
        mediaUrl: "https://picsum.photos/seed/post6/640/360",
        postUrl: "https://tiktok.com/@mctrovao/video/fake2",
        likes: 34000,
        comments: 2100,
        shares: 5600,
        playCount: 1800000,
        postedAt: hoursAgo(12),
      },
    ]);
    console.log("Artist posts created: 7");
  } else {
    console.log("Artist posts already exist:", existingPosts.length);
  }

  // 8. Mock insights
  const existingInsights = await db
    .select()
    .from(artistInsights)
    .where(eq(artistInsights.labelId, label.id));

  if (existingInsights.length === 0) {
    const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

    await db.insert(artistInsights).values([
      {
        artistId: artist1.id,
        labelId: label.id,
        type: "alert",
        title: "TikTok: +25.5% de seguidores em 48h",
        body: "Crescimento acelerado de 45.000 para 52.000 seguidores.",
        platform: "tiktok",
        value: "52000",
        delta: "25.50",
        severity: "success",
        isRead: false,
        generatedAt: hoursAgo(1),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        type: "trend",
        title: "Post viralizando no TikTok: 1.8M views",
        body: "Esse beat vai dominar o verão",
        platform: "tiktok",
        value: "1800000",
        severity: "success",
        isRead: false,
        generatedAt: hoursAgo(3),
      },
      {
        artistId: artist2.id,
        labelId: label.id,
        type: "alert",
        title: "Queda de engajamento no Instagram",
        body: "Engagement rate caiu de 2.50% para 2.10%.",
        platform: "instagram",
        value: "2.10",
        delta: "-16.00",
        severity: "warning",
        isRead: false,
        generatedAt: hoursAgo(6),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        type: "milestone",
        title: "MC Trovão foi mencionado em 1 veiculo(s) de midia",
        body: "MC Trovão é destaque na nova geração do funk brasileiro",
        platform: "news",
        value: "1",
        severity: "info",
        isRead: true,
        generatedAt: hoursAgo(24),
      },
      {
        artistId: artist1.id,
        labelId: label.id,
        type: "trend",
        title: "MC Trovão esta em alta atividade: 4 posts em 24h",
        body: "Atividade acima do normal nas redes.",
        value: "4",
        severity: "info",
        isRead: false,
        generatedAt: hoursAgo(2),
      },
    ]);
    console.log("Artist insights created: 5");
  } else {
    console.log("Artist insights already exist:", existingInsights.length);
  }

  console.log("Seed completed!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
