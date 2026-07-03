import { NotImplementedException } from '@nestjs/common';
import {
  ChannelProvider,
  ChannelSetupResult,
  IncomingMessage,
} from '../interfaces/channel-provider.interface';

export class FacebookChannelProvider implements ChannelProvider {
  validateConfig(_config: Record<string, unknown>): void {
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }

  async setup(
    _channelId: string,
    _businessId: string,
    _config: Record<string, unknown>,
  ): Promise<ChannelSetupResult> {
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }

  parseIncoming(_payload: Record<string, unknown>): IncomingMessage {
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }
}
