import { NotImplementedException } from '@nestjs/common';
import {
  ChannelProvider,
  ChannelSetupResult,
  IncomingMessage,
} from '../interfaces/channel-provider.interface';

export class TelegramChannelProvider implements ChannelProvider {
  validateConfig(): void {
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }

  async setup(): Promise<ChannelSetupResult> {
    await Promise.resolve();
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }

  parseIncoming(): IncomingMessage {
    throw new NotImplementedException('Canal aún no disponible: telegram');
  }
}
