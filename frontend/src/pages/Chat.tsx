import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'

export default function Chat() {
  const [message, setMessage] = useState('')
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google' | 'local'>('openai')
  const [conversationId] = useState(`conv-${Date.now()}`)
  
  const { messages, sendMessage, isLoading } = useChat('user123', conversationId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    await sendMessage(message, provider)
    setMessage('')
  }

  const providerOptions = [
    { value: 'openai', label: 'OpenAI (GPT-4)' },
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'local', label: 'Local Model' }
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">AI Chat</h1>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providerOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-lg">Start a conversation with your AI assistant</p>
              <p className="text-sm mt-2">All messages are automatically saved to memory</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-6 py-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-gray-100 border border-slate-700'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider mb-2 opacity-70">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-gray-100 border border-slate-700 max-w-3xl px-6 py-4 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="input flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
