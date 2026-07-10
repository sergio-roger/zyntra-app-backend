export interface IncomingMessage {
  externalRef: string;
  text: string;
  channel: string;
  rawPayload: Record<string, unknown>;
}

export interface ChannelSetupResult {
  config: Record<string, unknown>;
  embedCode?: string;
}

export interface ChannelProvider {
  /** Validate the config object against the channel-specific rules. Throws BadRequestException on failure. */
  validateConfig(config: Record<string, unknown>): void;

  /** Run any external setup (register webhook, generate snippet, etc.) and return persisted metadata. */
  setup(
    channelId: string,
    businessId: string,
    config: Record<string, unknown>,
    publicKey?: string,
  ): Promise<ChannelSetupResult>;

  /** Map an incoming raw webhook payload to a normalised IncomingMessage. */
  parseIncoming(payload: Record<string, unknown>): IncomingMessage;
}
