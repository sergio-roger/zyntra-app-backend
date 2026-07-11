export interface ConversationVisitor {
  fingerprint?: string;
  ipHash?: string;
  name?: string;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
}

export interface ConversationMeta {
  handoffReason?: string;
  tags?: string[];
}
