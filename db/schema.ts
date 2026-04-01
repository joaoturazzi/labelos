import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Labels (gravadoras) ──────────────────────────────────────────────
export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkOrgId: text("clerk_org_id").unique().notNull(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Submissions (demos recebidas) ────────────────────────────────────
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  labelId: uuid("label_id").references(() => labels.id),
  artistName: text("artist_name").notNull(),
  artistEmail: text("artist_email").notNull(),
  trackTitle: text("track_title").notNull(),
  genre: text("genre"),
  bpm: integer("bpm"),
  mixador: text("mixador"),
  distributor: text("distributor"),
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  spotifyUrl: text("spotify_url"),
  youtubeUrl: text("youtube_url"),
  audioFileUrl: text("audio_file_url").notNull(),
  audioFileKey: text("audio_file_key").notNull(),
  status: text("status").default("pending"),
  aiScore: integer("ai_score"),
  aiSummary: text("ai_summary"),
  aiCriteriaUsed: jsonb("ai_criteria_used"),
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
