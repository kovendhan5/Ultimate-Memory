import { GoogleGenerativeAI } from '@google/generative-ai';
import { Message } from '../core/MemoryManager';
import { logger } from '../utils/logger';
import { AIClient, AIResponse } from './AIModelFactory';

export class GoogleClient implements AIClient {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(model?: string) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = model || 'gemini-pro';
  }

  /**
   * Chat completion
   */
  async chat(messages: Message[], options?: any): Promise<AIResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      // Convert messages to Google's format
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const lastMessage = messages[messages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP
        }
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;

      return {
        content: response.text(),
        model: this.model,
        usage: {
          promptTokens: 0, // Google doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      logger.error('Google AI chat error', error);
      throw new Error('Failed to get response from Google AI');
    }
  }

  /**
   * Streaming chat completion
   */
  async* streamChat(messages: Message[], options?: any): AsyncGenerator<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const lastMessage = messages[messages.length - 1];

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens
        }
      });

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      logger.error('Google AI stream error', error);
      throw new Error('Failed to stream response from Google AI');
    }
  }
}
