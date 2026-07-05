const DEFAULT_CDN_URL = 'https://cdn.zyntra.app/widget/v1.js';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildEmbedSnippet(params: {
  channelId: string;
  businessId: string;
  cdnUrl?: string;
}): string {
  const cdnUrl = params.cdnUrl ?? process.env.WIDGET_CDN_URL ?? DEFAULT_CDN_URL;

  return (
    `<script src="${escapeAttr(cdnUrl)}" ` +
    `data-channel-id="${escapeAttr(params.channelId)}" ` +
    `data-business-id="${escapeAttr(params.businessId)}" ` +
    `defer></script>`
  );
}
