import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const api = {
  // Chat
  async chat(
    userId: string,
    provider: string,
    message: string,
    conversationId: string,
    options?: any
  ) {
    const response = await client.post('/ai/chat', {
      userId,
      provider,
      message,
      conversationId,
      useMemory: true,
      options
    })
    return response.data
  },

  // Memory
  async storeMemory(data: any) {
    const response = await client.post('/memory/store', data)
    return response.data
  },

  async retrieveMemories(userId: string, query?: string) {
    const response = await client.post('/memory/retrieve', {
      userId,
      query,
      limit: 50
    })
    return response.data.data
  },

  async getContext(userId: string, query: string, conversationId?: string) {
    const response = await client.post('/memory/context', {
      userId,
      query,
      conversationId,
      maxTokens: 8000,
      includeRelated: true
    })
    return response.data.data
  },

  async getMemoryStats(userId: string) {
    const response = await client.get(`/memory/stats/${userId}`)
    return response.data.data
  },

  async deleteMemory(userId: string, memoryId: string) {
    const response = await client.delete(`/memory/${memoryId}`, {
      data: { userId }
    })
    return response.data
  },

  // AI
  async getProviders() {
    const response = await client.get('/ai/providers')
    return response.data.data
  }
}
