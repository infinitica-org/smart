import { z, IsoDateTimeSchema, UuidSchema } from './common.js';

/** COM-01 — direct messaging between students, employers and university advisors (Th6-422 to Th6-430). */

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_SEARCH_MIN_LENGTH = 2;
export const MESSAGE_SEARCH_MAX_LENGTH = 100;
export const ADMIN_ACCESS_REASON_MIN_LENGTH = 10;
export const ADMIN_ACCESS_REASON_MAX_LENGTH = 500;
/** Messages shown on each side of a reported message in the moderation snapshot. */
export const MODERATION_CONTEXT_MESSAGES = 10;

export const CONVERSATION_PARTICIPANT_ROLES = ['STUDENT', 'EMPLOYER', 'ADVISOR'] as const;
export const ConversationParticipantRoleSchema = z.enum(CONVERSATION_PARTICIPANT_ROLES);
export type ConversationParticipantRole = z.infer<typeof ConversationParticipantRoleSchema>;

/** Trimmed, never whitespace-only, never longer than the limit. */
export const MessageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message first.')
  .max(MESSAGE_MAX_LENGTH, `Messages can be at most ${MESSAGE_MAX_LENGTH} characters.`);

/* --------------------------- the one contact-rules decision --------------------------- */

export const CONTACT_REASON_CODES = [
  'OK',
  'BLOCKED',
  'EMPLOYER_NOT_VERIFIED',
  'EMPLOYER_CONTACT_DISABLED',
  'ADVISOR_OUT_OF_SCOPE',
  'PAIR_NOT_ALLOWED',
  'RATE_LIMITED',
  'NOT_A_PARTICIPANT',
] as const;
export const ContactReasonCodeSchema = z.enum(CONTACT_REASON_CODES);
export type ContactReasonCode = z.infer<typeof ContactReasonCodeSchema>;

export const ContactDecisionSchema = z.object({
  allowed: z.boolean(),
  reasonCode: ContactReasonCodeSchema,
  message: z.string(),
});
export type ContactDecision = z.infer<typeof ContactDecisionSchema>;

/* ------------------------------------ Th6-422 ------------------------------------ */

/** Start a conversation. An employer may name the applicant instead of the student's user id. */
export const StartConversationRequestSchema = z
  .object({
    recipientId: UuidSchema.optional(),
    applicationId: UuidSchema.optional(),
    body: MessageBodySchema,
  })
  .refine((v) => (v.recipientId === undefined) !== (v.applicationId === undefined), {
    message: 'Name exactly one of recipientId or applicationId.',
    path: ['recipientId'],
  });
export type StartConversationRequest = z.infer<typeof StartConversationRequestSchema>;

