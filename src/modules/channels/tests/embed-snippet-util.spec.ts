import { buildEmbedSnippet } from '@/modules/channels/utils/embed-snippet.util';

describe('buildEmbedSnippet()', () => {
  afterEach(() => {
    delete process.env.WIDGET_CDN_URL;
  });

  it('produces the expected tag with public-key and defer', () => {
    const snippet = buildEmbedSnippet({ publicKey: 'wpk_abc123' });

    expect(snippet).toBe(
      '<script src="https://cdn.zyntra.app/widget/v1.js" ' +
        'data-public-key="wpk_abc123" defer></script>',
    );
  });

  it('does not include business-id or channel-id attributes', () => {
    const snippet = buildEmbedSnippet({ publicKey: 'wpk_abc123' });

    expect(snippet).not.toContain('data-business-id');
    expect(snippet).not.toContain('data-channel-id');
  });

  it('uses WIDGET_CDN_URL env var when set, over the default', () => {
    process.env.WIDGET_CDN_URL = 'https://cdn.example.com/w.js';

    const snippet = buildEmbedSnippet({ publicKey: 'wpk_x' });

    expect(snippet).toContain('src="https://cdn.example.com/w.js"');
  });

  it('accepts an explicit cdnUrl param, taking priority over the env var', () => {
    process.env.WIDGET_CDN_URL = 'https://cdn.example.com/w.js';

    const snippet = buildEmbedSnippet({
      publicKey: 'wpk_x',
      cdnUrl: 'https://custom.cdn/x.js',
    });

    expect(snippet).toContain('src="https://custom.cdn/x.js"');
  });

  it('escapes double quotes in publicKey to prevent attribute breakout', () => {
    const snippet = buildEmbedSnippet({
      publicKey: 'wpk"onmouseover="alert(1)',
    });

    expect(snippet).not.toContain('data-public-key="wpk"onmouseover="');
    expect(snippet).toContain(
      'data-public-key="wpk&quot;onmouseover=&quot;alert(1)"',
    );
  });

  it('escapes angle brackets and ampersands in the greeting', () => {
    const snippet = buildEmbedSnippet({
      publicKey: 'wpk_x',
      greeting: '<img src=x onerror=alert(1)> & hola',
    });

    expect(snippet).not.toContain('<img');
    expect(snippet).toContain(
      'data-greeting="&lt;img src=x onerror=alert(1)&gt; &amp; hola"',
    );
  });
});
