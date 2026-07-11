export interface WidgetSessionPayload {
  businessId: string;
  channelId: string;
  visitorFingerprint: string;
  iat: number;
  exp: number;
  /** True when resolved from the legacy business_id/channel_id body fallback instead of a signed token. */
  legacy?: boolean;
}
