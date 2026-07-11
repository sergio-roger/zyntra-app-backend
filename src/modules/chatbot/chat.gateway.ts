import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';

type ClientKind = 'agent' | 'visitor';

interface SocketContext {
  kind: ClientKind;
  /** Tenant the socket belongs to. */
  businessId: string;
  /** Channel the visitor's widget session is scoped to (visitors only). */
  channelId?: string;
  /** Anonymous visitor identity from the signed widget session (visitors only). */
  visitorFingerprint?: string;
  /** Set for visitors as soon as they identify a conversation. */
  conversationId?: string;
  /** Business id from JWT (agents only). */
  agentId?: string;
}

/**
 * Single gateway for both authenticated agents (dashboard) and anonymous
 * widget visitors.
 *
 * Rooms:
 *   business:{id}        → agents of a business + visitors of it (for list refresh)
 *   channel:{id}         → visitors of a specific channel, joined when channelId is
 *                          provided (prevents two web widgets of the same business
 *                          from crossing messages once events are scoped to it)
 *   conversation:{id}    → both ends of a single conversation (visitor + agents)
 *
 * Each socket carries a SocketContext in `socket.data` so we can route events
 * without scanning maps.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  /** conversationId → set of socket ids participating. */
  private readonly socketsByConversation = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly widgetSessionService: WidgetSessionService,
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
      void client.join(`business:${payload.businessId}`);
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
      .emit('conversation:new-message', payload);
    void this.server
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
      .emit('conversation:status-changed', payload);
    void this.server
      .to(`business:${businessId}`)
      .emit('conversation:status-changed', payload);
  }
}
