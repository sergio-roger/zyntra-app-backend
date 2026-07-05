function hostnameFrom(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks Origin/Referer against a channel's config.allowedDomains.
 * An unset or empty allowlist means "no restriction configured" (allowed) —
 * matches WebChatChannelProvider.validateConfig, which treats allowedDomains
 * as optional. Matches exact domains and their subdomains.
 */
export function isOriginAllowed(
  allowedDomains: unknown,
  origin?: string,
  referer?: string,
): boolean {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
    return true;
  }

  const hostname = hostnameFrom(origin) ?? hostnameFrom(referer);
  if (!hostname) return false;

  return allowedDomains.some((raw) => {
    if (typeof raw !== 'string') return false;
    const domain = raw.toLowerCase();
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });
}
