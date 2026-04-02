import { z } from "zod";

export const submissionSchema = z.object({
  labelId: z.string().uuid(),
  trackTitle: z.string().min(1).max(200),
  artistName: z.string().min(2).max(100),
  artistEmail: z.string().email(),
  genre: z.string().max(200).optional().nullable(),
  bpm: z.coerce.number().int().min(40).max(300).optional().nullable(),
  compositores: z.string().max(500).optional().nullable(),
  produtor: z.string().max(100).optional().nullable(),
  engenheiroMix: z.string().max(100).optional().nullable(),
  dataLancamento: z.string().optional().nullable(),
  // Files
  audioFileUrl: z.string().min(1),
  audioFileKey: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  coverKey: z.string().optional().nullable(),
  // Social + store profiles
  instagramUrl: z.string().max(200).optional().nullable(),
  tiktokUrl: z.string().max(200).optional().nullable(),
  twitterUrl: z.string().max(200).optional().nullable(),
  facebookUrl: z.string().max(200).optional().nullable(),
  spotifyUrl: z.string().max(200).optional().nullable(),
  appleMusicUrl: z.string().max(200).optional().nullable(),
  deezerUrl: z.string().max(200).optional().nullable(),
  youtubeMusicUrl: z.string().max(200).optional().nullable(),
  amazonMusicUrl: z.string().max(200).optional().nullable(),
  youtubeUrl: z.string().max(200).optional().nullable(),
  // Personal data
  nomeCompleto: z.string().max(200).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  // Royalties
  royaltiesData: z.unknown().optional().nullable(),
  // Legacy
  mixador: z.string().max(100).optional().nullable(),
  distributor: z.string().max(100).optional().nullable(),
  // LGPD
  lgpdConsent: z.boolean().optional(),
});

export const artistSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  instagramHandle: z.string().max(50).optional().or(z.literal("")),
  tiktokHandle: z.string().max(50).optional().or(z.literal("")),
  spotifyId: z.string().max(50).optional().or(z.literal("")),
  youtubeChannel: z.string().max(200).optional().or(z.literal("")),
});

export const submissionStatusSchema = z.object({
  status: z.enum(["pending", "reviewing", "approved", "rejected"]),
  rejectionMessage: z.string().max(500).optional(),
});

export const aiConfigSchema = z.object({
  criteria: z.record(z.string(), z.unknown()),
  model: z.string().optional(),
  promptTemplate: z.string().optional().nullable(),
});

export const labelSettingsSchema = z.object({
  logoUrl: z.string().url().optional().nullable().or(z.literal("")).transform(v => v === "" ? null : v),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portalHeadline: z.string().max(200).optional().nullable(),
  portalSubtext: z.string().max(500).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  portalOpen: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
});
