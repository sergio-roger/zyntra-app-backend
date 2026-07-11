import { isOriginAllowed } from '@/modules/channels/utils/origin.util';

describe('isOriginAllowed()', () => {
  it('allows when allowedDomains is undefined (no restriction configured)', () => {
    expect(isOriginAllowed(undefined, 'https://evil.com')).toBe(true);
  });

  it('allows when allowedDomains is an empty array', () => {
    expect(isOriginAllowed([], 'https://evil.com')).toBe(true);
  });

  it('allows an exact domain match via Origin', () => {
    expect(isOriginAllowed(['example.com'], 'https://example.com')).toBe(true);
  });

  it('allows a subdomain of an allowed domain', () => {
    expect(isOriginAllowed(['example.com'], 'https://widget.example.com')).toBe(
      true,
    );
  });

  it('rejects a domain not present in the allowlist', () => {
    expect(isOriginAllowed(['example.com'], 'https://evil.com')).toBe(false);
  });

  it('rejects a domain that merely contains the allowed domain as a suffix without a dot', () => {
    expect(isOriginAllowed(['example.com'], 'https://notexample.com')).toBe(
      false,
    );
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(
      isOriginAllowed(
        ['example.com'],
        undefined,
        'https://example.com/widget/page',
      ),
    ).toBe(true);
  });

  it('rejects when allowedDomains is configured but neither Origin nor Referer is present', () => {
    expect(isOriginAllowed(['example.com'])).toBe(false);
  });

  it('rejects when Origin/Referer are malformed URLs', () => {
    expect(isOriginAllowed(['example.com'], 'not-a-url')).toBe(false);
  });

  it('rejects a domain present in blockedDomains even with no allowlist', () => {
    expect(
      isOriginAllowed(undefined, 'https://evil.com', undefined, ['evil.com']),
    ).toBe(false);
  });

  it('rejects a subdomain of a blocked domain', () => {
    expect(
      isOriginAllowed(undefined, 'https://widget.evil.com', undefined, [
        'evil.com',
      ]),
    ).toBe(false);
  });

  it('blockedDomains takes priority even if the domain is also allowlisted', () => {
    expect(
      isOriginAllowed(['example.com'], 'https://example.com', undefined, [
        'example.com',
      ]),
    ).toBe(false);
  });

  it('allows a domain not present in blockedDomains when there is no allowlist', () => {
    expect(
      isOriginAllowed(undefined, 'https://safe.com', undefined, [
        'evil.com',
      ]),
    ).toBe(true);
  });

  it('allowInsecureDomains bypasses both the allowlist and the blocklist', () => {
    expect(
      isOriginAllowed(
        ['example.com'],
        'https://evil.com',
        undefined,
        ['evil.com'],
        true,
      ),
    ).toBe(true);
  });

  it('allowInsecureDomains bypasses even a completely missing Origin/Referer', () => {
    expect(isOriginAllowed(['example.com'], undefined, undefined, [], true)).toBe(
      true,
    );
  });
});
