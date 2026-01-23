# 🖥️ Ibrahimi Store - Desktop Application

**Offline Desktop Version** - No Internet Required!

This is a standalone desktop application version of the Ibrahimi Store Management System. It works **100% offline** using a local SQLite database stored on your computer.

## ✨ Features

- ✅ **Completely Offline** - Works without internet connection
- ✅ **Local Database** - All data stored securely on your computer using SQLite
- ✅ **No Installation Dependencies** - Everything bundled in one installer
- ✅ **Fast Performance** - Direct access to local database
- ✅ **All Original Features** - POS, Inventory, Customer Management, Reports
- ✅ **Auto-Updates** - Can be configured for automatic updates (optional)

## 📥 Installation

### Windows

1. Download `Ibrahimi-Store-Setup.exe` from the releases
2. Run the installer
3. Follow the installation wizard
4. Launch "Ibrahimi Store" from your desktop or start menu

### Mac

1. Download `Ibrahimi-Store.dmg` from the releases
2. Open the DMG file
3. Drag the app to your Applications folder
4. Launch from Applications

### Linux

1. Download `Ibrahimi-Store.AppImage` from the releases
2. Make it executable: `chmod +x Ibrahimi-Store.AppImage`
3. Run: `./Ibrahimi-Store.AppImage`

## 🚀 Building from Source

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Steps

1. **Navigate to desktop-app folder:**
   ```bash
   cd desktop-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the application:**
   
   For Windows:
   ```bash
   npm run build:win
   ```
   
   For Mac:
   ```bash
   npm run build:mac
   ```
   
   For Linux:
   ```bash
   npm run build:linux
   ```

4. **Find your installer:**
   The built application will be in the `dist` folder

## 🔧 Development

To run in development mode:

```bash
npm start
```

## 📍 Data Location

Your database and application data are stored in:

- **Windows:** `C:\Users\[YourName]\AppData\Roaming\ibrahimi-store-desktop`
- **Mac:** `~/Library/Application Support/ibrahimi-store-desktop`
- **Linux:** `~/.config/ibrahimi-store-desktop`

The main database file is: `ibrahimi-store.db`

## 🔒 Default Login

**Email:** admin@mns.com  
**Password:** Samir1379

⚠️ **Important:** Change the default password after first login!

## 💾 Backup & Restore

### Backup
1. Close the application
2. Navigate to the data location (see above)
3. Copy `ibrahimi-store.db` to a safe location

### Restore
1. Close the application
2. Replace `ibrahimi-store.db` with your backup file
3. Restart the application

## 🆘 Troubleshooting

### Application won't start
- Try running as administrator (Windows)
- Check if antivirus is blocking the app
- Delete the data folder and restart (will reset database)

### Data not saving
- Ensure you have write permissions to the data folder
- Check available disk space

### Performance issues
- Close other resource-intensive applications
- Check if database file is too large (>1GB)

## 🔄 Updates

The application can check for updates automatically. When an update is available:
1. A notification will appear
2. Click "Download Update"
3. The app will restart with the new version

## 📊 Database

This desktop app uses **SQLite** - a lightweight, file-based database that requires no server setup. Your data is stored directly on your computer, making it:

- Fast and efficient
- Easy to backup (just copy one file)
- Reliable and stable
- Completely offline

## 🛡️ Security

- All passwords are hashed using bcrypt
- JWT tokens for session management
- Admin password protection for sensitive operations
- Local data - not transmitted anywhere

## 📝 Technical Details

**Built with:**
- Electron (Desktop Framework)
- SQLite (Database)
- Node.js (Backend)
- Same React/Next.js frontend from web version

**Platform Support:**
- Windows 10/11 (x64)
- macOS 10.13+ (Intel & Apple Silicon)
- Linux (Ubuntu 18.04+, Debian 10+, Fedora 32+)

## 📄 License

Proprietary software developed for **Ibrahimi & Brothers Motor Parts L.L.C**.  
Unauthorized distribution or commercial use is prohibited.

---

## 🆚 Differences from Web Version

| Feature | Web Version | Desktop Version |
|---------|-------------|-----------------|
| Internet Required | ✅ Yes | ❌ No |
| Database | PostgreSQL (Server) | SQLite (Local File) |
| Installation | Docker + Node.js | Single Installer |
| Multi-User | Yes (networked) | Single Computer |
| Updates | Manual deployment | Auto-update available |
| Backup | Database dump | Copy file |

---

**Need Help?** Contact: support@ibrahimistore.com
