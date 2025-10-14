import { beforeEach, describe, expect, it } from '@jest/globals';
import { MemoryManager } from '../src/core/MemoryManager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  describe('store', () => {
    it('should store a memory entry', async () => {
      const memory = await memoryManager.store({
        userId: 'test-user',
        conversationId: 'test-conv',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ]
      });

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.userId).toBe('test-user');
      expect(memory.conversationId).toBe('test-conv');
      expect(memory.messages).toHaveLength(2);
    });

    it('should generate embeddings for stored memories', async () => {
      const memory = await memoryManager.store({
        userId: 'test-user',
        conversationId: 'test-conv',
        messages: [
          { role: 'user', content: 'What is AI?' }
        ]
      });

      expect(memory.embedding).toBeDefined();
      expect(Array.isArray(memory.embedding)).toBe(true);
    });
  });

  describe('retrieve', () => {
    beforeEach(async () => {
      await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-1',
        messages: [
          { role: 'user', content: 'Tell me about quantum computing' },
          { role: 'assistant', content: 'Quantum computing uses quantum mechanics...' }
        ],
        metadata: {
          tags: ['quantum', 'computing']
        }
      });
    });

    it('should retrieve memories by userId', async () => {
      const memories = await memoryManager.retrieve({
        userId: 'test-user',
        limit: 10
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].userId).toBe('test-user');
    });

    it('should retrieve memories by conversationId', async () => {
      const memories = await memoryManager.retrieve({
        userId: 'test-user',
        conversationId: 'conv-1'
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].conversationId).toBe('conv-1');
    });

    it('should filter memories by tags', async () => {
      const memories = await memoryManager.retrieve({
        userId: 'test-user',
        tags: ['quantum']
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].metadata?.tags).toContain('quantum');
    });
  });

  describe('getContext', () => {
    beforeEach(async () => {
      await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-1',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
          { role: 'user', content: 'How are you?' },
          { role: 'assistant', content: 'I am doing well!' }
        ]
      });
    });

    it('should return conversation context', async () => {
      const context = await memoryManager.getContext(
        'test-user',
        'Tell me more',
        { conversationId: 'conv-1' }
      );

      expect(context.length).toBeGreaterThan(0);
      expect(context[0].role).toBeDefined();
      expect(context[0].content).toBeDefined();
    });

    it('should optimize context to fit token limit', async () => {
      const context = await memoryManager.getContext(
        'test-user',
        'Tell me more',
        { 
          conversationId: 'conv-1',
          maxTokens: 10
        }
      );

      const totalChars = context.reduce((sum, msg) => sum + msg.content.length, 0);
      expect(totalChars).toBeLessThanOrEqual(10 * 4); // 1 token ≈ 4 chars
    });
  });

  describe('delete', () => {
    it('should delete a specific memory', async () => {
      const memory = await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-1',
        messages: [
          { role: 'user', content: 'Test' }
        ]
      });

      await memoryManager.delete('test-user', memory.id);

      const memories = await memoryManager.retrieve({
        userId: 'test-user',
        conversationId: 'conv-1'
      });

      expect(memories.find(m => m.id === memory.id)).toBeUndefined();
    });

    it('should delete all memories in a conversation', async () => {
      await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-to-delete',
        messages: [{ role: 'user', content: 'Test 1' }]
      });

      await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-to-delete',
        messages: [{ role: 'user', content: 'Test 2' }]
      });

      await memoryManager.delete('test-user', undefined, 'conv-to-delete');

      const memories = await memoryManager.retrieve({
        userId: 'test-user',
        conversationId: 'conv-to-delete'
      });

      expect(memories.length).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await memoryManager.store({
        userId: 'test-user',
        conversationId: 'conv-1',
        messages: [{ role: 'user', content: 'Test' }],
        metadata: { tags: ['test', 'example'] }
      });
    });

    it('should return memory statistics', async () => {
      const stats = await memoryManager.getStats('test-user');

      expect(stats).toBeDefined();
      expect(stats.totalMemories).toBeGreaterThan(0);
      expect(stats.totalConversations).toBeGreaterThan(0);
    });
  });
});
