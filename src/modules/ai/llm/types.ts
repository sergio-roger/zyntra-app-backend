export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: ChatUsage;
}

export interface ChatStreamChunk {
  /** Incremental content delta. */
  content?: string;
  /** True on the final chunk. */
  done?: boolean;
  /** Available on the final chunk when supported. */
  usage?: ChatUsage;
  model?: string;
  finishReason?: string;
}

/**
 * Per-request overrides — useful for BYOK or model swap from the UI.
 */
export interface ProviderOverride {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface LlmProvider {
  /** Stable identifier ('openrouter', 'anthropic', 'openai', ...). */
  readonly id: string;
  /** Default model used when the request doesn't specify one. */
  readonly defaultModel: string;

  chat(req: ChatRequest): Promise<ChatResponse>;
  chatStream(req: ChatRequest): AsyncIterable<ChatStreamChunk>;
}

export type ProviderId = 'openrouter';

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  referer?: string;
  title?: string;
}
