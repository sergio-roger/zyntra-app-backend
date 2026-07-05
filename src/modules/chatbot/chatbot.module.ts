import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Contact } from '@crm/entities/contact.entity';
import { Business } from '../auth/entities/business.entity';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import { ChannelsModule } from '@/modules/channels/channels.module';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService, AGENT_RESPONSE_QUEUE } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { InternalCallbackController } from './internal-callback.controller';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, Business, LifecycleStage]),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
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
  ],
  controllers: [ChatController, InternalCallbackController],
  providers: [ChatService, ChatGateway, ChatRateLimitGuard],
  exports: [ChatService],
})
export class ChatbotModule {}
