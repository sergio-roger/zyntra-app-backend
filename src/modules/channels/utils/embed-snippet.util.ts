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
  position?: string;
  primaryColor?: string;
  name?: string;
  greeting?: string;
}): string {
  const cdnUrl = params.cdnUrl ?? process.env.WIDGET_CDN_URL ?? DEFAULT_CDN_URL;

  const attrs = [
    `data-channel-id="${escapeAttr(params.channelId)}"`,
    `data-business-id="${escapeAttr(params.businessId)}"`,
  ];
  if (params.position !== undefined) {
    attrs.push(`data-position="${escapeAttr(params.position)}"`);
  }
  if (params.primaryColor !== undefined) {
    attrs.push(`data-primary-color="${escapeAttr(params.primaryColor)}"`);
  }
  if (params.name !== undefined) {
    attrs.push(`data-name="${escapeAttr(params.name)}"`);
  }
  if (params.greeting !== undefined) {
    attrs.push(`data-greeting="${escapeAttr(params.greeting)}"`);
  }

  return `<script src="${escapeAttr(cdnUrl)}" ${attrs.join(' ')} defer></script>`;
}
