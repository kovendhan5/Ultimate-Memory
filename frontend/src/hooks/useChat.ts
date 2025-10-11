import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../services/api'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useChat(userId: string, conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])

  const mutation = useMutation({
    mutationFn: async ({
      message,
      provider
    }: {
      message: string
      provider: string
    }) => {
      return api.chat(userId, provider, message, conversationId)
    },
    onMutate: ({ message }) => {
      // Optimistically add user message
      setMessages(prev => [...prev, { role: 'user', content: message }])
    },
    onSuccess: (data) => {
      // Add AI response
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.data.message }
      ])
    },
    onError: () => {
      // Remove last message on error
      setMessages(prev => prev.slice(0, -1))
    }
  })

  return {
    messages,
    sendMessage: (message: string, provider: string) =>
      mutation.mutate({ message, provider }),
    isLoading: mutation.isPending
  }
}
