import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  BlockUserRequestSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  MuteConversationRequestSchema,
  SearchMessagesQuerySchema,
  SendMessageRequestSchema,
  StartConversationRequestSchema,
  UuidSchema,
} from '@smart/contracts';
import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { BlocksService } from './blocks.service.js';
import { MESSAGING_ROLES } from './messaging.constants.js';
import { MessagingService } from './messaging.service.js';

/** A malformed id can never name a conversation, message or report the caller may see. */
function id(value: string, what = 'Conversation') {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new NotFoundException({
      error: 'not_found',
      message: `${what} not found.`,
      statusCode: 404,
    });
  }
  return parsed.data;
}

const clean = (query: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])));

@ApiTags('messaging')
@ApiBearerAuth()
@Controller(API_PREFIX)
@Roles(...MESSAGING_ROLES)
export class MessagingController {
  constructor(
    @Inject(MessagingService) private readonly messaging: MessagingService,
    @Inject(BlocksService) private readonly blocks: BlocksService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Start a conversation, or add to the one that already exists.' })
  start(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.messaging.start(user.sub, {
      key: IdempotencyService.requireKey(key),
      body: StartConversationRequestSchema.parse(body),
    });
  }

  @Get('conversations')
  list(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.messaging.listConversations(
      user.sub,
      ListConversationsQuerySchema.parse(clean(query)),
    );
  }

  @Put('conversations/:id/mute')
  mute(@CurrentUser() user: RequestUser, @Param('id') convId: string, @Body() body: unknown) {
    return this.messaging.setMuted(
      user.sub,
      id(convId),
      MuteConversationRequestSchema.parse(body).muted,
    );
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() user: RequestUser, @Param('id') convId: string) {
    return this.messaging.markRead(user.sub, id(convId));
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: RequestUser,
    @Param('id') convId: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.messaging.send(user.sub, id(convId), {
      key: IdempotencyService.requireKey(key),
      body: SendMessageRequestSchema.parse(body),
    });
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentUser() user: RequestUser,
    @Param('id') convId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.messaging.listMessages(
      user.sub,
      id(convId),
      ListMessagesQuerySchema.parse(clean(query)),
    );
  }

  @Delete('conversations/:id/messages/:messageId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id') convId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messaging.deleteMessage(user.sub, id(convId), id(messageId, 'Message'));
  }

  @Get('messages/search')
  search(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.messaging.search(user.sub, SearchMessagesQuerySchema.parse(clean(query)));
  }

  @Get('me/unread-count')
  unread(@CurrentUser() user: RequestUser) {
    return this.messaging.unreadCount(user.sub);
  }

  @Post('blocks')
  block(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.blocks.block(user.sub, BlockUserRequestSchema.parse(body).userId);
  }

  @Delete('blocks/:userId')
  unblock(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.blocks.unblock(user.sub, id(userId, 'User'));
  }

  @Get('blocks')
  listBlocks(@CurrentUser() user: RequestUser) {
    return this.blocks.list(user.sub);
  }
}
