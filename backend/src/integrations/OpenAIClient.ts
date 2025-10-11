import OpenAI from 'openai';
import { Message } from '../core/MemoryManager';
import { logger } from '../utils/logger';
import { AIClient, AIResponse } from './AIModelFactory';

export class OpenAIClient implements AIClient {
  private client: OpenAI;
  private model: string;

  constructor(model?: string) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = model || 'gpt-4-turbo-preview';
  }

  /**
   * Chat completion
   */
  async chat(messages: Message[], options?: any): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty
      });

      const choice = response.choices[0];

      return {
        content: choice.message.content || '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason
      };
    } catch (error) {
      logger.error('OpenAI chat error', error);
      throw new Error('Failed to get response from OpenAI');
    }
  }

  /**
   * Streaming chat completion
   */
  async* streamChat(messages: Message[], options?: any): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      logger.error('OpenAI stream error', error);
      throw new Error('Failed to stream response from OpenAI');
    }
  }
}
