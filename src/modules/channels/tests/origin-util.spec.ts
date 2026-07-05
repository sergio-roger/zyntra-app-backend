import { isOriginAllowed } from '@/modules/channels/utils/origin.util';

describe('isOriginAllowed()', () => {
  it('allows when allowedDomains is undefined (no restriction configured)', () => {
    expect(isOriginAllowed(undefined, 'https://evil.com')).toBe(true);
  });

  it('allows when allowedDomains is an empty array', () => {
    expect(isOriginAllowed([], 'https://evil.com')).toBe(true);
  });

  it('allows an exact domain match via Origin', () => {
    expect(isOriginAllowed(['example.com'], 'https://example.com')).toBe(
      true,
    );
  });

  it('allows a subdomain of an allowed domain', () => {
    expect(
      isOriginAllowed(['example.com'], 'https://widget.example.com'),
    ).toBe(true);
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
});
