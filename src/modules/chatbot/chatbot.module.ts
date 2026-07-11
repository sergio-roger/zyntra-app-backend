import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Contact } from '@crm/entities/contact.entity';
import { Business } from '../auth/entities/business.entity';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatService, AGENT_RESPONSE_QUEUE } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { InternalCallbackController } from './internal-callback.controller';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';
import { AiModule } from '../ai/ai.module';
import { WidgetSessionModule } from '@/modules/widget-session/widget-session.module';
import { MessageEncryptionService } from './services/message-encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      Business,
      LifecycleStage,
      Conversation,
      Message,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev_secret',
      }),
    }),
    BullModule.registerQueue({ name: AGENT_RESPONSE_QUEUE }),
    AiModule,
    ChannelsModule,
    WidgetSessionModule,
  ],
  controllers: [ChatController, InternalCallbackController],
  providers: [
    ChatService,
    ChatGateway,
    ChatRateLimitGuard,
    MessageEncryptionService,
  ],
  exports: [ChatService],
})
export class ChatbotModule {}
