# 🔧 Fixing Node.js Version Issues

## Problem

You're using Node.js v25.2.1 which is too new and causes compilation errors with `better-sqlite3`.

## ✅ Solution 1: Install Node.js LTS (RECOMMENDED)

### Step 1: Download Node.js LTS

1. Go to: **https://nodejs.org/**
2. Click **"LTS"** (Long Term Support) - NOT "Current"
3. Download and install (v20.x or v18.x)

### Step 2: Verify Installation

```bash
node --version
# Should show v20.x.x or v18.x.x
```

### Step 3: Retry Build

```bash
cd "C:\Users\Dell\Desktop\IBRAHIMI STORE\desktop-app"
npm install
```

---

## ✅ Solution 2: Use NVM (Node Version Manager)

### Install NVM for Windows

1. Download: **https://github.com/coreybutler/nvm-windows/releases**
2. Install `nvm-setup.exe`
3. Run in Command Prompt (as Administrator):

```bash
# Install Node.js LTS
nvm install 20

# Use it
nvm use 20

# Verify
node --version
```

### Retry Build

```bash
cd "C:\Users\Dell\Desktop\IBRAHIMI STORE\desktop-app"
npm install
```

---

## Why This Happens

- **Node.js v25.x** is bleeding edge (latest)
- **Native modules** like `better-sqlite3` need time to catch up
- **LTS versions** (v18, v20) are stable and well-supported

---

## After Installing Correct Node Version

The build should complete successfully:

```bash
cd desktop-app
npm install          # Should work now
npm run build:win    # Build the app
```

---

## Alternative: I Can Update to sql.js

If you don't want to change Node.js version, I've already created an alternative version using `sql.js` which doesn't require native compilation.

Just let me know and I'll update all the files to use it!
