import { buildEmbedSnippet } from '@/modules/channels/utils/embed-snippet.util';

describe('buildEmbedSnippet()', () => {
  afterEach(() => {
    delete process.env.WIDGET_CDN_URL;
  });

  it('produces the expected tag with channel-id, business-id and defer', () => {
    const snippet = buildEmbedSnippet({
      channelId: 'chan-1',
      businessId: 'biz-1',
    });

    expect(snippet).toBe(
      '<script src="https://cdn.zyntra.app/widget/v1.js" ' +
        'data-channel-id="chan-1" data-business-id="biz-1" defer></script>',
    );
  });

  it('places data-channel-id before data-business-id', () => {
    const snippet = buildEmbedSnippet({
      channelId: 'chan-1',
      businessId: 'biz-1',
    });

    expect(snippet.indexOf('data-channel-id')).toBeLessThan(
      snippet.indexOf('data-business-id'),
    );
  });

  it('uses WIDGET_CDN_URL env var when set, over the default', () => {
    process.env.WIDGET_CDN_URL = 'https://cdn.example.com/w.js';

    const snippet = buildEmbedSnippet({ channelId: 'c', businessId: 'b' });

    expect(snippet).toContain('src="https://cdn.example.com/w.js"');
  });

  it('accepts an explicit cdnUrl param, taking priority over the env var', () => {
    process.env.WIDGET_CDN_URL = 'https://cdn.example.com/w.js';

    const snippet = buildEmbedSnippet({
      channelId: 'c',
      businessId: 'b',
      cdnUrl: 'https://custom.cdn/x.js',
    });

    expect(snippet).toContain('src="https://custom.cdn/x.js"');
  });

  it('escapes double quotes in channelId to prevent attribute breakout', () => {
    const snippet = buildEmbedSnippet({
      channelId: 'chan"onmouseover="alert(1)',
      businessId: 'biz-1',
    });

    expect(snippet).not.toContain('data-channel-id="chan"onmouseover="');
    expect(snippet).toContain(
      'data-channel-id="chan&quot;onmouseover=&quot;alert(1)"',
    );
  });

  it('escapes angle brackets and ampersands in either id', () => {
    const snippet = buildEmbedSnippet({
      channelId: '<img src=x onerror=alert(1)>',
      businessId: 'a&b',
    });

    expect(snippet).not.toContain('<img');
    expect(snippet).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(snippet).toContain('data-business-id="a&amp;b"');
  });
});
