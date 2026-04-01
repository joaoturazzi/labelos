import { z } from "zod";

export const submissionSchema = z.object({
  labelId: z.string().uuid(),
  artistName: z.string().min(2).max(100),
  artistEmail: z.string().email(),
  trackTitle: z.string().min(1).max(200),
  genre: z
    .enum(["Funk", "Trap", "Pagode", "Sertanejo", "Pop", "R&B", "Rock", "Outro"])
    .optional()
    .nullable(),
  bpm: z.coerce.number().int().min(40).max(300).optional().nullable(),
  mixador: z.string().max(100).optional().nullable(),
  distributor: z.string().max(100).optional().nullable(),
  instagramUrl: z.string().max(200).optional().nullable(),
  tiktokUrl: z.string().max(200).optional().nullable(),
  spotifyUrl: z.string().max(200).optional().nullable(),
  youtubeUrl: z.string().max(200).optional().nullable(),
  audioFileUrl: z.string().url(),
  audioFileKey: z.string().min(1),
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
  logoUrl: z.string().url().optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portalHeadline: z.string().max(200).optional().nullable(),
  portalSubtext: z.string().max(500).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
});
