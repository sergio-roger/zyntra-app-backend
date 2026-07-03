import { NotImplementedException } from '@nestjs/common';
import {
  ChannelProvider,
  ChannelSetupResult,
  IncomingMessage,
} from '../interfaces/channel-provider.interface';

export class TelegramChannelProvider implements ChannelProvider {
  validateConfig(_config: Record<string, unknown>): void {
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }

  async setup(
    _channelId: string,
    _businessId: string,
    _config: Record<string, unknown>,
  ): Promise<ChannelSetupResult> {
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }

  parseIncoming(_payload: Record<string, unknown>): IncomingMessage {
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }
}