export const SendMessageRequestSchema = z.object({ body: MessageBodySchema });
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const MessageSchema = z.object({
  id: UuidSchema,
  conversationId: UuidSchema,
  senderId: UuidSchema,
  /** Empty once the sender deleted it; `deleted` says why. */
  body: z.string(),
  deleted: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageResponseSchema = z.object({
  conversationId: UuidSchema,
  message: MessageSchema,
});
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

export const ListMessagesQuerySchema = z.object({
  /** Older-than cursor: the `nextCursor` of the previous page. */
  cursor: z.string().min(1).max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

/** Oldest first within the page; `nextCursor` loads the page before it. */
export const ListMessagesResponseSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
});
export type ListMessagesResponse = z.infer<typeof ListMessagesResponseSchema>;

/* ------------------------------------ Th6-424 ------------------------------------ */

export const ConversationCounterpartSchema = z.object({
  userId: UuidSchema,
  name: z.string(),
  role: ConversationParticipantRoleSchema,
  /** Company or institution the person speaks for, when there is one. */
  orgName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type ConversationCounterpart = z.infer<typeof ConversationCounterpartSchema>;

export const ConversationSummarySchema = z.object({
  id: UuidSchema,
  counterpart: ConversationCounterpartSchema,
  lastMessage: z
    .object({ body: z.string(), senderId: UuidSchema, createdAt: IsoDateTimeSchema })
    .nullable(),
  lastMessageAt: IsoDateTimeSchema,
  unreadCount: z.number().int().min(0),
  muted: z.boolean(),
  /** False when either side blocked the other: the thread is read-only. */
  canSend: z.boolean(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ListConversationsQuerySchema = z.object({
  cursor: z.string().min(1).max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;

export const ListConversationsResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ListConversationsResponse = z.infer<typeof ListConversationsResponseSchema>;

/* ------------------------------------ Th6-425 ------------------------------------ */

export const SearchMessagesQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(MESSAGE_SEARCH_MIN_LENGTH, `Type at least ${MESSAGE_SEARCH_MIN_LENGTH} characters.`)
    .max(MESSAGE_SEARCH_MAX_LENGTH),
  cursor: z.string().min(1).max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchMessagesQuery = z.infer<typeof SearchMessagesQuerySchema>;

export const MessageSearchHitSchema = z.object({
  messageId: UuidSchema,
  conversationId: UuidSchema,
  /** Plain text with the matches wrapped in <mark>…</mark>; render it escaped, then re-add the marks. */
  snippet: z.string(),
  counterpartName: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type MessageSearchHit = z.infer<typeof MessageSearchHitSchema>;

export const SearchMessagesResponseSchema = z.object({
  hits: z.array(MessageSearchHitSchema),
  nextCursor: z.string().nullable(),
});
export type SearchMessagesResponse = z.infer<typeof SearchMessagesResponseSchema>;

/* ------------------------------------ Th6-426 ------------------------------------ */

export const UnreadCountResponseSchema = z.object({ count: z.number().int().min(0) });
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

export const MarkReadResponseSchema = z.object({
  conversationId: UuidSchema,
  lastReadAt: IsoDateTimeSchema,
});
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;

export const MuteConversationRequestSchema = z.object({ muted: z.boolean() });
export type MuteConversationRequest = z.infer<typeof MuteConversationRequestSchema>;

export const MuteConversationResponseSchema = z.object({
  conversationId: UuidSchema,
  muted: z.boolean(),
});
export type MuteConversationResponse = z.infer<typeof MuteConversationResponseSchema>;

/* ------------------------------------ Th6-427 ------------------------------------ */

export const BlockUserRequestSchema = z.object({ userId: UuidSchema });
export type BlockUserRequest = z.infer<typeof BlockUserRequestSchema>;

export const BlockedUserSchema = z.object({
  userId: UuidSchema,
  name: z.string(),
  blockedAt: IsoDateTimeSchema,
});
export type BlockedUser = z.infer<typeof BlockedUserSchema>;

export const ListBlocksResponseSchema = z.object({ blocks: z.array(BlockedUserSchema) });
export type ListBlocksResponse = z.infer<typeof ListBlocksResponseSchema>;

export const DeleteMessageResponseSchema = z.object({
  messageId: UuidSchema,
  deleted: z.literal(true),
});
export type DeleteMessageResponse = z.infer<typeof DeleteMessageResponseSchema>;

/* ------------------------------------ Th6-430 ------------------------------------ */

export const AdminConversationQuerySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(
      ADMIN_ACCESS_REASON_MIN_LENGTH,
      `Give a reason (at least ${ADMIN_ACCESS_REASON_MIN_LENGTH} characters).`,
    )
    .max(ADMIN_ACCESS_REASON_MAX_LENGTH),
});
export type AdminConversationQuery = z.infer<typeof AdminConversationQuerySchema>;

export const AdminConversationMessageSchema = MessageSchema.extend({
  senderName: z.string(),
  /** Soft-deleted by the sender but preserved under a moderation hold. */
  deletedByParticipant: z.boolean(),
  reported: z.boolean(),
});
export type AdminConversationMessage = z.infer<typeof AdminConversationMessageSchema>;

export const AdminConversationViewSchema = z.object({
  reportId: UuidSchema,
  conversationId: UuidSchema,
  reportedMessageId: UuidSchema,
  reportReason: z.string(),
  participants: z.array(
    z.object({
      userId: UuidSchema,
      name: z.string(),
      role: ConversationParticipantRoleSchema,
      orgName: z.string().nullable(),
    }),
  ),
  messages: z.array(AdminConversationMessageSchema),
  /** Always true: this view can not send, edit or delete. */
  readOnly: z.literal(true),
});
export type AdminConversationView = z.infer<typeof AdminConversationViewSchema>;
