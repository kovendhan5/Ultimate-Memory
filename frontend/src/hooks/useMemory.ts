import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useMemories(userId: string, query?: string) {
  return useQuery({
    queryKey: ['memories', userId, query],
    queryFn: () => api.retrieveMemories(userId, query)
  })
}

export function useMemoryStats(userId: string) {
  return useQuery({
    queryKey: ['memory-stats', userId],
    queryFn: () => api.getMemoryStats(userId)
  })
}
