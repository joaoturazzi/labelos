import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  labels,
  submissions,
  artists,
  artistSocials,
  artistPosts,
  artistInsights,
  trendingTracks,
  aiConfigs,
  notifications,
  radarAlerts,
} from "./schema";
import { eq, sql } from "drizzle-orm";

const AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const COVER = (seed: string) => `https://picsum.photos/seed/${seed}/300/300`;

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function seedPOC() {
  const dbSql = neon(process.env.DATABASE_URL!);
  const db = drizzle(dbSql);

  console.log("🎵 Iniciando seed POC...\n");

  // Find the existing label
  const allLabels = await db.select().from(labels);
  if (allLabels.length === 0) {
    console.error("❌ Nenhuma label encontrada no banco.");
    console.error("   Acesse o dashboard uma vez para criar a label automaticamente.");
    process.exit(1);
  }

  const label = allLabels[0];
  console.log(`✅ Label encontrada: "${label.name}" (slug: ${label.slug})`);

  // Clean old data
  console.log("\n🧹 Limpando dados anteriores...");
  await cleanLabel(db, label.id);
  console.log("   ✓ Dados limpos");

  // Update label for presentation
  await db.update(labels).set({
    portalHeadline: "Envie sua demo para a Batida Records",
    portalSubtext: "Trabalhamos com Funk, Trap e Afrobeat. So lancamos se acreditarmos no seu trabalho.",
    contactEmail: "demos@batidarecords.com.br",
    accentColor: "#1a1a1a",
    portalOpen: true,
    onboardingCompleted: true,
  }).where(eq(labels.id, label.id));
  console.log("   ✓ Label atualizada");

  // AI Config
  await db.insert(aiConfigs).values({
    labelId: label.id,
    criteria: {
      generos_preferidos: ["Funk", "Trap", "Afrobeat"],
      bpm_ideal: "90-150",
      foco: "Potencial viral em TikTok e Reels, producao limpa, identidade sonora forte",
      qualidade_minima: "Mix equilibrado, voz bem gravada, masterizacao adequada",
    },
    model: "google/gemini-2.0-flash-001",
  }).onConflictDoNothing();
  console.log("   ✓ IA configurada");

  // ── ARTISTS ──
  console.log("\n👥 Criando artistas...");
  const artistsData = [
    { name: "MC Trovao", email: "mctrovao@gmail.com", instagramHandle: "mctrovao", tiktokHandle: "mctrovao", spotifyId: "4tZwfgrHOc3mvqYlEYSvVi" },
    { name: "Luana Beats", email: "luanabeats@gmail.com", instagramHandle: "luanabeats", tiktokHandle: "luanabeats", spotifyId: "6vWDO969PvNqNYHIOW5v0m" },
    { name: "DJ Fenix", email: "djfenix@gmail.com", instagramHandle: "djfenixoficial", tiktokHandle: "djfenix" },
    { name: "Kevinho Jr", email: "kevinhojr@gmail.com", instagramHandle: "kevinhojr", tiktokHandle: "kevinhojr_oficial" },
    { name: "Afroside", email: "afroside@gmail.com", instagramHandle: "afrosidemusic", tiktokHandle: "afroside", spotifyId: "3WrFJ7ztbogyGnTHbHJFl2" },
    { name: "Bruna Flow", email: "brunaflow@gmail.com", instagramHandle: "brunaflow", tiktokHandle: "brunaflow" },
    { name: "Trap Ze", email: "trapze@gmail.com", instagramHandle: "trapze_oficial", tiktokHandle: "trapze" },
    { name: "MC Valentina", email: "mcvalentina@gmail.com", instagramHandle: "mcvalentina", tiktokHandle: "mcvalentina_oficial" },
  ];

  const createdArtists: (typeof artists.$inferSelect)[] = [];
  for (const a of artistsData) {
    const [created] = await db.insert(artists).values({ ...a, labelId: label.id }).returning();
    createdArtists.push(created);
    console.log(`   ✓ ${a.name}`);
  }

  // Social metrics
  const metrics = [
    { name: "MC Trovao", ig: 127000, igEng: "4.20", tt: 89000, ttEng: "5.80" },
    { name: "Luana Beats", ig: 43000, igEng: "6.80", tt: 210000, ttEng: "8.10" },
    { name: "DJ Fenix", ig: 78000, igEng: "3.10", tt: 34000, ttEng: "4.20" },
    { name: "Kevinho Jr", ig: 12000, igEng: "7.20", tt: 8000, ttEng: "9.10" },
    { name: "Afroside", ig: 56000, igEng: "5.90", tt: 67000, ttEng: "6.70" },
    { name: "Bruna Flow", ig: 9800, igEng: "8.10", tt: 15000, ttEng: "9.40" },
    { name: "Trap Ze", ig: 34000, igEng: "4.70", tt: 41000, ttEng: "5.20" },
    { name: "MC Valentina", ig: 6200, igEng: "9.20", tt: 4100, ttEng: "10.10" },
  ];

  for (const m of metrics) {
    const artist = createdArtists.find((a) => a.name === m.name);
    if (!artist) continue;
    await db.insert(artistSocials).values([
      { artistId: artist.id, platform: "instagram", followers: m.ig, engagementRate: m.igEng, collectedAt: new Date() },
      { artistId: artist.id, platform: "tiktok", followers: m.tt, engagementRate: m.ttEng, collectedAt: new Date() },
    ]);
  }
  console.log("   ✓ Metricas sociais criadas");

  // ── SUBMISSIONS ──
  console.log("\n🎵 Criando submissions...");
  const subsData = [
    {
      trackTitle: "Vai Tudinho", artistName: "MC Trovao", artistEmail: "mctrovao@gmail.com",
      genre: "Funk", bpm: 130, produtor: "DJ Cabeca", engenheiroMix: "Studio Z Mix",
      compositores: "MC Trovao, DJ Cabeca", distributor: "ONErpm",
      instagramUrl: "https://instagram.com/mctrovao", tiktokUrl: "https://tiktok.com/@mctrovao",
      coverUrl: COVER("trovao"), status: "approved", pipelineStage: "approved",
      aiScore: 87,
      aiSummary: "Producao de alto nivel com batida viciante e potencial viral imenso. A faixa tem todos os elementos para estourar no TikTok — gancho forte, ritmo contagiante e voz carismatica.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: ["Gancho extremamente forte", "Producao profissional", "Potencial viral no TikTok"],
        pontos_fracos: ["Intro poderia ser mais curta para Reels"],
        qualidade_producao: 9, potencial_comercial: 9, fit_criterios: 9, originalidade: 8, potencial_viral: 10,
        genero_detectado: "Funk", bpm_estimado: 130, energia: "alta",
        proximos_passos: "Lancar com campanha no TikTok imediatamente",
      },
      submittedAt: hoursAgo(168), reviewedAt: hoursAgo(144),
    },
    {
      trackTitle: "Afro Noite", artistName: "Luana Beats", artistEmail: "luanabeats@gmail.com",
      genre: "Afrobeat", bpm: 112, produtor: "Luana Beats", engenheiroMix: "Casa de Som Studio",
      compositores: "Luana Beats", distributor: "DistroKid",
      instagramUrl: "https://instagram.com/luanabeats", tiktokUrl: "https://tiktok.com/@luanabeats",
      coverUrl: COVER("luana"), status: "approved", pipelineStage: "approved",
      aiScore: 82,
      aiSummary: "Afrobeat moderno com identidade sonora muito bem definida. Potencial internacional e fit perfeito com o movimento afrobeats atual no Brasil.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: ["Identidade sonora unica", "Producao autoral", "Tendencia afrobeats em alta"],
        pontos_fracos: ["BPM levemente abaixo do ideal para TikTok"],
        qualidade_producao: 8, potencial_comercial: 8, fit_criterios: 9, originalidade: 10, potencial_viral: 7,
        genero_detectado: "Afrobeat", bpm_estimado: 112, energia: "media",
        proximos_passos: "Focar em playlist editorial do Spotify",
      },
      submittedAt: hoursAgo(120), reviewedAt: hoursAgo(96),
    },
    {
      trackTitle: "Montagem Espacial", artistName: "DJ Fenix", artistEmail: "djfenix@gmail.com",
      genre: "Funk", bpm: 145, produtor: "DJ Fenix", compositores: "DJ Fenix",
      instagramUrl: "https://instagram.com/djfenixoficial", tiktokUrl: "https://tiktok.com/@djfenix",
      coverUrl: COVER("fenix"), status: "reviewing", pipelineStage: "review",
      aiScore: 74,
      aiSummary: "Montagem criativa com potencial viral consideravel. BPM alto funciona bem para trends do TikTok. Producao competente mas poderia ter mais presenca nos graves.",
      aiCriteriaUsed: {
        recomendacao: "talvez",
        pontos_fortes: ["BPM ideal para TikTok trends", "Criatividade na montagem", "Energia alta"],
        pontos_fracos: ["Graves precisam de mais presenca", "Mix poderia ser mais equilibrado"],
        qualidade_producao: 7, potencial_comercial: 8, fit_criterios: 7, originalidade: 7, potencial_viral: 8,
        genero_detectado: "Funk", bpm_estimado: 145, energia: "alta",
        proximos_passos: "Solicitar versao com mix revisado",
      },
      submittedAt: hoursAgo(72), reviewedAt: hoursAgo(48),
    },
    {
      trackTitle: "Lagos to Sao Paulo", artistName: "Afroside", artistEmail: "afroside@gmail.com",
      genre: "Afrobeat", bpm: 108, produtor: "Afroside", engenheiroMix: "MixPro Studio",
      compositores: "Afroside", distributor: "TuneCore",
      instagramUrl: "https://instagram.com/afrosidemusic", tiktokUrl: "https://tiktok.com/@afroside",
      coverUrl: COVER("afroside"), status: "reviewing", pipelineStage: "committee",
      aiScore: 71,
      aiSummary: "Proposta ambiciosa unindo afrobeats nigeriano com elementos brasileiros. Conceito interessante mas execucao precisa de ajustes.",
      aiCriteriaUsed: {
        recomendacao: "talvez",
        pontos_fortes: ["Fusao cultural interessante", "Conceito diferenciado"],
        pontos_fracos: ["Fusao ainda nao totalmente integrada", "Voz baixa no mix"],
        qualidade_producao: 7, potencial_comercial: 7, fit_criterios: 8, originalidade: 9, potencial_viral: 6,
        genero_detectado: "Afrobeat", bpm_estimado: 108, energia: "media",
        proximos_passos: "Pedir versao com voz mais presente",
      },
      submittedAt: hoursAgo(48), reviewedAt: hoursAgo(24),
    },
    {
      trackTitle: "Bum Bum Tam Tam 2025", artistName: "Kevinho Jr", artistEmail: "kevinhojr@gmail.com",
      genre: "Funk", bpm: 128, produtor: "Studio K", compositores: "Kevinho Jr",
      instagramUrl: "https://instagram.com/kevinhojr", tiktokUrl: "https://tiktok.com/@kevinhojr_oficial",
      coverUrl: COVER("kevinho"), status: "pending", pipelineStage: "triage",
      aiScore: 91,
      aiSummary: "Faixa com potencial extraordinario. Referencia ao hit original com twist moderno que funciona muito bem. Producao impecavel e voz marcante.",
      aiCriteriaUsed: {
        recomendacao: "sim",
        pontos_fortes: ["Nostalgia com modernidade", "Producao impecavel", "Gancho irresistivel"],
        pontos_fracos: ["Risco de comparacao com o original"],
        qualidade_producao: 9, potencial_comercial: 10, fit_criterios: 10, originalidade: 7, potencial_viral: 10,
        genero_detectado: "Funk", bpm_estimado: 128, energia: "alta",
        proximos_passos: "Aprovar urgente",
      },
      submittedAt: hoursAgo(12),
    },
    {
      trackTitle: "Nao Me Toca", artistName: "Bruna Flow", artistEmail: "brunaflow@gmail.com",
      genre: "Trap", bpm: 95, produtor: "Beats BR", compositores: "Bruna Flow, Beats BR",
      instagramUrl: "https://instagram.com/brunaflow", tiktokUrl: "https://tiktok.com/@brunaflow",
      coverUrl: COVER("bruna"), status: "pending", pipelineStage: "triage",
      aiScore: 68,
      aiSummary: "Trap feminino com atitude e letra forte. Mix precisa de polimento mas a artista tem personalidade marcante.",
      aiCriteriaUsed: {
        recomendacao: "talvez",
        pontos_fortes: ["Diferencial de mercado", "Letra com personalidade"],
        pontos_fracos: ["Mix precisa de revisao", "Graves excessivos no drop"],
        qualidade_producao: 6, potencial_comercial: 7, fit_criterios: 7, originalidade: 8, potencial_viral: 7,
        genero_detectado: "Trap", bpm_estimado: 95, energia: "media",
        proximos_passos: "Solicitar mix revisado",
      },
      submittedAt: hoursAgo(6),
    },
    {
      trackTitle: "Dinheiro Sujo", artistName: "Trap Ze", artistEmail: "trapze@gmail.com",
      genre: "Trap", bpm: 88, produtor: "AutoTune Pro", compositores: "Trap Ze",
      instagramUrl: "https://instagram.com/trapze_oficial", tiktokUrl: "https://tiktok.com/@trapze",
      coverUrl: COVER("trapze"), status: "rejected", pipelineStage: "rejected",
      aiScore: 38,
      aiSummary: "Producao abaixo do padrao minimo esperado. Autotune mal calibrado, mix desequilibrado e letra generica.",
      aiCriteriaUsed: {
        recomendacao: "nao",
        pontos_fortes: ["Energia presente"],
        pontos_fracos: ["Autotune mal calibrado", "Mix desequilibrado", "Letra generica"],
        qualidade_producao: 3, potencial_comercial: 4, fit_criterios: 3, originalidade: 4, potencial_viral: 3,
        genero_detectado: "Trap", bpm_estimado: 88, energia: "media",
        proximos_passos: "Buscar produtor profissional e voltar em 6 meses",
      },
      rejectionMessage: "A producao precisa ser profissionalizada. Recomendamos buscar um estudio e reenviar.",
      submittedAt: hoursAgo(336), reviewedAt: hoursAgo(312),
    },
    {
      trackTitle: "Rainha da Pista", artistName: "MC Valentina", artistEmail: "mcvalentina@gmail.com",
      genre: "Funk", bpm: 135, produtor: "MK Studio", compositores: "MC Valentina",
      instagramUrl: "https://instagram.com/mcvalentina", tiktokUrl: "https://tiktok.com/@mcvalentina_oficial",
      coverUrl: COVER("valentina"), status: "pending", pipelineStage: "triage",
      aiScore: null, aiSummary: null, aiCriteriaUsed: null,
      submittedAt: hoursAgo(0.3),
    },
  ];

  for (const s of subsData) {
    await db.insert(submissions).values({
      labelId: label.id,
      audioFileUrl: AUDIO,
      audioFileKey: `poc_${s.trackTitle.replace(/\s/g, "_").toLowerCase()}`,
      lgpdConsentAt: s.submittedAt,
      ...s,
    });
    const score = s.aiScore !== null ? `score: ${s.aiScore}` : "analisando...";
    console.log(`   ✓ "${s.trackTitle}" — ${s.artistName} [${s.status}] (${score})`);
  }

  // ── FEED POSTS ──
  console.log("\n📱 Criando posts do feed...");
  const findArtist = (name: string) => createdArtists.find((a) => a.name === name);

  const postsData = [
    { artist: "MC Trovao", platform: "tiktok", postType: "video", content: "Vai tudinho que e sucesso 🔥🔥🔥 #funk #tiktok #viral", mediaUrl: "https://picsum.photos/seed/tt1/400/300", postUrl: "https://tiktok.com/@mctrovao/video/1", likes: 48200, comments: 1820, shares: 9400, views: 0, playCount: 2100000, postedAt: hoursAgo(48) },
    { artist: "MC Trovao", platform: "instagram", postType: "reel", content: "Novo clipe saindo essa semana! Fiquem ligados 🎵", mediaUrl: "https://picsum.photos/seed/ig1/400/400", postUrl: "https://instagram.com/p/poc001", likes: 12400, comments: 380, shares: 0, views: 89000, playCount: 89000, postedAt: hoursAgo(24) },
    { artist: "Luana Beats", platform: "tiktok", postType: "video", content: "Afro Noite chegando forte 🌙🥁 #afrobeat #novidade", mediaUrl: "https://picsum.photos/seed/tt2/400/300", postUrl: "https://tiktok.com/@luanabeats/video/2", likes: 31500, comments: 940, shares: 6200, views: 0, playCount: 890000, postedAt: hoursAgo(18) },
    { artist: "Luana Beats", platform: "instagram", postType: "post", content: "Nos bastidores da gravacao 🎧 Algo grande vem por ai...", mediaUrl: "https://picsum.photos/seed/ig2/400/400", postUrl: "https://instagram.com/p/poc002", likes: 8900, comments: 210, shares: 0, views: 0, playCount: 0, postedAt: hoursAgo(72) },
    { artist: "Afroside", platform: "instagram", postType: "reel", content: "Lagos to Sao Paulo — a fusao que o Brasil estava esperando 🇳🇬🇧🇷", mediaUrl: "https://picsum.photos/seed/ig3/400/400", postUrl: "https://instagram.com/p/poc003", likes: 14200, comments: 490, shares: 0, views: 67000, playCount: 67000, postedAt: hoursAgo(96) },
    { artist: "MC Trovao", platform: "news", postType: "news", content: "MC Trovao estreia no top 10 do Spotify Brasil com 'Vai Tudinho' e acumula 2 milhoes de plays no TikTok em menos de uma semana.", mediaUrl: null, postUrl: "https://rollingstone.uol.com.br/poc", likes: 0, comments: 0, shares: 0, views: 0, playCount: 0, postedAt: hoursAgo(24) },
    { artist: "DJ Fenix", platform: "tiktok", postType: "video", content: "Montagem espacial 🚀 quem aguenta? #montagem #funk", mediaUrl: "https://picsum.photos/seed/tt3/400/300", postUrl: "https://tiktok.com/@djfenix/video/3", likes: 9800, comments: 340, shares: 2100, views: 0, playCount: 450000, postedAt: hoursAgo(120) },
  ];

  for (const p of postsData) {
    const a = findArtist(p.artist);
    if (!a) continue;
    const { artist: _, ...data } = p;
    await db.insert(artistPosts).values({ artistId: a.id, labelId: label.id, ...data });
    console.log(`   ✓ ${p.artist} — ${p.platform} (${p.postType})`);
  }

  // ── INSIGHTS ──
  console.log("\n💡 Criando insights...");
  const mc = findArtist("MC Trovao");
  const lu = findArtist("Luana Beats");
  const tz = findArtist("Trap Ze");

  if (mc) {
    await db.insert(artistInsights).values([
      { artistId: mc.id, labelId: label.id, type: "trend", title: "Post viralizando no TikTok: 2.1M plays", body: "A faixa 'Vai Tudinho' atingiu 2.1M de plays no TikTok em 72h, 3x acima da media.", platform: "tiktok", value: "2100000", delta: "340", severity: "success" },
      { artistId: mc.id, labelId: label.id, type: "milestone", title: "MC Trovao citado em 3 veiculos de midia", body: "Rolling Stone Brasil, Billboard Brasil e UOL cobriram o crescimento do artista.", platform: "news", value: "3", severity: "info" },
    ]);
    console.log("   ✓ 2 insights MC Trovao");
  }
  if (lu) {
    await db.insert(artistInsights).values({ artistId: lu.id, labelId: label.id, type: "alert", title: "TikTok: +180% de seguidores em 48h", body: "Luana Beats cresceu 180% no TikTok em 48h apos trend de afrobeat. Passou de 80K para 210K.", platform: "tiktok", value: "210000", delta: "180", severity: "success" });
    console.log("   ✓ 1 insight Luana Beats");
  }
  if (tz) {
    await db.insert(artistInsights).values({ artistId: tz.id, labelId: label.id, type: "alert", title: "Queda de engajamento no Instagram", body: "Trap Ze apresentou queda de 35% no engajamento do Instagram nos ultimos 7 dias.", platform: "instagram", value: "3.1", delta: "-35", severity: "warning", isRead: true });
    console.log("   ✓ 1 insight Trap Ze");
  }

  // ── TRENDING ──
  console.log("\n📈 Criando trending...");
  const trendData = [
    { platform: "tiktok", rank: 1, trackName: "Vai Tudinho", artistName: "MC Trovao", plays: 2100000, deltaRank: 4 },
    { platform: "tiktok", rank: 2, trackName: "Bum Bum Fever", artistName: "Luisa Sonza", plays: 1800000, deltaRank: -1 },
    { platform: "tiktok", rank: 3, trackName: "Afro Noite", artistName: "Luana Beats", plays: 890000, deltaRank: 8 },
    { platform: "tiktok", rank: 4, trackName: "Ta Tranquilo", artistName: "Matue", plays: 760000, deltaRank: 0 },
    { platform: "tiktok", rank: 5, trackName: "Montagem Espacial", artistName: "DJ Fenix", plays: 450000, deltaRank: 12 },
    { platform: "tiktok", rank: 6, trackName: "Amor de Verao", artistName: "Anitta", plays: 380000, deltaRank: -2 },
    { platform: "tiktok", rank: 7, trackName: "Deixa Eu Te Amar", artistName: "WC no Beat", plays: 340000, deltaRank: 3 },
    { platform: "tiktok", rank: 8, trackName: "Batidao Total", artistName: "DJ LK da Escocia", plays: 290000, deltaRank: -4 },
    { platform: "tiktok", rank: 9, trackName: "Rainha da Pista", artistName: "MC Valentina", plays: 180000, deltaRank: null },
    { platform: "tiktok", rank: 10, trackName: "Nao Me Toca", artistName: "Bruna Flow", plays: 89000, deltaRank: 11 },
    { platform: "reels", rank: 1, trackName: "Afro Noite", artistName: "Luana Beats", plays: 1200000, deltaRank: 6 },
    { platform: "reels", rank: 2, trackName: "Lagos to Sao Paulo", artistName: "Afroside", plays: 980000, deltaRank: 9 },
    { platform: "reels", rank: 3, trackName: "Vai Tudinho", artistName: "MC Trovao", plays: 870000, deltaRank: 2 },
    { platform: "reels", rank: 4, trackName: "Savage Love", artistName: "Jason Derulo", plays: 720000, deltaRank: -1 },
    { platform: "reels", rank: 5, trackName: "Essa Menina", artistName: "Xama", plays: 540000, deltaRank: 4 },
    { platform: "reels", rank: 6, trackName: "Nao Me Toca", artistName: "Bruna Flow", plays: 320000, deltaRank: 11 },
    { platform: "reels", rank: 7, trackName: "Bum Bum Tam Tam 2025", artistName: "Kevinho Jr", plays: 180000, deltaRank: null },
    { platform: "reels", rank: 8, trackName: "Montagem Espacial", artistName: "DJ Fenix", plays: 140000, deltaRank: 7 },
    { platform: "spotify", rank: 1, trackName: "Vai Tudinho", artistName: "MC Trovao", plays: 890000, deltaRank: 7 },
    { platform: "spotify", rank: 2, trackName: "Afro Noite", artistName: "Luana Beats", plays: 540000, deltaRank: 5 },
    { platform: "spotify", rank: 3, trackName: "SNAP", artistName: "Rosa Linn", plays: 430000, deltaRank: -2 },
    { platform: "spotify", rank: 4, trackName: "Flowers", artistName: "Miley Cyrus", plays: 380000, deltaRank: 0 },
    { platform: "spotify", rank: 5, trackName: "Ta Tranquilo", artistName: "Matue", plays: 310000, deltaRank: 3 },
    { platform: "spotify", rank: 6, trackName: "Lagos to Sao Paulo", artistName: "Afroside", plays: 280000, deltaRank: 14 },
    { platform: "spotify", rank: 7, trackName: "Montagem Espacial", artistName: "DJ Fenix", plays: 240000, deltaRank: 6 },
    { platform: "spotify", rank: 8, trackName: "Nao Me Toca", artistName: "Bruna Flow", plays: 180000, deltaRank: 8 },
  ];

  for (const t of trendData) {
    await db.insert(trendingTracks).values({ labelId: label.id, ...t, collectedAt: new Date() });
  }
  console.log(`   ✓ ${trendData.length} tracks trending`);

  // ── RADAR ALERTS ──
  console.log("\n📡 Criando alertas do radar...");
  const allSubs = await db.select().from(submissions).where(eq(submissions.labelId, label.id));

  const radarData = [
    { artistName: "MC Trovao", platform: "TikTok", metric: "plays", prev: 620000, curr: 2100000, growth: "238.71", status: "approved", msg: "MC Trovao cresceu 239% em plays no TikTok em 7 dias (620K → 2.1M) — faixa aprovada por voces!" },
    { artistName: "Luana Beats", platform: "TikTok", metric: "seguidores", prev: 80000, curr: 210000, growth: "162.50", status: "approved", msg: "Luana Beats cresceu 163% em seguidores no TikTok em 48h (80K → 210K) — artista aprovada!" },
    { artistName: "Trap Ze", platform: "Instagram", metric: "seguidores", prev: 12000, curr: 34000, growth: "183.33", status: "rejected", msg: "Trap Ze cresceu 183% no Instagram em 30 dias (12K → 34K) — voce rejeitou a demo. Hora de reconsiderar?" },
  ];

  for (const r of radarData) {
    const sub = allSubs.find((s) => s.artistName === r.artistName);
    if (!sub) continue;
    await db.insert(radarAlerts).values({
      labelId: label.id, submissionId: sub.id, artistName: r.artistName,
      platform: r.platform, metric: r.metric,
      previousValue: r.prev, currentValue: r.curr, growthPercent: r.growth,
      submissionStatus: r.status, submissionDate: sub.submittedAt,
      trackTitle: sub.trackTitle, alertMessage: r.msg,
      isRead: false, generatedAt: hoursAgo(Math.random() * 12),
    });
    console.log(`   ✓ ${r.artistName} (+${r.growth}% no ${r.platform})`);
  }

  // ── NOTIFICATIONS ──
  console.log("\n🔔 Criando notificacoes...");
  const notifsData = [
    { type: "new_submission", title: "Nova demo: Rainha da Pista", body: "MC Valentina enviou uma demo ha 20 minutos", link: "/dashboard/submissions", isRead: false, createdAt: hoursAgo(0.3) },
    { type: "new_submission", title: "Nova demo: Nao Me Toca", body: "Bruna Flow enviou uma nova demo", link: "/dashboard/submissions", isRead: false, createdAt: hoursAgo(6) },
    { type: "ai_score_ready", title: "Score: Bum Bum Tam Tam 2025", body: "Kevinho Jr — 91/100 · Recomendado", link: "/dashboard/submissions", isRead: false, createdAt: hoursAgo(11) },
    { type: "radar_alert", title: "Artista em ascensao: Luana Beats", body: "Luana Beats cresceu 163% no TikTok em 48h", link: "/dashboard/radar", isRead: false, createdAt: hoursAgo(3) },
    { type: "radar_alert", title: "Artista em ascensao: MC Trovao", body: "MC Trovao cresceu 239% em plays no TikTok", link: "/dashboard/radar", isRead: false, createdAt: hoursAgo(6) },
    { type: "ai_score_ready", title: "Score: Vai Tudinho", body: "MC Trovao — 87/100 · Recomendado", link: "/dashboard/submissions", isRead: true, createdAt: hoursAgo(168) },
  ];

  for (const n of notifsData) {
    await db.insert(notifications).values({ labelId: label.id, ...n });
  }
  console.log(`   ✓ ${notifsData.length} notificacoes (5 nao lidas)`);

  // ── DONE ──
  console.log("\n" + "=".repeat(60));
  console.log("🎉 SEED POC COMPLETO!");
  console.log("=".repeat(60));
  console.log(`\n📊 Dashboard:      /dashboard`);
  console.log(`🎵 Portal artista: /submit/${label.slug}`);
  console.log("\n📋 Resumo:");
  console.log("   • 8 artistas com metricas sociais");
  console.log("   • 8 submissions (2 aprovadas, 2 em analise, 3 pendentes, 1 rejeitada)");
  console.log("   • 7 posts no feed");
  console.log("   • 4 insights de artistas");
  console.log(`   • ${trendData.length} tracks trending`);
  console.log("   • 3 alertas no radar");
  console.log("   • 6 notificacoes");
}

async function cleanLabel(db: ReturnType<typeof drizzle>, labelId: string) {
  try { await db.delete(radarAlerts).where(eq(radarAlerts.labelId, labelId)); } catch {}
  try { await db.delete(notifications).where(eq(notifications.labelId, labelId)); } catch {}
  try { await db.delete(trendingTracks).where(eq(trendingTracks.labelId, labelId)); } catch {}
  try { await db.delete(artistInsights).where(eq(artistInsights.labelId, labelId)); } catch {}
  try { await db.delete(artistPosts).where(eq(artistPosts.labelId, labelId)); } catch {}
  try { await db.execute(sql`DELETE FROM artist_socials WHERE artist_id IN (SELECT id FROM artists WHERE label_id = ${labelId})`); } catch {}
  try { await db.delete(submissions).where(eq(submissions.labelId, labelId)); } catch {}
  try { await db.delete(artists).where(eq(artists.labelId, labelId)); } catch {}
  try { await db.delete(aiConfigs).where(eq(aiConfigs.labelId, labelId)); } catch {}
}

seedPOC().catch((e) => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
