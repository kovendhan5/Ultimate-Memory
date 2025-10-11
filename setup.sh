#!/bin/bash

echo "===================================="
echo "Ultimate Memory - Setup Script"
echo "===================================="
echo ""

echo "[1/4] Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Error: Backend installation failed"
    exit 1
fi
cd ..
echo "Backend dependencies installed successfully!"
echo ""

echo "[2/4] Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "Error: Frontend installation failed"
    exit 1
fi
cd ..
echo "Frontend dependencies installed successfully!"
echo ""

echo "[3/4] Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env file - please edit with your API keys"
else
    echo "backend/.env already exists"
fi
echo ""

echo "[4/4] Creating necessary directories..."
mkdir -p backend/logs
echo ""

echo "===================================="
echo "Setup Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API keys"
echo "2. Run 'npm run dev' to start both servers"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "For more information, see README.md"
echo ""
