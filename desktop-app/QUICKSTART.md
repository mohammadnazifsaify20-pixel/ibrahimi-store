# 🚀 Quick Start - Building Your Desktop App

## For Windows Users (Easiest Method)

1. **Double-click** `BUILD-WINDOWS.bat`
2. Wait for the build to complete (5-10 minutes)
3. Find your installer in the `dist` folder
4. **Done!** Share the installer with anyone

---

## Manual Build (All Platforms)

### Prerequisites
- ✅ Node.js (v18+) installed
- ✅ npm installed

### Step-by-Step

1. **Open Terminal/Command Prompt**

2. **Navigate to desktop-app folder:**
   ```bash
   cd "C:\Users\Dell\Desktop\IBRAHIMI STORE\desktop-app"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build for Windows:**
   ```bash
   npm run build:win
   ```
   
   **Or for Mac:**
   ```bash
   npm run build:mac
   ```
   
   **Or for Linux:**
   ```bash
   npm run build:linux
   ```

5. **Wait for build** (5-10 minutes)

6. **Find your installer** in `dist` folder:
   - Windows: `Ibrahimi-Store-Setup-1.0.0.exe`
   - Mac: `Ibrahimi-Store-1.0.0.dmg`
   - Linux: `Ibrahimi-Store-1.0.0.AppImage`

---

## Installation

### For Windows
1. Run `Ibrahimi-Store-Setup-1.0.0.exe`
2. Follow installer wizard
3. Launch from Desktop or Start Menu

### For Mac
1. Open `Ibrahimi-Store-1.0.0.dmg`
2. Drag to Applications folder
3. Launch from Applications

### For Linux
1. Make executable: `chmod +x Ibrahimi-Store-1.0.0.AppImage`
2. Run: `./Ibrahimi-Store-1.0.0.AppImage`

---

## First Time Login

**Default Credentials:**
- Email: `admin@mns.com`
- Password: `Samir1379`

⚠️ **Change password after first login!**

---

## What's Included?

✅ **Complete POS System** - Sell products, manage inventory  
✅ **Customer Management** - Track credits and payments  
✅ **Reports & Analytics** - Sales reports, audit logs  
✅ **Offline Database** - SQLite stored on computer  
✅ **No Internet Required** - Works 100% offline  
✅ **Auto-Updates** - Optional update notifications  

---

## Data Location

Your database is saved at:
- **Windows:** `C:\Users\[You]\AppData\Roaming\ibrahimi-store-desktop\ibrahimi-store.db`
- **Mac:** `~/Library/Application Support/ibrahimi-store-desktop/ibrahimi-store.db`
- **Linux:** `~/.config/ibrahimi-store-desktop/ibrahimi-store.db`

**To Backup:** Just copy this file!

---

## Distribution

You can share the installer with:
- ✅ Other computers in your store
- ✅ Branch offices
- ✅ Any Windows/Mac/Linux computer

**They only need to:**
1. Run the installer
2. Login with credentials
3. Start using immediately!

---

## Support

**Having issues?**
- Check [README.md](README.md) for detailed docs
- Check [BUILD.md](BUILD.md) for build troubleshooting
- Check [INTEGRATION.md](INTEGRATION.md) for advanced setup

---

## Key Differences from Web Version

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| Internet | Required | Not Required |
| Installation | Complex (Docker, Node.js) | Single Installer |
| Database | PostgreSQL Server | SQLite File |
| Multi-User | Yes (Network) | Single Computer |
| Backup | Database Dump | Copy One File |
| Updates | Manual Deploy | Auto-Update |

---

**🎉 Congratulations!** You now have a professional, offline-capable desktop application!
