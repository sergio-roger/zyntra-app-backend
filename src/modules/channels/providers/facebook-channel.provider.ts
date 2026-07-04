import { NotImplementedException } from '@nestjs/common';
import {
  ChannelProvider,
  ChannelSetupResult,
  IncomingMessage,
} from '../interfaces/channel-provider.interface';

export class FacebookChannelProvider implements ChannelProvider {
  validateConfig(): void {
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }

  async setup(): Promise<ChannelSetupResult> {
    await Promise.resolve();
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }

  parseIncoming(): IncomingMessage {
    throw new NotImplementedException('Canal aún no disponible: facebook');
  }
}
