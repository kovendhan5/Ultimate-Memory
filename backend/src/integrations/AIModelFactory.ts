import { Message } from '../core/MemoryManager';
import { AnthropicClient } from './AnthropicClient';
import { GoogleClient } from './GoogleClient';
import { LocalModelClient } from './LocalModelClient';
import { OpenAIClient } from './OpenAIClient';

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AIClient {
  chat(messages: Message[], options?: any): Promise<AIResponse>;
  streamChat?(messages: Message[], options?: any): AsyncGenerator<string>;
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'local';

export class AIModelFactory {
  private static clients: Map<string, AIClient> = new Map();

  /**
   * Get AI client for specified provider and model
   */
  static getClient(provider: AIProvider, model?: string): AIClient {
    const key = `${provider}-${model || 'default'}`;
    
    if (!this.clients.has(key)) {
      const client = this.createClient(provider, model);
      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }

  /**
   * Create new AI client instance
   */
  private static createClient(provider: AIProvider, model?: string): AIClient {
    switch (provider) {
      case 'openai':
        return new OpenAIClient(model);
      
      case 'anthropic':
        return new AnthropicClient(model);
      
      case 'google':
        return new GoogleClient(model);
      
      case 'local':
        return new LocalModelClient(model);
      
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * List available providers
   */
  static getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (process.env.OPENAI_API_KEY) providers.push('openai');
    if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
    if (process.env.GOOGLE_API_KEY) providers.push('google');
    
    // Local models are always available
    providers.push('local');

    return providers;
  }

  /**
   * Get default models for each provider
   */
  static getDefaultModels(): Record<AIProvider, string> {
    return {
      openai: 'gpt-4-turbo-preview',
      anthropic: 'claude-3-opus-20240229',
      google: 'gemini-pro',
      local: 'llama2'
    };
  }
}
