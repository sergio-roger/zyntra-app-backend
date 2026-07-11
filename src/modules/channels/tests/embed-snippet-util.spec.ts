import { buildEmbedSnippet } from '@/modules/channels/utils/embed-snippet.util';

describe('buildEmbedSnippet()', () => {
  afterEach(() => {
    delete process.env.WIDGET_CDN_URL;
  });

  it('produces the expected tag with only src and public-key', () => {
    const snippet = buildEmbedSnippet({ publicKey: 'wpk_abc123' });

    expect(snippet).toBe(
      '<script src="https://cdn.zyntra.app/widget/v1.js" ' +
        'data-public-key="wpk_abc123" defer></script>',
    );
  });

  it('does not include position, color, name or greeting attributes', () => {
    const snippet = buildEmbedSnippet({ publicKey: 'wpk_abc123' });

    expect(snippet).not.toContain('data-position');
    expect(snippet).not.toContain('data-primary-color');
    expect(snippet).not.toContain('data-name');
    expect(snippet).not.toContain('data-greeting');
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
});
