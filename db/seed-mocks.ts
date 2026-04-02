import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  labels,
  submissions,
  artists,
  artistPosts,
  artistInsights,
  artistSocials,
  trendingTracks,
  notifications,
  radarAlerts,
  aiConfigs,
} from "./schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

async function seedMocks() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding mock data...\n");

  // ── Get or create label ──
  let [label] = await db
    .select()
    .from(labels)
    .where(eq(labels.slug, "demo"))
    .limit(1);

  if (!label) {
    [label] = await db
      .insert(labels)
      .values({
        name: "Gravadora Demo",
        slug: "demo",
        clerkOrgId: "org_local_test",
        plan: "free",
        accentColor: "#1a1a1a",
        portalHeadline: "Envie sua demo para a Gravadora Demo",
        portalSubtext:
          "Trabalhamos com funk, trap, pop e R&B. Buscamos novos talentos com potencial comercial.",
        contactEmail: "contato@gravadorademo.com",
      })
      .returning();
    console.log("Label created:", label.name);
  } else {
    // Update portal settings
    await db
      .update(labels)
      .set({
        portalHeadline: "Envie sua demo para a Gravadora Demo",
        portalSubtext:
          "Trabalhamos com funk, trap, pop e R&B. Buscamos novos talentos com potencial comercial.",
        contactEmail: "contato@gravadorademo.com",
      })
      .where(eq(labels.id, label.id));
    console.log("Label updated:", label.name);
  }

  // ── AI Config ──
  const [existingConfig] = await db
    .select()
    .from(aiConfigs)
    .where(eq(aiConfigs.labelId, label.id))
    .limit(1);

  if (!existingConfig) {
    await db.insert(aiConfigs).values({
      labelId: label.id,
      criteria: {
        generos_preferidos: ["Funk", "Trap", "Pop", "R&B"],
        bpm_ideal: "80-140",
        foco: "Potencial comercial e fit com TikTok/Reels",
        qualidade_minima: "Producao limpa, mix equilibrado",
      },
      model: "google/gemini-2.0-flash-001",
    });
  }

  // ── Artists ──
  const artistsData = [
    {
      name: "MC Trovao",
      email: "trovao@email.com",
      instagramHandle: "mctrovao",
      tiktokHandle: "mctrovaooficial",
      spotifyId: "4xRYI6VqpkE3UB2zuDVaLH",
    },
    {
      name: "DJ Aurora",
      email: "aurora@email.com",
      instagramHandle: "djauroramusic",
      tiktokHandle: "djaurora",
      spotifyId: "3TVXtAsR1Inumwj472S9r4",
    },
    {
      name: "Bia Santos",
      email: "bia@email.com",
      instagramHandle: "biasantosmusic",
      tiktokHandle: "biasantos",
    },
    {
      name: "Kaio Beats",
      email: "kaio@email.com",
      instagramHandle: "kaiobeats",
      tiktokHandle: "kaiobeatsoficial",
      spotifyId: "2CIMQHirSU0MQqyYHq0eOx",
    },
    {
      name: "Luna MC",
      email: "luna@email.com",
      instagramHandle: "lunamcoficial",
      tiktokHandle: "lunamc",
    },
  ];

  const createdArtists: (typeof artists.$inferSelect)[] = [];
  for (const a of artistsData) {
    const [existing] = await db
      .select()
      .from(artists)
      .where(eq(artists.email, a.email!))
      .limit(1);

    if (existing) {
      createdArtists.push(existing);
    } else {
      const [created] = await db
        .insert(artists)
        .values({ ...a, labelId: label.id })
        .returning();
      createdArtists.push(created);
    }
  }
  console.log(`Artists: ${createdArtists.length} ready`);

  // ── Submissions (varied statuses and scores) ──
  const submissionsData = [
    {
      trackTitle: "Noite de Neon",
      artistName: "Kaio Beats",
      artistEmail: "kaio@email.com",
      genre: "Trap, EDM",
      bpm: 128,
      produtor: "Kaio Beats",
      engenheiroMix: "Studio Flow",
      audioFileUrl: "https://example.com/audio/noite-de-neon.mp3",
      audioFileKey: "mock_noite_de_neon",
      instagramUrl: "https://instagram.com/kaiobeats",
      tiktokUrl: "https://tiktok.com/@kaiobeatsoficial",
      spotifyUrl: "https://open.spotify.com/artist/2CIMQHirSU0MQqyYHq0eOx",
      status: "approved",
      aiScore: 91,
      aiSummary:
        "Producao excepcional com potencial viral claro. O drop principal e irresistivel e o mix esta impecavel. A faixa tem um groove que funciona perfeitamente para conteudo de TikTok e Reels.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: [
          "Drop principal extremamente cativante",
          "Mix profissional e equilibrado",
          "Estrutura moderna com potencial viral",
        ],
        pontos_fracos: ["Letra poderia ter mais profundidade"],
        qualidade_producao: 9,
        potencial_comercial: 10,
        fit_criterios: 9,
        originalidade: 8,
        potencial_viral: 10,
        genero_detectado: "Trap/EDM",
        bpm_estimado: 128,
        energia: "alta",
        proximos_passos: "Lançar imediatamente com campanha de TikTok",
      },
      pipelineStage: "approved",
      submittedAt: daysAgo(18),
      reviewedAt: daysAgo(15),
    },
    {
      trackTitle: "Lua Cheia",
      artistName: "Luna MC",
      artistEmail: "luna@email.com",
      genre: "R&B, Pop",
      bpm: 95,
      compositores: "Luna MC, Kaio Beats",
      produtor: "Kaio Beats",
      audioFileUrl: "https://example.com/audio/lua-cheia.mp3",
      audioFileKey: "mock_lua_cheia",
      instagramUrl: "https://instagram.com/lunamcoficial",
      tiktokUrl: "https://tiktok.com/@lunamc",
      status: "reviewing",
      aiScore: 78,
      aiSummary:
        "Vocal potente com boa presenca e emocao. A producao e solida mas a masterizacao pode ser aprimorada. Tem apelo emocional forte para o publico de R&B.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: [
          "Vocal potente e emotivo",
          "Melodia memoravel",
          "Letra com profundidade emocional",
        ],
        pontos_fracos: [
          "Masterizacao abaixo do ideal",
          "Intro muito longa (45s)",
        ],
        qualidade_producao: 7,
        potencial_comercial: 8,
        fit_criterios: 7,
        originalidade: 8,
        potencial_viral: 6,
        genero_detectado: "R&B",
        bpm_estimado: 95,
        energia: "media",
        proximos_passos: "Refazer masterizacao e encurtar intro",
      },
      pipelineStage: "committee",
      submittedAt: daysAgo(10),
    },
    {
      trackTitle: "Chama no Paredao",
      artistName: "MC Bolt",
      artistEmail: "bolt@email.com",
      genre: "Funk",
      bpm: 150,
      produtor: "DJ Escobar",
      audioFileUrl: "https://example.com/audio/paredao.mp3",
      audioFileKey: "mock_paredao",
      instagramUrl: "https://instagram.com/mcbolt",
      tiktokUrl: "https://tiktok.com/@mcbolt",
      status: "pending",
      aiScore: 65,
      aiSummary:
        "Funk com batida envolvente e potencial para viralizar em festas. O vocal precisa de mais energia e o mix tem problemas na faixa de graves. Com ajustes na masterizacao, pode ser um hit regional.",
      aiCriteriaUsed: {
        recomendacao: "talvez",
        pontos_fortes: [
          "Batida contagiante",
          "Refrão grudento",
          "BPM perfeito para funk",
        ],
        pontos_fracos: [
          "Mix com graves excessivos",
          "Vocal sem energia nos versos",
        ],
        qualidade_producao: 6,
        potencial_comercial: 7,
        fit_criterios: 7,
        originalidade: 5,
        potencial_viral: 7,
        genero_detectado: "Funk",
        bpm_estimado: 150,
        energia: "alta",
        proximos_passos: "Regravar vocal com mais energia e refazer mix",
      },
      pipelineStage: "review",
      submittedAt: daysAgo(5),
    },
    {
      trackTitle: "Cinzas",
      artistName: "Vitoria Alves",
      artistEmail: "vitoria@email.com",
      genre: "Pop",
      bpm: 110,
      compositores: "Vitoria Alves",
      produtor: "Vitoria Alves",
      engenheiroMix: "Self-mixed",
      audioFileUrl: "https://example.com/audio/cinzas.mp3",
      audioFileKey: "mock_cinzas",
      instagramUrl: "https://instagram.com/vitoriaalvesmusic",
      status: "rejected",
      aiScore: 42,
      aiSummary:
        "Composicao mostra potencial artistico, mas a producao caseira prejudica a qualidade geral. O mix esta desbalanceado com vocais muito baixos e instrumentais dominantes. Recomenda-se buscar um produtor profissional.",
      aiCriteriaUsed: {
        recomendacao: "nao",
        pontos_fortes: [
          "Letra autoral interessante",
          "Melodia com personalidade",
        ],
        pontos_fracos: [
          "Producao amadora",
          "Mix desbalanceado",
          "Masterizacao ausente",
          "Vocais muito baixos",
        ],
        qualidade_producao: 3,
        potencial_comercial: 5,
        fit_criterios: 4,
        originalidade: 7,
        potencial_viral: 3,
        genero_detectado: "Pop",
        bpm_estimado: 110,
        energia: "media",
        proximos_passos:
          "Investir em producao profissional antes de reenviar",
      },
      pipelineStage: "rejected",
      submittedAt: daysAgo(25),
      reviewedAt: daysAgo(22),
      rejectionMessage:
        "A composicao tem potencial, mas a producao precisa ser profissionalizada. Recomendamos buscar um estudio e reenviar.",
    },
    {
      trackTitle: "Madrugada",
      artistName: "Rafa MC",
      artistEmail: "rafa@email.com",
      genre: "Rap, Trap",
      bpm: 85,
      produtor: "BeatKing",
      audioFileUrl: "https://example.com/audio/madrugada.mp3",
      audioFileKey: "mock_madrugada",
      instagramUrl: "https://instagram.com/rafamc",
      tiktokUrl: "https://tiktok.com/@rafamc",
      spotifyUrl: "https://open.spotify.com/artist/5K4W6rqBFWDnAN6FQUkS6x",
      status: "pending",
      aiScore: 74,
      aiSummary:
        "Rap com flow interessante e producao moderna. O artista tem um estilo proprio e a producao e profissional. Potencial de crescer organicamente em playlists de trap nacional.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: [
          "Flow unico e autoral",
          "Producao profissional",
          "Letra com storytelling forte",
        ],
        pontos_fracos: [
          "Alguns momentos de transicao podem ser mais fluidos",
        ],
        qualidade_producao: 8,
        potencial_comercial: 7,
        fit_criterios: 8,
        originalidade: 8,
        potencial_viral: 6,
        genero_detectado: "Rap/Trap",
        bpm_estimado: 85,
        energia: "media",
        proximos_passos: "Aprovar para lancamento",
      },
      pipelineStage: "triage",
      submittedAt: daysAgo(2),
    },
    {
      trackTitle: "Rewind",
      artistName: "Bia Santos",
      artistEmail: "bia@email.com",
      genre: "Pop, R&B",
      bpm: 100,
      audioFileUrl: "https://example.com/audio/rewind.mp3",
      audioFileKey: "mock_rewind",
      instagramUrl: "https://instagram.com/biasantosmusic",
      tiktokUrl: "https://tiktok.com/@biasantos",
      status: "pending",
      aiScore: null,
      aiSummary: null,
      aiCriteriaUsed: null,
      pipelineStage: "triage",
      submittedAt: daysAgo(0),
    },
  ];

  for (const s of submissionsData) {
    const [existing] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.trackTitle, s.trackTitle))
      .limit(1);

    if (!existing) {
      await db.insert(submissions).values({
        labelId: label.id,
        ...s,
        lgpdConsentAt: new Date(),
      });
      console.log(`  Submission: ${s.artistName} - ${s.trackTitle}`);
    }
  }

  // ── Artist Posts (Feed) ──
  const postsData = [
    {
      artistId: createdArtists[0].id, // MC Trovao
      platform: "instagram",
      postType: "reel",
      content:
        "Nova faixa saindo do forno! Preparados para o drop? 🔥🎵 #trap #funk #musica",
      mediaUrl: "https://picsum.photos/seed/trovao1/600/400",
      postUrl: "https://instagram.com/p/trovao1",
      likes: 4200,
      comments: 185,
      shares: 320,
      views: 45000,
      postedAt: daysAgo(1),
    },
    {
      artistId: createdArtists[0].id,
      platform: "tiktok",
      postType: "video",
      content: "Bastidores do estudio 🎧 nova musica vem ai",
      mediaUrl: "https://picsum.photos/seed/trovao2/600/400",
      postUrl: "https://tiktok.com/@mctrovao/video/1",
      likes: 12300,
      comments: 450,
      shares: 2100,
      views: 180000,
      postedAt: daysAgo(2),
    },
    {
      artistId: createdArtists[1].id, // DJ Aurora
      platform: "instagram",
      postType: "post",
      content:
        "Show lotado ontem em SP! Obrigada a todos que vieram ❤️ #djaurora #show",
      mediaUrl: "https://picsum.photos/seed/aurora1/600/400",
      postUrl: "https://instagram.com/p/aurora1",
      likes: 8900,
      comments: 320,
      shares: 150,
      views: 62000,
      postedAt: daysAgo(3),
    },
    {
      artistId: createdArtists[1].id,
      platform: "youtube",
      postType: "video",
      content: "DJ Aurora - Nascer do Sol (Official Video)",
      mediaUrl: "https://picsum.photos/seed/aurora2/600/400",
      postUrl: "https://youtube.com/watch?v=aurora2",
      likes: 15000,
      comments: 890,
      views: 320000,
      postedAt: daysAgo(5),
    },
    {
      artistId: createdArtists[2].id, // Bia Santos
      platform: "tiktok",
      postType: "video",
      content:
        "POV: voce ouve a preview da minha nova musica pela primeira vez 🎵",
      mediaUrl: "https://picsum.photos/seed/bia1/600/400",
      postUrl: "https://tiktok.com/@biasantos/video/1",
      likes: 52000,
      comments: 1800,
      shares: 8500,
      views: 890000,
      postedAt: daysAgo(1),
    },
    {
      artistId: createdArtists[3].id, // Kaio Beats
      platform: "instagram",
      postType: "reel",
      content: "Noite de Neon chegou a 1 milhao de plays no Spotify! 🚀",
      mediaUrl: "https://picsum.photos/seed/kaio1/600/400",
      postUrl: "https://instagram.com/p/kaio1",
      likes: 25000,
      comments: 1200,
      shares: 3500,
      views: 410000,
      postedAt: daysAgo(0),
    },
    {
      artistId: createdArtists[4].id, // Luna MC
      platform: "instagram",
      postType: "post",
      content: "Sessao de fotos para o lancamento de Lua Cheia 🌙",
      mediaUrl: "https://picsum.photos/seed/luna1/600/400",
      postUrl: "https://instagram.com/p/luna1",
      likes: 3200,
      comments: 95,
      views: 18000,
      postedAt: daysAgo(4),
    },
  ];

  for (const p of postsData) {
    await db.insert(artistPosts).values({
      ...p,
      labelId: label.id,
      collectedAt: new Date(),
    });
  }
  console.log(`Artist posts: ${postsData.length} created`);

  // ── Artist Socials (snapshots) ──
  const socialsData = [
    {
      artistId: createdArtists[0].id,
      platform: "instagram",
      followers: 28500,
      engagementRate: "4.20",
    },
    {
      artistId: createdArtists[0].id,
      platform: "tiktok",
      followers: 65000,
      engagementRate: "8.50",
    },
    {
      artistId: createdArtists[1].id,
      platform: "instagram",
      followers: 142000,
      engagementRate: "3.80",
    },
    {
      artistId: createdArtists[2].id,
      platform: "tiktok",
      followers: 890000,
      engagementRate: "12.30",
    },
    {
      artistId: createdArtists[2].id,
      platform: "instagram",
      followers: 245000,
      engagementRate: "5.60",
    },
    {
      artistId: createdArtists[3].id,
      platform: "instagram",
      followers: 310000,
      engagementRate: "6.10",
    },
    {
      artistId: createdArtists[3].id,
      platform: "tiktok",
      followers: 520000,
      engagementRate: "9.40",
    },
    {
      artistId: createdArtists[4].id,
      platform: "instagram",
      followers: 15800,
      engagementRate: "5.20",
    },
  ];

  for (const s of socialsData) {
    await db.insert(artistSocials).values({
      ...s,
      collectedAt: new Date(),
    });
  }
  console.log(`Artist socials: ${socialsData.length} snapshots`);

  // ── Artist Insights ──
  const insightsData = [
    {
      artistId: createdArtists[2].id, // Bia Santos
      type: "milestone",
      title: "Bia Santos atingiu 200K no Instagram",
      body: "O perfil da artista cruzou 200 mil seguidores no Instagram, um crescimento de 35% nos ultimos 30 dias.",
      platform: "instagram",
      value: "245000",
      delta: "35.2",
      severity: "success",
    },
    {
      artistId: createdArtists[3].id, // Kaio Beats
      type: "achievement",
      title: "Noite de Neon atingiu 1M de plays",
      body: "A faixa Noite de Neon, lancada pela gravadora, alcancou 1 milhao de reproducoes no Spotify.",
      platform: "spotify",
      value: "1000000",
      delta: "120.0",
      severity: "success",
    },
    {
      artistId: createdArtists[0].id, // MC Trovao
      type: "trend",
      title: "Crescimento acelerado no TikTok",
      body: "MC Trovao ganhou 12K novos seguidores nos ultimos 7 dias, com taxa de engajamento de 8.5%.",
      platform: "tiktok",
      value: "65000",
      delta: "22.6",
      severity: "warning",
    },
    {
      artistId: createdArtists[1].id, // DJ Aurora
      type: "alert",
      title: "Video viral detectado",
      body: "O video 'Nascer do Sol' no YouTube atingiu 320K views em 5 dias. Ritmo de crescimento 4x acima da media do canal.",
      platform: "youtube",
      value: "320000",
      delta: "400.0",
      severity: "success",
    },
    {
      artistId: createdArtists[4].id, // Luna MC
      type: "trend",
      title: "Queda de engajamento detectada",
      body: "O engajamento da Luna MC caiu 15% nas ultimas 2 semanas. Pode ser necessario ajustar estrategia de conteudo.",
      platform: "instagram",
      value: "15800",
      delta: "-15.0",
      severity: "warning",
    },
  ];

  for (const ins of insightsData) {
    await db.insert(artistInsights).values({
      ...ins,
      labelId: label.id,
      generatedAt: daysAgo(Math.floor(Math.random() * 5)),
    });
  }
  console.log(`Artist insights: ${insightsData.length} created`);

  // ── Trending Tracks ──
  const trendingData = [
    // TikTok
    { platform: "tiktok", rank: 1, trackName: "Ela Me Ama", artistName: "MC Don Juan", plays: 45_000_000, deltaRank: 2 },
    { platform: "tiktok", rank: 2, trackName: "Paredao Balancar", artistName: "DJ GBR", plays: 38_000_000, deltaRank: -1 },
    { platform: "tiktok", rank: 3, trackName: "Montagem Celestial", artistName: "DJ Topo", plays: 32_000_000, deltaRank: null },
    { platform: "tiktok", rank: 4, trackName: "Noite de Neon", artistName: "Kaio Beats", plays: 28_000_000, deltaRank: 5 },
    { platform: "tiktok", rank: 5, trackName: "Sentimento Falso", artistName: "MC Hariel", plays: 25_000_000, deltaRank: 0 },
    // Reels
    { platform: "reels", rank: 1, trackName: "Lua Cheia", artistName: "Luna MC", plays: 12_000_000, deltaRank: null },
    { platform: "reels", rank: 2, trackName: "Ela Me Ama", artistName: "MC Don Juan", plays: 10_500_000, deltaRank: 1 },
    { platform: "reels", rank: 3, trackName: "Vai Devagar", artistName: "DJ Aurora", plays: 8_900_000, deltaRank: -1 },
    { platform: "reels", rank: 4, trackName: "Frequencia Alta", artistName: "Bia Santos", plays: 7_200_000, deltaRank: 3 },
    { platform: "reels", rank: 5, trackName: "Adrenalina", artistName: "MC Bolt", plays: 5_100_000, deltaRank: 0 },
    // Spotify
    { platform: "spotify", rank: 1, trackName: "Noite de Neon", artistName: "Kaio Beats", plays: 1_200_000, deltaRank: 2 },
    { platform: "spotify", rank: 2, trackName: "Nascer do Sol", artistName: "DJ Aurora", plays: 980_000, deltaRank: 0 },
    { platform: "spotify", rank: 3, trackName: "Frequencia Alta", artistName: "Bia Santos", plays: 750_000, deltaRank: 1 },
    { platform: "spotify", rank: 4, trackName: "Madrugada", artistName: "Rafa MC", plays: 620_000, deltaRank: null },
    { platform: "spotify", rank: 5, trackName: "Tempestade no Beat", artistName: "MC Trovao", plays: 480_000, deltaRank: -2 },
  ];

  for (const t of trendingData) {
    await db.insert(trendingTracks).values({
      ...t,
      labelId: label.id,
      collectedAt: new Date(),
    });
  }
  console.log(`Trending tracks: ${trendingData.length} created`);

  // ── Radar Alerts ──
  // Get submissions for radar alerts
  const allSubs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.labelId, label.id));

  const rejectedSub = allSubs.find(
    (s) => s.status === "rejected"
  );
  const approvedSub = allSubs.find(
    (s) => s.status === "approved" && s.trackTitle !== "Frequência Alta"
  );
  const pendingSub = allSubs.find(
    (s) =>
      s.status === "pending" &&
      s.aiScore !== null &&
      s.trackTitle !== "Rewind"
  );

  const radarData = [];

  if (rejectedSub) {
    radarData.push({
      labelId: label.id,
      submissionId: rejectedSub.id,
      artistName: rejectedSub.artistName,
      platform: "Instagram",
      metric: "seguidores",
      previousValue: 8500,
      currentValue: 42000,
      growthPercent: "394.12",
      submissionStatus: "rejected",
      submissionDate: rejectedSub.submittedAt,
      trackTitle: rejectedSub.trackTitle,
      alertMessage: `${rejectedSub.artistName} cresceu 394% no Instagram em 30 dias (8.5K → 42K seguidores)`,
      isRead: false,
      generatedAt: daysAgo(1),
    });
  }

  if (approvedSub) {
    radarData.push({
      labelId: label.id,
      submissionId: approvedSub.id,
      artistName: approvedSub.artistName,
      platform: "TikTok",
      metric: "seguidores",
      previousValue: 180000,
      currentValue: 520000,
      growthPercent: "188.89",
      submissionStatus: "approved",
      submissionDate: approvedSub.submittedAt,
      trackTitle: approvedSub.trackTitle,
      alertMessage: `${approvedSub.artistName} cresceu 189% no TikTok (180K → 520K seguidores)`,
      isRead: false,
      generatedAt: daysAgo(2),
    });

    radarData.push({
      labelId: label.id,
      submissionId: approvedSub.id,
      artistName: approvedSub.artistName,
      platform: "Spotify",
      metric: "ouvintes mensais",
      previousValue: 45000,
      currentValue: 180000,
      growthPercent: "300.00",
      submissionStatus: "approved",
      submissionDate: approvedSub.submittedAt,
      trackTitle: approvedSub.trackTitle,
      alertMessage: `${approvedSub.artistName} cresceu 300% em ouvintes mensais no Spotify (45K → 180K)`,
      isRead: true,
      generatedAt: daysAgo(5),
    });
  }

  if (pendingSub) {
    radarData.push({
      labelId: label.id,
      submissionId: pendingSub.id,
      artistName: pendingSub.artistName,
      platform: "Instagram",
      metric: "marco 100K",
      previousValue: 85000,
      currentValue: 112000,
      growthPercent: "31.76",
      submissionStatus: "pending",
      submissionDate: pendingSub.submittedAt,
      trackTitle: pendingSub.trackTitle,
      alertMessage: `${pendingSub.artistName} cruzou 100K seguidores no Instagram!`,
      isRead: false,
      generatedAt: daysAgo(0),
    });
  }

  for (const r of radarData) {
    await db.insert(radarAlerts).values(r);
  }
  console.log(`Radar alerts: ${radarData.length} created`);

  // ── Notifications ──
  const notifsData = [
    {
      type: "new_submission",
      title: "Nova demo: Rewind",
      body: "Bia Santos enviou uma demo",
      link: "/dashboard/submissions",
      isRead: false,
      createdAt: daysAgo(0),
    },
    {
      type: "new_submission",
      title: "Nova demo: Madrugada",
      body: "Rafa MC enviou uma demo",
      link: "/dashboard/submissions",
      isRead: false,
      createdAt: daysAgo(2),
    },
    {
      type: "ai_score_ready",
      title: "Score: Madrugada",
      body: "Rafa MC — 74/100 · Recomendado",
      link: "/dashboard/submissions",
      isRead: false,
      createdAt: daysAgo(2),
    },
    {
      type: "radar_alert",
      title: "Artista em ascensao: Vitoria Alves",
      body: "Vitoria Alves cresceu 394% no Instagram em 30 dias",
      link: "/dashboard/radar",
      isRead: false,
      createdAt: daysAgo(1),
    },
    {
      type: "ai_score_ready",
      title: "Score: Chama no Paredao",
      body: "MC Bolt — 65/100 · Talvez",
      link: "/dashboard/submissions",
      isRead: true,
      createdAt: daysAgo(5),
    },
    {
      type: "new_submission",
      title: "Nova demo: Lua Cheia",
      body: "Luna MC enviou uma demo",
      link: "/dashboard/submissions",
      isRead: true,
      createdAt: daysAgo(10),
    },
  ];

  for (const n of notifsData) {
    await db.insert(notifications).values({
      ...n,
      labelId: label.id,
    });
  }
  console.log(`Notifications: ${notifsData.length} created`);

  console.log("\n✅ Seed complete!");
  console.log(`\nPortal: /submit/${label.slug}`);
  console.log("Dashboard: /dashboard/feed");
  console.log("Radar: /dashboard/radar");
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(
    Math.floor(Math.random() * 12) + 8,
    Math.floor(Math.random() * 60),
    0,
    0
  );
  return d;
}

seedMocks().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
