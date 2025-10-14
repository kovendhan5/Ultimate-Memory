# Ultimate Memory - Getting Started Guide

## Quick Start (5 Minutes)

### Step 1: Install Dependencies

Run the setup script:

**Windows:**

```bash
setup.bat
```

**Mac/Linux:**

```bash
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
# Install all dependencies
npm run install:all
```

### Step 2: Configure Environment

1. Copy the example environment file:

```bash
copy backend\.env.example backend\.env
```

2. Edit `backend/.env` and add your API keys:

```env
# Required: Add at least one AI provider API key
OPENAI_API_KEY=sk-your-key-here
# Optional: Add more providers
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-key-here
```

### Step 3: Start Development Servers

```bash
# Start both backend and frontend
npm run dev
```

Or start them separately:

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Step 4: Open the Application

- **Frontend Dashboard:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## First Conversation

1. Navigate to the **Chat** page in the UI
2. Select an AI provider (OpenAI, Anthropic, Google, or Local)
3. Type a message and send it
4. Your conversation is automatically saved to memory!

## Try Switching Models

1. Start a conversation with GPT-4
2. Switch to Claude in the dropdown
3. Continue the conversation - Claude has access to the full context!

## View Your Memories

1. Go to the **Memories** page
2. See all stored conversations
3. Search for specific topics
4. Delete unwanted memories

## Using the API

### Store a Memory

```bash
curl -X POST http://localhost:3000/api/v1/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "conversationId": "conv-001",
    "messages": [
      {"role": "user", "content": "Hello!"},
      {"role": "assistant", "content": "Hi there!"}
    ]
  }'
```

### Chat with AI

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "provider": "openai",
    "message": "What is AI?",
    "conversationId": "conv-001",
    "useMemory": true
  }'
```

## Architecture

```
┌──────────────┐      ┌──────────────┐
│   Browser    │─────▶│   Frontend   │
│              │      │  React App   │
└──────────────┘      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │   REST API   │
                      │  Express.js  │
                      └──────┬───────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
         ┌──────▼──────┐ ┌──▼─────┐ ┌───▼────┐
         │   Memory    │ │ Vector │ │   AI   │
         │   Manager   │ │ Store  │ │ Models │
         └─────────────┘ └────────┘ └────────┘
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server
│   ├── core/
│   │   └── MemoryManager.ts  # Memory logic
│   ├── integrations/         # AI providers
│   ├── storage/              # Data storage
│   └── api/routes/           # API endpoints

frontend/
├── src/
│   ├── App.tsx               # Main app
│   ├── pages/                # UI pages
│   ├── components/           # Reusable UI
│   └── services/             # API client
```

## Common Issues

### "Cannot connect to backend"

- Make sure backend is running on port 3000
- Check `backend/.env` exists and is configured
- Verify no firewall is blocking the connection

### "API key not configured"

- Add your API key to `backend/.env`
- Restart the backend server
- Check the key is valid

### "Memory not persisting"

- Currently using in-memory storage
- Data will reset when server restarts
- For production, use PostgreSQL (see docs)

## Next Steps

1. **Read the Documentation:**

   - [API Examples](docs/API_EXAMPLES.md)
   - [Development Guide](docs/DEVELOPMENT.md)
   - [Contributing](CONTRIBUTING.md)

2. **Explore Features:**

   - Try different AI models
   - Search your memories
   - View analytics (coming soon)

3. **Customize:**

   - Add new AI providers
   - Customize the UI
   - Integrate vector databases

4. **Deploy:**
   - Set up production database
   - Deploy to cloud (AWS, GCP, Azure)
   - Configure domains and SSL

## Getting Help

- **Documentation:** Check the `docs/` folder
- **Issues:** Open an issue on GitHub
- **Examples:** See `docs/API_EXAMPLES.md`

## What's Next?

The foundation is ready! Here are some ideas:

- 🔐 Add user authentication
- 📊 Build analytics dashboard
- 🔍 Advanced semantic search
- 💾 PostgreSQL integration
- 📱 Mobile app
- 🔌 Browser extension
- 🤝 Team collaboration

Happy coding! 🚀
