import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelProvider } from '@/modules/channels/interfaces/channel-provider.interface';
import { WebChatChannelProvider } from '@/modules/channels/providers/web-chat-channel.provider';
import { FacebookChannelProvider } from '@/modules/channels/providers/facebook-channel.provider';
import { TelegramChannelProvider } from '@/modules/channels/providers/telegram-channel.provider';

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
