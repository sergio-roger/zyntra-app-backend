import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ChannelProvider,
  ChannelSetupResult,
  IncomingMessage,
} from '@/modules/channels/interfaces/channel-provider.interface';
import { buildEmbedSnippet } from '@/modules/channels/utils/embed-snippet.util';

const VALID_POSITIONS = ['bottom-left', 'bottom-right'] as const;
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const DOMAIN_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

@Injectable()
export class WebChatChannelProvider implements ChannelProvider {
  validateConfig(config: Record<string, unknown>): void {
    const errors: string[] = [];

    const { position, primaryColor, allowedDomains } = config as {
      position?: string;
      primaryColor?: string;
      allowedDomains?: unknown;
    };

    if (
      position !== undefined &&
      !VALID_POSITIONS.includes(position as (typeof VALID_POSITIONS)[number])
    ) {
      errors.push(`position debe ser uno de: ${VALID_POSITIONS.join(', ')}`);
    }

    if (primaryColor !== undefined && !HEX_COLOR_RE.test(primaryColor)) {
      errors.push(
        'primaryColor debe ser un color hex válido (ej. #6366f1 o #fff)',
      );
    }

    if (allowedDomains !== undefined) {
      if (!Array.isArray(allowedDomains)) {
        errors.push('allowedDomains debe ser un array');
      } else {
        const invalid = (allowedDomains as unknown[]).filter(
          (d) => typeof d !== 'string' || !DOMAIN_RE.test(d as string),
        );
        if (invalid.length > 0) {
          errors.push(
            `allowedDomains contiene dominios inválidos: ${invalid.join(', ')}`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  async setup(
    channelId: string,
    businessId: string,
    config: Record<string, unknown>,
    publicKey?: string,
  ): Promise<ChannelSetupResult> {
    await Promise.resolve();
    const position = (config.position as string | undefined) ?? 'bottom-right';
    const primaryColor =
      (config.primaryColor as string | undefined) ?? '#6366f1';
    const assistantName =
      (config.assistantName as string | undefined) ?? 'Asistente';
    const greeting = (config.greeting as string | undefined) ?? '';

    const resolvedConfig = {
      ...config,
      position,
      primaryColor,
      assistantName,
      greeting,
    };

    const embedCode = publicKey ? buildEmbedSnippet({ publicKey }) : undefined;

    return { config: resolvedConfig, embedCode };
  }

  parseIncoming(payload: Record<string, unknown>): IncomingMessage {
    return {
      externalRef:
        (payload['visitor'] as { fingerprint?: string })?.fingerprint ??
        'anonymous',
      text: (payload['message'] as string) ?? '',
      channel: 'web_chat',
      rawPayload: payload,
    };
  }
}
