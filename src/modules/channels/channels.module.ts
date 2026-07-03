import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelType } from './entities/channel-type.entity';
import { Channel } from './entities/channel.entity';
import { ChannelCredential } from './entities/channel-credential.entity';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelProviderFactory } from './providers/channel-provider.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelType, Channel, ChannelCredential]),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelProviderFactory],
  exports: [ChannelsService, TypeOrmModule],
})
export class ChannelsModule {}
