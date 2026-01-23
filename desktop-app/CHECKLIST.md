# ✅ Desktop App Build Checklist

## Before Building

- [ ] Node.js installed (v18+)
- [ ] npm installed and working
- [ ] Enough disk space (~2GB free)
- [ ] No antivirus blocking npm/electron

## Build Process

- [ ] Navigate to `desktop-app` folder
- [ ] Run `npm install` (first time only)
- [ ] Run `npm run build:win` (or your platform)
- [ ] Wait 5-10 minutes for build
- [ ] Check `dist/` folder for installer

## Testing

- [ ] Installer file exists in `dist/`
- [ ] Installer runs without errors
- [ ] App launches successfully
- [ ] Can login with default credentials
- [ ] Database creates automatically
- [ ] Can create a product
- [ ] Can create a customer
- [ ] Can create a sale
- [ ] Can view reports
- [ ] Can update settings
- [ ] Works offline (disconnect internet)
- [ ] Data persists after closing/reopening

## Distribution

- [ ] Copy installer from `dist/` folder
- [ ] Test on clean computer (no dev tools)
- [ ] Verify installer size (~150-200 MB)
- [ ] Document default login credentials
- [ ] Create user guide (optional)
- [ ] Share with end users

## Troubleshooting

If build fails:
- [ ] Delete `node_modules` folder
- [ ] Delete `package-lock.json`
- [ ] Run `npm install` again
- [ ] Try build again

If app won't start:
- [ ] Check antivirus isn't blocking
- [ ] Run as administrator (Windows)
- [ ] Check error logs in AppData folder

If database fails:
- [ ] Delete database file
- [ ] Restart app (will recreate)

## Customization (Optional)

- [ ] Replace app icons in `build/` folder
- [ ] Update app name in `package.json`
- [ ] Change default credentials in `src/database/init.js`
- [ ] Update company name in `src/database/init.js`

## Documentation

Files included:
- [ ] README.md - Main documentation
- [ ] QUICKSTART.md - Quick start guide
- [ ] BUILD.md - Detailed build instructions
- [ ] INTEGRATION.md - Integration guide
- [ ] SUMMARY.md - Complete summary
- [ ] This checklist file

## Support Files

- [ ] BUILD-WINDOWS.bat - Automated Windows build
- [ ] package.json - Dependencies and config
- [ ] All source files in `src/`
- [ ] All API handlers in `src/api/`

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Test in development
npm start

# Build for Windows
npm run build:win

# Build for Mac
npm run build:mac

# Build for Linux
npm run build:linux

# Clean build (if needed)
rm -rf node_modules dist
npm install
npm run build:win
```

---

## Default Credentials

**Email:** admin@mns.com  
**Password:** Samir1379  
**Admin Password:** admin123

⚠️ **Remember to change these after first login!**

---

## File Locations

**Installer output:** `desktop-app/dist/`  
**Database location:** See SUMMARY.md  
**Logs:** Check OS-specific AppData folder

---

**Status:** Ready to build! 🚀

Just run: `BUILD-WINDOWS.bat` or `npm run build:win`
