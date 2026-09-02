import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const NOTIFICATION_KINDS = [
  'OPPORTUNITY',
  'STAGE_CHANGE',
  'VERIFICATION_RESULT',
  'INVITATION',
] as const;

export const NotificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const NotificationDtoSchema = z.object({
  notificationId: UuidSchema,
  kind: NotificationKindSchema,
  title: z.string(),
  body: z.string(),
  linkUrl: z.string().url().nullable(),
  readAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

export const ListNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationDtoSchema),
  unreadCount: z.number().int().min(0),
});
export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>;
