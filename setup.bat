@echo off
echo ====================================
echo Ultimate Memory - Setup Script
echo ====================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: Backend installation failed
    pause
    exit /b 1
)
cd ..
echo Backend dependencies installed successfully!
echo.

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Error: Frontend installation failed
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed successfully!
echo.

echo [3/4] Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend\.env file - please edit with your API keys
) else (
    echo backend\.env already exists
)
echo.

echo [4/4] Creating necessary directories...
if not exist backend\logs mkdir backend\logs
echo.

echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your API keys
echo 2. Run 'npm run dev' to start both servers
echo 3. Open http://localhost:5173 in your browser
echo.
echo For more information, see README.md
echo.
pause
