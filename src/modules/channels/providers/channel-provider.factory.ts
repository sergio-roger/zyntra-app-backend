import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelProvider } from '../interfaces/channel-provider.interface';
import { WebChatChannelProvider } from './web-chat-channel.provider';
import { FacebookChannelProvider } from './facebook-channel.provider';
import { TelegramChannelProvider } from './telegram-channel.provider';

@Injectable()
export class ChannelProviderFactory {
  private readonly registry = new Map<string, ChannelProvider>([
    ['web_chat', new WebChatChannelProvider()],
    ['facebook', new FacebookChannelProvider()],
    ['telegram', new TelegramChannelProvider()],
  ]);

  getProvider(channelTypeKey: string): ChannelProvider {
    const provider = this.registry.get(channelTypeKey);
    if (!provider) {
      throw new BadRequestException(
        `No existe proveedor registrado para el tipo de canal: ${channelTypeKey}`,
      );
    }
    return provider;
  }
}
