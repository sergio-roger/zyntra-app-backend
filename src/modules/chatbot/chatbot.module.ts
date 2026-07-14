import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Business } from '../auth/entities/business.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Setting } from './entities/setting.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ChatGateway } from './chat.gateway';
import { InternalCallbackController } from './internal-callback.controller';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';
import { AiModule } from '../ai/ai.module';
import { WidgetSessionModule } from '@/modules/widget-session/widget-session.module';
import { MessageEncryptionService } from './services/message-encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, Conversation, Message, Setting]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev_secret',
      }),
    }),
    AiModule,
    ChannelsModule,
    WidgetSessionModule,
    BullModule.registerQueue({ name: 'agent-response' }),
  ],
  controllers: [ChatController, InternalCallbackController, SettingsController],
  providers: [
    ChatService,
    ChatGateway,
    ChatRateLimitGuard,
    MessageEncryptionService,
    SettingsService,
  ],
  exports: [ChatService],
})
export class ChatbotModule {}
