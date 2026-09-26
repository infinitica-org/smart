import { z } from 'zod';
import { ProfileSectionSchema, UsernameStatusSchema } from '../domain/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * CN-T09 — case-insensitive username reservation. 3-30 chars, letters/digits/underscore
 * only; the server lowercases + trims before checking uniqueness and the blocked-word list.
 */
export const ReserveUsernameRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be at most 30 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.'),
});
export type ReserveUsernameRequest = z.infer<typeof ReserveUsernameRequestSchema>;

export const UsernameStatusResponseSchema = z.object({
  username: z.string().nullable(),
  status: UsernameStatusSchema.nullable(),
  reservedAt: IsoDateTimeSchema.nullable(),
  activatedAt: IsoDateTimeSchema.nullable(),
});
export type UsernameStatusResponse = z.infer<typeof UsernameStatusResponseSchema>;

/**
 * CN-T09 — "Global visibility on/off only": no per-item toggles. `showInProgressItems`
 * is opt-in and only takes effect once `profileVisible` is on.
 * T6 — `hiddenSections` allows hiding specific sections from public view.
 */
export const UpdateProfileVisibilityRequestSchema = z.object({
  profileVisible: z.boolean(),
  showInProgressItems: z.boolean().optional(),
  hiddenSections: z.array(ProfileSectionSchema).optional(),
});
export type UpdateProfileVisibilityRequest = z.infer<typeof UpdateProfileVisibilityRequestSchema>;

export const ProfileVisibilityResponseSchema = z.object({
  profileVisible: z.boolean(),
  showInProgressItems: z.boolean(),
  hiddenSections: z.array(z.string()).default([]),
});
export type ProfileVisibilityResponse = z.infer<typeof ProfileVisibilityResponseSchema>;

/** CN-T09 — super-admin-curated blocked-word list; entries are always stored normalized (lowercased/trimmed). */
export const BlockedWordDtoSchema = z.object({
  id: UuidSchema,
  word: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type BlockedWordDto = z.infer<typeof BlockedWordDtoSchema>;

export const CreateBlockedWordRequestSchema = z.object({
  word: z.string().trim().min(2).max(50),
});
export type CreateBlockedWordRequest = z.infer<typeof CreateBlockedWordRequestSchema>;

export const ListBlockedWordsResponseSchema = z.object({
  words: z.array(BlockedWordDtoSchema),
});
export type ListBlockedWordsResponse = z.infer<typeof ListBlockedWordsResponseSchema>;
