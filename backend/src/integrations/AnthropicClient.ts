import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../core/MemoryManager';
import { logger } from '../utils/logger';
import { AIClient, AIResponse } from './AIModelFactory';

export class AnthropicClient implements AIClient {
  private client: Anthropic;
  private model: string;

  constructor(model?: string) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = model || 'claude-3-opus-20240229';
  }

  /**
   * Chat completion
   */
  async chat(messages: Message[], options?: any): Promise<AIResponse> {
    try {
      // Separate system messages from conversation
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessages.length > 0 
          ? systemMessages.map(m => m.content).join('\n')
          : undefined,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        temperature: options?.temperature,
        top_p: options?.topP
      });

      const textContent = response.content.find(c => c.type === 'text');

      return {
        content: textContent?.type === 'text' ? textContent.text : '',
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finishReason: response.stop_reason || undefined
      };
    } catch (error) {
      logger.error('Anthropic chat error', error);
      throw new Error('Failed to get response from Anthropic');
    }
  }

  /**
   * Streaming chat completion
   */
  async* streamChat(messages: Message[], options?: any): AsyncGenerator<string> {
    try {
      const systemMessages = messages.filter(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        system: systemMessages.length > 0 
          ? systemMessages.map(m => m.content).join('\n')
          : undefined,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        stream: true,
        temperature: options?.temperature
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && 
            event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error) {
      logger.error('Anthropic stream error', error);
      throw new Error('Failed to stream response from Anthropic');
    }
  }
}
