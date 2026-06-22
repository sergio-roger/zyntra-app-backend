import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequest } from './dto/chat.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@crm/enums/user-role.enum';

@ApiTags('AI')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI' })
  async chat(@Body() request: ChatRequest) {
    const response = await this.aiService.chat(request);
    return response.choices[0]?.message;
  }

  @Post('preview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Preview chatbot response' })
  async preview(
    @Body()
    body: {
      message: string;
      config: {
        tone: string;
        welcome_message: string;
        system_prompt_extra?: string;
      };
    },
  ) {
    const toneInstructions: Record<string, string> = {
      formal: 'Usa un tono formal y profesional. Sé respetuoso y directo.',
      friendly: 'Usa un tono amigable y cercano. Sé cálido y accesible.',
      professional:
        'Usa un tono profesional pero no frío. Sé claro y eficiente.',
      casual: 'Usa un tono casual y relaxed. Sé natural y divertido.',
    };

    const systemPrompt = `${body.config.system_prompt_extra || ''}\n\n${toneInstructions[body.config.tone] || toneInstructions.friendly}`;
    const response = await this.aiService.chatWithContext(
      body.message,
      systemPrompt,
    );
    return { response };
  }
}
