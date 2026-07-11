import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import {
  SocketContext,
  SendMessagePayload,
} from '@/modules/chatbot/interfaces/chat-gateway.interface';
import { ChatService } from './chat.service';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  private readonly socketsByConversation = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly widgetSessionService: WidgetSessionService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly chatRateLimitGuard: ChatRateLimitGuard,
  ) {}

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  handleConnection(client: Socket) {
    const auth = client.handshake.auth;
    const token =
      (auth.token as string | undefined) ||
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: missing token`);
      client.disconnect();
      return;
    }

    // Visitor (widget) flow — same signed session token as the HTTP guard.
    try {
      const payload = this.widgetSessionService.verify(token);
      const conversationId = auth.conversationId as string | undefined;
      const ctx: SocketContext = {
        kind: 'visitor',
        businessId: payload.businessId,
        channelId: payload.channelId,
        visitorFingerprint: payload.visitorFingerprint,
        conversationId,
      };
      client.data = ctx;
      void client.join(`channel:${payload.channelId}`);
      if (conversationId) this.attachToConversation(client, conversationId);
      return;
    } catch {
      // Not a widget session token — fall through to the agent JWT check.
    }

    // Agent (dashboard) flow — staff JWT required.
    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        business_id?: string;
      }>(token);
      const businessId = payload.business_id || payload.sub;
      if (!businessId) {
        client.disconnect();
        return;
      }
      const ctx: SocketContext = {
        kind: 'agent',
        businessId,
        agentId: businessId,
      };
      client.data = ctx;
      void client.join(`business:${businessId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const ctx = client.data as SocketContext | undefined;
    if (!ctx?.conversationId) return;
    const set = this.socketsByConversation.get(ctx.conversationId);
    if (!set) return;
    set.delete(client.id);
    if (set.size === 0) this.socketsByConversation.delete(ctx.conversationId);
  }

  // ─── Conversation membership ───────────────────────────────────────────────

  private attachToConversation(client: Socket, conversationId: string) {
    const ctx = client.data as SocketContext;
    ctx.conversationId = conversationId;

    void client.join(`conversation:${conversationId}`);
    let set = this.socketsByConversation.get(conversationId);
    if (!set) {
      set = new Set();
      this.socketsByConversation.set(conversationId, set);
    }
    set.add(client.id);
  }

  /** Visitor calls this once it has a conversation_id (after the first /chat reply). */
  @SubscribeMessage('conversation:identify')
  handleIdentify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) return { ok: false, error: 'missing id' };
    this.attachToConversation(client, payload.conversationId);
    return { ok: true, room: `conversation:${payload.conversationId}` };
  }

  /** Agent joins a conversation room to see live messages. */
  @SubscribeMessage('conversation:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const ctx = client.data as SocketContext;
    if (ctx.kind !== 'agent') return { ok: false, error: 'forbidden' };
    if (!payload?.conversationId) return { ok: false, error: 'missing id' };
    this.attachToConversation(client, payload.conversationId);
    return { ok: true, room: `conversation:${payload.conversationId}` };
  }

  @SubscribeMessage('conversation:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!payload?.conversationId) return { ok: false };
    void client.leave(`conversation:${payload.conversationId}`);
    const set = this.socketsByConversation.get(payload.conversationId);
    set?.delete(client.id);
    if (set && set.size === 0) {
      this.socketsByConversation.delete(payload.conversationId);
    }
    const ctx = client.data as SocketContext;
    if (ctx.conversationId === payload.conversationId) {
      ctx.conversationId = undefined;
    }
    return { ok: true };
  }

  // ─── Visitor-initiated chat (replaces the old REST /chat/chat + lead-capture) ──

  @SubscribeMessage('conversation:send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<{
    ok: boolean;
    conversationId?: string;
    pending?: boolean;
    error?: string;
  }> {
    const ctx = client.data as SocketContext;
    if (ctx.kind !== 'visitor') return { ok: false, error: 'forbidden' };

    const message = payload?.message;
    if (
      typeof message !== 'string' ||
      message.length < 1 ||
      message.length > 4000
    ) {
      return { ok: false, error: 'invalid_message' };
    }

    try {
      await this.chatRateLimitGuard.consume(
        ctx.channelId!,
        ctx.visitorFingerprint!,
      );
    } catch {
      return { ok: false, error: 'rate_limited' };
    }

    const hadConversation = !!ctx.conversationId;

    try {
      const response = await this.chatService.processChat(
        {
          message,
          conversation_id: payload.conversationId,
          channel: 'web',
          visitor: payload.visitor,
        },
        this.toWidgetSessionPayload(ctx),
        client.handshake.address,
      );

      if (!hadConversation) {
        this.attachToConversation(client, response.conversation_id);
      }

      return {
        ok: true,
        conversationId: response.conversation_id,
        pending: response.pending,
      };
    } catch (e) {
      this.logger.warn(`send-message failed: ${(e as Error).message}`);
      return { ok: false, error: 'processing_failed' };
    }
  }

  @SubscribeMessage('conversation:capture-lead')
  async handleCaptureLead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CaptureLeadPayload,
  ): Promise<{ ok: boolean; contactId?: string; error?: string }> {
    const ctx = client.data as SocketContext;
    if (ctx.kind !== 'visitor') return { ok: false, error: 'forbidden' };

    if (!payload?.name || (!payload.email && !payload.phone)) {
      return { ok: false, error: 'invalid_payload' };
    }

    try {
      const result = await this.chatService.captureLead(
        {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          conversation_id: payload.conversationId,
        },
        this.toWidgetSessionPayload(ctx),
      );

      this.emitLeadCaptured(ctx.businessId, result.contactId, payload.name);

      return { ok: true, contactId: result.contactId };
    } catch (e) {
      this.logger.warn(`capture-lead failed: ${(e as Error).message}`);
      return { ok: false, error: 'processing_failed' };
    }
  }

  /** Adapts a visitor socket's context to the payload shape processChat/captureLead expect. */
  private toWidgetSessionPayload(ctx: SocketContext): WidgetSessionPayload {
    return {
      businessId: ctx.businessId,
      channelId: ctx.channelId!,
      visitorFingerprint: ctx.visitorFingerprint!,
      iat: 0,
      exp: 0,
    };
  }

  // ─── Helpers used by ChatService ───────────────────────────────────────────

  /** Returns the socket ids currently attached to a conversation. */
  getSocketsForConversation(conversationId: string): string[] {
    const set = this.socketsByConversation.get(conversationId);
    return set ? [...set] : [];
  }

  emitNewMessage(
    businessId: string,
    conversationId: string,
    message: string,
    role: 'user' | 'assistant' | 'agent',
  ) {
    const payload = {
      conversation_id: conversationId,
      message,
      role,
      timestamp: new Date().toISOString(),
    };
    void this.server
      .to(`conversation:${conversationId}`)
      .to(`business:${businessId}`)
      .emit('conversation:new-message', payload);
  }

  emitLeadCaptured(businessId: string, contactId: string, name: string) {
    void this.server
      .to(`business:${businessId}`)
      .emit('conversation:lead-captured', {
        contact_id: contactId,
        name,
        timestamp: new Date().toISOString(),
      });
  }

  emitConversationStatusChanged(
    businessId: string,
    conversationId: string,
    status: string,
  ) {
    const payload = {
      conversation_id: conversationId,
      status,
      timestamp: new Date().toISOString(),
    };
    void this.server
      .to(`conversation:${conversationId}`)
      .to(`business:${businessId}`)
      .emit('conversation:status-changed', payload);
  }
}
