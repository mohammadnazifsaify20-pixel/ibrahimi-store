# 🏗️ Building the Desktop Application

## Quick Build Guide

### Step 1: Install Dependencies

```bash
cd desktop-app
npm install
```

### Step 2: Build for Your Platform

**Windows (64-bit):**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

### Step 3: Find Your Installer

After building, find your installer in the `desktop-app/dist` folder:
- **Windows:** `Ibrahimi-Store-Setup-1.0.0.exe`
- **Mac:** `Ibrahimi-Store-1.0.0.dmg`
- **Linux:** `Ibrahimi-Store-1.0.0.AppImage`

---

## Important Notes

### First Time Setup

1. **The desktop app needs the Next.js web app built first**
   
   Before building the desktop app, we need to export the web interface:
   
   ```bash
   cd apps/web
   npm run build
   npm run export  # If you have this script
   ```

2. **Copy web assets to desktop-app**
   
   The build process will automatically copy the necessary files from `apps/web` to `desktop-app/renderer`

### Testing Before Building

To test the desktop app without creating an installer:

```bash
cd desktop-app
npm start
```

This will launch the Electron app in development mode.

---

## Complete Build Process

Here's the full process from start to finish:

```bash
# 1. Navigate to project root
cd "C:\Users\Dell\Desktop\IBRAHIMI STORE"

# 2. Build the web app (if needed)
cd apps/web
npm run build

# 3. Go to desktop-app folder
cd ../../desktop-app

# 4. Install desktop app dependencies
npm install

# 5. Build the desktop app
npm run build:win    # For Windows
# or
npm run build:mac    # For macOS
# or  
npm run build:linux  # For Linux

# 6. Your installer is in desktop-app/dist folder!
```

---

## What Gets Included

The desktop application bundles:
- ✅ Electron runtime
- ✅ Node.js runtime
- ✅ All npm dependencies (better-sqlite3, bcryptjs, etc.)
- ✅ Your web interface (Next.js build)
- ✅ SQLite database initialization
- ✅ All API handlers (local)

**Total Size:** ~150-200 MB (includes everything needed to run)

---

## Distribution

Once built, you can:
1. Share the installer file with users
2. They just run the installer - no other software needed!
3. The app will work completely offline
4. Data is stored locally on their computer

---

## Customization

### Change App Icon

Replace these files in `desktop-app/build/`:
- `icon.ico` (Windows, 256x256)
- `icon.icns` (Mac, 512x512)
- `icon.png` (Linux, 512x512)

### Change App Name

Edit `desktop-app/package.json`:
```json
{
  "name": "your-app-name",
  "productName": "Your App Name",
  "build": {
    "appId": "com.yourcompany.yourapp"
  }
}
```

---

## Troubleshooting Build Issues

### "Module not found" errors
```bash
cd desktop-app
rm -rf node_modules package-lock.json
npm install
```

### Build fails on Windows
- Run as Administrator
- Disable antivirus temporarily
- Install Windows Build Tools: `npm install --global windows-build-tools`

### Build fails on Mac
- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build fails on Linux
- Install required packages:
  ```bash
  sudo apt-get install -y libgtk-3-dev libnotify-dev libnss3 libxss1 libasound2
  ```

---

**Need help?** Check the main README.md in the desktop-app folder!
