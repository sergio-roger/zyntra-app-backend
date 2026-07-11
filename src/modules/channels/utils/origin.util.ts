function hostnameFrom(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesDomain(hostname: string, raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const domain = raw.toLowerCase();
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Checks Origin/Referer against a channel's allowed/blocked domain config.
 *
 * - `allowInsecureDomains: true` bypasses both lists entirely (any origin is
 *   allowed) — this must win over everything else.
 * - Otherwise `blockedDomains` is checked first: a match rejects regardless
 *   of the allowlist.
 * - An unset/empty allowlist means "no restriction configured" (allowed) —
 *   matches WebChatChannelProvider.validateConfig, which treats allowedDomains
 *   as optional.
 * - Matches exact domains and their subdomains.
 */
export function isOriginAllowed(
  allowedDomains: unknown,
  origin?: string,
  referer?: string,
  blockedDomains?: unknown,
  allowInsecureDomains?: boolean,
): boolean {
  if (allowInsecureDomains) return true;

  const allowed = Array.isArray(allowedDomains) ? allowedDomains : [];
  const blocked = Array.isArray(blockedDomains) ? blockedDomains : [];

  if (allowed.length === 0 && blocked.length === 0) {
    return true;
  }

  const hostname = hostnameFrom(origin) ?? hostnameFrom(referer);
  if (!hostname) return false;

  if (blocked.some((raw) => matchesDomain(hostname, raw))) {
    return false;
  }

  if (allowed.length === 0) return true;

  return allowed.some((raw) => matchesDomain(hostname, raw));
}
