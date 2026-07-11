const DEFAULT_CDN_URL = 'https://cdn.zyntra.app/widget/v1.js';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * The widget only needs the public key to boot: it exchanges it for a
 * session token + full personalization config via GET /chat/public-config.
 * Position/color/name/greeting live in channel.config and must not be
 * duplicated into the embed snippet.
 */
export function buildEmbedSnippet(params: {
  publicKey: string;
  cdnUrl?: string;
}): string {
  const cdnUrl = params.cdnUrl ?? process.env.WIDGET_CDN_URL ?? DEFAULT_CDN_URL;

  return `<script src="${escapeAttr(cdnUrl)}" data-public-key="${escapeAttr(params.publicKey)}" defer></script>`;
}
