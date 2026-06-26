import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatbotConfig } from './entities/chatbot-config.entity';
import { Contact } from '@crm/entities/contact.entity';
import { Business } from '../auth/entities/business.entity';
import { LifecycleStage } from '../lifecycle/entities/lifecycle-stage.entity';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { EmbedController } from './embed.controller';
import { ChatGateway } from './chat.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatbotConfig,
      Contact,
      Business,
      LifecycleStage,
    ]),
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
    AiModule,
  ],
  controllers: [ChatbotController, ChatController, EmbedController],
  providers: [ChatbotService, ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatbotModule {}
