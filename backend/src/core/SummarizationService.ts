import { MemoryManager, Message } from '../core/MemoryManager';
import { logger } from '../utils/logger';
import { estimateTokens, extractKeywords } from '../utils/textUtils';

/**
 * Service for automatically summarizing long conversations
 */
export class SummarizationService {
  private memoryManager: MemoryManager;
  private maxTokensBeforeSummary: number;

  constructor() {
    this.memoryManager = new MemoryManager();
    this.maxTokensBeforeSummary = parseInt(
      process.env.MAX_TOKENS_BEFORE_SUMMARY || '4000',
      10
    );
  }

  /**
   * Check if conversation needs summarization
   */
  async shouldSummarize(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const memories = await this.memoryManager.retrieve({
      userId,
      conversationId,
      limit: 100
    });

    const totalTokens = memories.reduce((sum, memory) => {
      const text = memory.messages
        .map(m => m.content)
        .join(' ');
      return sum + estimateTokens(text);
    }, 0);

    return totalTokens > this.maxTokensBeforeSummary;
  }

  /**
   * Summarize conversation using AI
   */
  async summarizeConversation(
    userId: string,
    conversationId: string,
    aiClient: any
  ): Promise<string> {
    try {
      // Get all messages in conversation
      const memories = await this.memoryManager.retrieve({
        userId,
        conversationId,
        limit: 100
      });

      // Combine all messages
      const allMessages: Message[] = [];
      memories.forEach(memory => {
        allMessages.push(...memory.messages);
      });

      // Create summarization prompt
      const conversationText = allMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const summaryMessages: Message[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of conversations.'
        },
        {
          role: 'user',
          content: `Please summarize the following conversation in 3-5 sentences, capturing the main topics and key points:\n\n${conversationText}`
        }
      ];

      // Get summary from AI
      const response = await aiClient.chat(summaryMessages);
      const summary = response.content;

      // Store summary as metadata
      await this.storeSummary(userId, conversationId, summary);

      logger.info('Conversation summarized', {
        userId,
        conversationId,
        messageCount: allMessages.length
      });

      return summary;
    } catch (error) {
      logger.error('Failed to summarize conversation', error);
      throw new Error('Summarization failed');
    }
  }

  /**
   * Store summary in memory
   */
  private async storeSummary(
    userId: string,
    conversationId: string,
    summary: string
  ): Promise<void> {
    const keywords = extractKeywords(summary, 5);
    
    await this.memoryManager.store({
      userId,
      conversationId: `${conversationId}-summary`,
      messages: [
        {
          role: 'system',
          content: `Summary: ${summary}`
        }
      ],
      metadata: {
        tags: ['summary', ...keywords],
        importance: 'high',
        isSummary: true
      }
    });
  }

  /**
   * Get conversation summary if it exists
   */
  async getSummary(
    userId: string,
    conversationId: string
  ): Promise<string | null> {
    const memories = await this.memoryManager.retrieve({
      userId,
      conversationId: `${conversationId}-summary`,
      limit: 1
    });

    if (memories.length > 0 && memories[0].metadata?.isSummary) {
      return memories[0].messages[0].content.replace('Summary: ', '');
    }

    return null;
  }
}
