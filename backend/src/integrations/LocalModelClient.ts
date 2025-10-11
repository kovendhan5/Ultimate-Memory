import { Message } from '../core/MemoryManager';
import { logger } from '../utils/logger';
import { AIClient, AIResponse } from './AIModelFactory';

/**
 * Client for local models (Ollama, LM Studio, etc.)
 */
export class LocalModelClient implements AIClient {
  private model: string;
  private baseUrl: string;

  constructor(model?: string) {
    this.model = model || 'llama2';
    this.baseUrl = process.env.LOCAL_MODEL_URL || 'http://localhost:11434';
  }

  /**
   * Chat completion with local model
   */
  async chat(messages: Message[], options?: any): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: false,
          options: {
            temperature: options?.temperature,
            top_p: options?.topP,
            num_predict: options?.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Local model request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        model: this.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (error) {
      logger.error('Local model chat error', error);
      throw new Error('Failed to get response from local model');
    }
  }

  /**
   * Streaming chat completion
   */
  async* streamChat(messages: Message[], options?: any): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: true,
          options: {
            temperature: options?.temperature,
            top_p: options?.topP
          }
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Local model stream request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      logger.error('Local model stream error', error);
      throw new Error('Failed to stream response from local model');
    }
  }
}
