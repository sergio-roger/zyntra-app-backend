export type ClientKind = 'agent' | 'visitor';

export interface SocketContext {
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

export interface SendMessagePayload {
  conversationId?: string;
  message: string;
  visitor?: { page_url?: string; referrer?: string; user_agent?: string };
}

export interface VisitorConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IdentifyAck {
  ok: boolean;
  room?: string;
  messages?: VisitorConversationMessage[];
  error?: string;
}
