# Ultimate Memory

A universal memory management system that allows different AI models to share the same conversation history and context, giving you complete control over your AI interactions.

## 🌟 Features

- **Universal Memory**: Single source of truth for all AI conversations
- **Multi-Model Support**: Works with OpenAI, Anthropic, Google, Cohere, and more
- **Smart Context Management**: Automatically manages token limits and relevance
- **User Control**: Full control over what gets stored and shared
- **Privacy First**: Your data, your rules - local or cloud storage options
- **Conversation Branching**: Create and manage multiple conversation threads
- **Search & Analytics**: Find and analyze past interactions
- **Export/Import**: Move your memory between systems

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend UI   │
│  (React + TS)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   REST API      │
│  (Node.js)      │
└────────┬────────┘
         │
┌────────▼────────┐
│ Memory Manager  │
│  (Core Logic)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│Vector│  │ SQL  │
│  DB  │  │  DB  │
└──────┘  └──────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+ (for vector embeddings)
- PostgreSQL (optional, for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/kovendhan5/Ultimate-Memory.git
cd Ultimate-Memory

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# Start development servers
npm run dev
```

## 📁 Project Structure

```
Ultimate-Memory/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── api/            # REST API routes
│   │   ├── core/           # Memory management logic
│   │   ├── integrations/   # AI model integrations
│   │   ├── storage/        # Database interfaces
│   │   └── utils/          # Utilities
│   ├── tests/
│   └── package.json
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── hooks/          # Custom React hooks
│   └── package.json
├── memory-engine/          # Python embedding service
│   ├── embeddings/         # Vector generation
│   ├── search/             # Semantic search
│   └── requirements.txt
└── docs/                   # Documentation
```

## 🔧 Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ultimate_memory
REDIS_URL=redis://localhost:6379

# AI API Keys (add only the ones you plan to use)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
COHERE_API_KEY=...

# Memory Settings
MAX_MEMORY_SIZE=10000
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_DB=pinecone  # or 'local', 'qdrant', 'weaviate'

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

## 🎯 Usage Examples

### Storing a Conversation

```javascript
const memory = new MemoryClient("http://localhost:3000");

await memory.store({
  userId: "user123",
  model: "gpt-4",
  messages: [
    { role: "user", content: "What is quantum computing?" },
    { role: "assistant", content: "Quantum computing is..." },
  ],
  metadata: {
    tags: ["technology", "quantum"],
    importance: "high",
  },
});
```

### Retrieving Context for Any AI Model

```javascript
const context = await memory.retrieve({
  userId: "user123",
  query: "Tell me about quantum computing",
  limit: 5,
  minRelevance: 0.7,
});

// Use with any AI model
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...context, { role: "user", content: userMessage }],
});
```

## 🔌 Supported AI Models

- ✅ OpenAI (GPT-3.5, GPT-4, GPT-4 Turbo)
- ✅ Anthropic (Claude 2, Claude 3)
- ✅ Google (Gemini Pro, PaLM 2)
- ✅ Cohere (Command, Command R)
- ✅ Local Models (Ollama, LM Studio)
- 🔄 More coming soon...

## 🛣️ Roadmap

- [x] Basic memory storage and retrieval
- [x] Multi-model support
- [ ] Vector similarity search
- [ ] Automatic context summarization
- [ ] Conversation branching
- [ ] Analytics dashboard
- [ ] Browser extension
- [ ] Mobile app
- [ ] Self-hosted option
- [ ] Team collaboration features

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔐 Privacy & Security

- End-to-end encryption option
- Local-first storage option
- GDPR compliant
- No data sharing with third parties
- Automatic PII detection and redaction

## 📞 Support

- Documentation: [docs.ultimate-memory.com](https://docs.ultimate-memory.com)
- Issues: [GitHub Issues](https://github.com/kovendhan5/Ultimate-Memory/issues)
- Discord: [Join our community](https://discord.gg/ultimate-memory)

---

Built with ❤️ for the AI community
