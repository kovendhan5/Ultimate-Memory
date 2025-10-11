import { Brain, Database, MessageSquare, Zap } from 'lucide-react'
import { useMemoryStats } from '../hooks/useMemory'

export default function Dashboard() {
  const { data: stats, isLoading } = useMemoryStats('user123')

  const features = [
    {
      icon: Brain,
      title: 'Universal Memory',
      description: 'Single source of truth for all AI conversations',
      color: 'text-blue-500'
    },
    {
      icon: MessageSquare,
      title: 'Multi-Model Support',
      description: 'Works with OpenAI, Anthropic, Google, and more',
      color: 'text-green-500'
    },
    {
      icon: Database,
      title: 'Smart Context',
      description: 'Automatically manages token limits and relevance',
      color: 'text-purple-500'
    },
    {
      icon: Zap,
      title: 'Full Control',
      description: 'Complete control over what gets stored and shared',
      color: 'text-yellow-500'
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome to Ultimate Memory
        </h1>
        <p className="text-gray-400 mb-8">
          Universal memory management for all your AI interactions
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-gray-400 text-sm">Total Memories</div>
            <div className="text-3xl font-bold text-white mt-2">
              {isLoading ? '...' : stats?.totalMemories || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-gray-400 text-sm">Conversations</div>
            <div className="text-3xl font-bold text-white mt-2">
              {isLoading ? '...' : stats?.totalConversations || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-gray-400 text-sm">Total Messages</div>
            <div className="text-3xl font-bold text-white mt-2">
              {isLoading ? '...' : stats?.totalMessages || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-gray-400 text-sm">Top Tags</div>
            <div className="text-3xl font-bold text-white mt-2">
              {isLoading ? '...' : stats?.topTags?.length || 0}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="card">
                <Icon className={`w-10 h-10 ${feature.color} mb-4`} />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Start */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-4">
            Quick Start
          </h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white">Start a Chat</h3>
                <p className="text-gray-400">Go to the Chat page and start conversing with any AI model</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white">Memories Auto-Save</h3>
                <p className="text-gray-400">All conversations are automatically saved to your memory</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white">Switch Models</h3>
                <p className="text-gray-400">Change AI models anytime - they all share the same memory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
