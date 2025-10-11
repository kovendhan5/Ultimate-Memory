# Contributing to Ultimate Memory

Thank you for your interest in contributing to Ultimate Memory!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Ultimate-Memory.git`
3. Install dependencies:
   ```bash
   cd Ultimate-Memory/backend && npm install
   cd ../frontend && npm install
   ```
4. Create a `.env` file in the backend directory (use `.env.example` as template)
5. Start development servers:

   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Code Style

- We use TypeScript for type safety
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic

## Pull Request Process

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes
4. Commit with clear messages: `git commit -m "Add feature: description"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

## Areas for Contribution

- Additional AI model integrations
- Vector database implementations
- Frontend UI/UX improvements
- Documentation
- Bug fixes
- Test coverage

## Questions?

Open an issue or reach out on Discord!
