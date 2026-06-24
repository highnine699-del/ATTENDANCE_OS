@echo off
echo Starting Attendance OS...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install serve package if not available
call npx serve --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing serve package...
    call npm install -g serve
)

REM Start the development server
echo Starting development server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
call npm start
