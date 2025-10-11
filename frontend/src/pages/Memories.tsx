import { format } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useMemories } from '../hooks/useMemory'

export default function Memories() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: memories, isLoading } = useMemories('user123', searchQuery)

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Memory Bank</h1>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* Memory List */}
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading memories...</div>
        ) : memories && memories.length > 0 ? (
          <div className="space-y-4">
            {memories.map((memory: any) => (
              <div key={memory.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(memory.timestamp), 'MMM dd, yyyy HH:mm')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Conversation: {memory.conversationId}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {memory.messages.map((msg: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded ${
                        msg.role === 'user'
                          ? 'bg-blue-900/30 border border-blue-800/50'
                          : 'bg-slate-700/50'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1 uppercase">
                        {msg.role}
                      </div>
                      <div className="text-gray-200">{msg.content}</div>
                    </div>
                  ))}
                </div>

                {memory.metadata?.tags && memory.metadata.tags.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {memory.metadata.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">No memories found</p>
            <p className="text-sm mt-2">Start chatting to create memories</p>
          </div>
        )}
      </div>
    </div>
  )
}
