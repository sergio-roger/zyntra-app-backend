import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { ChannelCredential } from '@/modules/channels/entities/channel-credential.entity';
import { ChannelsService } from '@/modules/channels/channels.service';
import { ChannelsController } from '@/modules/channels/channels.controller';
import { ChannelProviderFactory } from '@/modules/channels/providers/channel-provider.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelType, Channel, ChannelCredential]),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelProviderFactory],
  exports: [ChannelsService, TypeOrmModule],
})
export class ChannelsModule {}
