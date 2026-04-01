import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  numeric,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// ── Labels (gravadoras) ──────────────────────────────────────────────
export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkOrgId: text("clerk_org_id").unique().notNull(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").default("free"),
  // Portal customization
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").default("#1a1a1a"),
  portalHeadline: text("portal_headline"),
  portalSubtext: text("portal_subtext"),
  contactEmail: text("contact_email"),
  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false),
  // Scraping monitoring
  lastScrapingAt: timestamp("last_scraping_at"),
  lastScrapingStatus: text("last_scraping_status"),
  scrapingErrorLog: text("scraping_error_log"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Submissions (demos recebidas) ────────────────────────────────────
// status: pending | reviewing | approved | rejected
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id").references(() => labels.id),
  // Track info
  trackTitle: text("track_title").notNull(),
  artistName: text("artist_name").notNull(),
  artistEmail: text("artist_email").notNull(),
  genre: text("genre"),
  bpm: integer("bpm"),
  compositores: text("compositores"),
  produtor: text("produtor"),
  engenheiroMix: text("engenheiro_mix"),
  dataLancamento: text("data_lancamento"),
  // Files
  audioFileUrl: text("audio_file_url").notNull(),
  audioFileKey: text("audio_file_key").notNull(),
  coverUrl: text("cover_url"),
  coverKey: text("cover_key"),
  // Artist profiles
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
  deezerUrl: text("deezer_url"),
  youtubeMusicUrl: text("youtube_music_url"),
  amazonMusicUrl: text("amazon_music_url"),
  youtubeUrl: text("youtube_url"),
  // Personal data (for royalties)
  nomeCompleto: text("nome_completo"),
  cpf: text("cpf"),
  dataNascimento: text("data_nascimento"),
  // Royalties
  royaltiesData: jsonb("royalties_data"),
  // Legacy compat
  mixador: text("mixador"),
  distributor: text("distributor"),
  // Status + AI
  status: text("status").default("pending"),
  rejectionMessage: text("rejection_message"),
  aiScore: integer("ai_score"),
  aiSummary: text("ai_summary"),
  aiCriteriaUsed: jsonb("ai_criteria_used"),
  lgpdConsentAt: timestamp("lgpd_consent_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// ── Artists ───────────────────────────────────────────────────────────
export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id").references(() => labels.id),
  name: text("name").notNull(),
  email: text("email"),
  instagramHandle: text("instagram_handle"),
  tiktokHandle: text("tiktok_handle"),
  spotifyId: text("spotify_id"),
  youtubeChannel: text("youtube_channel"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Artist Socials (dados coletados via scraping) ────────────────────
export const artistSocials = pgTable("artist_socials", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").references(() => artists.id),
  platform: text("platform"),
  followers: integer("followers"),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }),
  lastPostAt: timestamp("last_post_at"),
  rawData: jsonb("raw_data"),
  collectedAt: timestamp("collected_at").defaultNow(),
});

// ── Trending Tracks ──────────────────────────────────────────────────
export const trendingTracks = pgTable("trending_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id").references(() => labels.id),
  platform: text("platform"),
  rank: integer("rank"),
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  plays: bigint("plays", { mode: "number" }),
  deltaRank: integer("delta_rank"),
  collectedAt: timestamp("collected_at").defaultNow(),
});

// ── AI Configs (critérios por gravadora) ─────────────────────────────
export const aiConfigs = pgTable("ai_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id")
    .references(() => labels.id)
    .unique(),
  criteria: jsonb("criteria").notNull(),
  model: text("model").default("google/gemini-flash-1.5"),
  promptTemplate: text("prompt_template"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Artist Posts (posts coletados das redes) ─────────────────────────
// platform: instagram | tiktok | youtube | spotify | news | twitter
// post_type: post | reel | video | track | mention | news | story
export const artistPosts = pgTable("artist_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  labelId: uuid("label_id")
    .references(() => labels.id, { onDelete: "cascade" })
    .notNull(),
  platform: text("platform").notNull(),
  postType: text("post_type").notNull(),
  externalId: text("external_id"),
  content: text("content"),
  mediaUrl: text("media_url"),
  postUrl: text("post_url"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  views: bigint("views", { mode: "number" }),
  playCount: bigint("play_count", { mode: "number" }),
  collectedAt: timestamp("collected_at").defaultNow(),
  postedAt: timestamp("posted_at"),
});

// ── Artist Insights (alertas e insights gerados) ─────────────────────
// type: milestone | alert | trend | achievement
// severity: info | warning | success | danger
export const artistInsights = pgTable("artist_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  labelId: uuid("label_id").references(() => labels.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  platform: text("platform"),
  value: numeric("value", { precision: 12, scale: 2 }),
  delta: numeric("delta", { precision: 12, scale: 2 }),
  severity: text("severity").notNull().default("info"),
  isRead: boolean("is_read").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// ── Notifications ────────────────────────────────────────────────────
// type: new_submission | insight | scraping_complete | ai_score_ready
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id").references(() => labels.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Rate Limits ──────────────────────────────────────────────────────
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
