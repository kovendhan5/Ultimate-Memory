export default function Settings() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Settings</h1>

        {/* API Keys */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">OpenAI API Key</label>
              <input type="password" className="input" placeholder="sk-..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Anthropic API Key</label>
              <input type="password" className="input" placeholder="sk-ant-..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Google API Key</label>
              <input type="password" className="input" placeholder="..." />
            </div>
          </div>
        </div>

        {/* Memory Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Memory Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-gray-300">Auto-save conversations</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-gray-300">Enable PII detection</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-300">Encrypt stored memories</span>
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Context Tokens</label>
              <input type="number" className="input" defaultValue="8000" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-900/50">
          <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <button className="w-full px-4 py-2 bg-red-900/30 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors">
              Clear All Memories
            </button>
            <button className="w-full px-4 py-2 bg-red-900/30 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
