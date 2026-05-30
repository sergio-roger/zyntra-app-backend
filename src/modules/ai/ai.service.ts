import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class AiService {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private readonly defaultModel = 'minimax/minimax-m2.5:free';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new HttpException(
        'OpenRouter API not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<ChatResponse>(url, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://zyntra.app',
            'X-Title': 'Zyntra',
          },
        }),
      );

      return response.data;
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message = err.response?.data?.error?.message || 'AI service error';
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  async chatWithContext(
    userMessage: string,
    systemPrompt: string,
    context?: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    if (context) {
      messages.push({
        role: 'system',
        content: `Información contextual del negocio:\n${context}`,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await this.chat({ messages });

    return (
      response.choices[0]?.message.content ||
      'Lo siento, no pude procesar tu solicitud.'
    );
  }
}
