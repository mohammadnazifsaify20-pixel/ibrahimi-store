@echo off
echo ========================================
echo Ibrahimi Store - Desktop App Builder
echo ========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found!
echo.

echo [2/5] Installing desktop app dependencies...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [3/5] Installing Electron Builder...
call npm install --save-dev electron-builder
echo.

echo [4/5] Building desktop application for Windows...
echo This may take several minutes...
call npm run build:win
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo [5/5] Build complete!
echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Your installer is ready in the 'dist' folder:
echo Location: %~dp0dist\
echo.
echo Look for: Ibrahimi-Store-Setup-X.X.X.exe
echo.
pause
