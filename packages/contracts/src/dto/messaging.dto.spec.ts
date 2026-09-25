import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AdminConversationQuerySchema,
  CreateReportRequestSchema,
  MESSAGE_MAX_LENGTH,
  MessageBodySchema,
  SearchMessagesQuerySchema,
  SendMessageRequestSchema,
  StartConversationRequestSchema,
} from '../index.js';

describe('COM-01 messaging contracts', () => {
  describe('message body (Th6-422)', () => {
    it('trims the text', () => {
      expect(MessageBodySchema.parse('  hello  ')).toBe('hello');
    });
    it('rejects empty and whitespace-only bodies', () => {
      expect(SendMessageRequestSchema.safeParse({ body: '' }).success).toBe(false);
      expect(SendMessageRequestSchema.safeParse({ body: '   \n\t ' }).success).toBe(false);
    });
    it('rejects a body over the limit but accepts exactly the limit', () => {
      expect(MessageBodySchema.safeParse('x'.repeat(MESSAGE_MAX_LENGTH + 1)).success).toBe(false);
      expect(MessageBodySchema.safeParse('x'.repeat(MESSAGE_MAX_LENGTH)).success).toBe(true);
    });
  });

  describe('starting a conversation', () => {
    it('needs exactly one of recipientId or applicationId', () => {
      const id = randomUUID();
      expect(
        StartConversationRequestSchema.safeParse({ recipientId: id, body: 'hi' }).success,
      ).toBe(true);
      expect(
        StartConversationRequestSchema.safeParse({ applicationId: id, body: 'hi' }).success,
      ).toBe(true);
      expect(StartConversationRequestSchema.safeParse({ body: 'hi' }).success).toBe(false);
      expect(
        StartConversationRequestSchema.safeParse({ recipientId: id, applicationId: id, body: 'hi' })
          .success,
      ).toBe(false);
    });
  });

  describe('search (Th6-425)', () => {
    it('rejects a query shorter than 2 characters and longer than 100', () => {
      expect(SearchMessagesQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
      expect(SearchMessagesQuerySchema.safeParse({ q: ' a ' }).success).toBe(false);
      expect(SearchMessagesQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
      expect(SearchMessagesQuerySchema.safeParse({ q: 'ab' }).success).toBe(true);
    });
  });

  describe('reporting a message (Th6-427)', () => {
    it('accepts a MESSAGE target', () => {
      expect(
        CreateReportRequestSchema.safeParse({
          targetType: 'MESSAGE',
          targetId: randomUUID(),
          reason: 'SCAM',
        }).success,
      ).toBe(true);
    });
  });

  describe('admin conversation access (Th6-430)', () => {
    it('requires a reason of at least 10 characters', () => {
      expect(AdminConversationQuerySchema.safeParse({}).success).toBe(false);
      expect(AdminConversationQuerySchema.safeParse({ reason: 'too short' }).success).toBe(false);
      expect(
        AdminConversationQuerySchema.safeParse({ reason: 'Investigating a scam report' }).success,
      ).toBe(true);
    });
  });
});
