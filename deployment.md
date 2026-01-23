# Deployment & Usage Guide - Motor Parts Shop

This project is a monorepo managed by Turborepo. It contains:
- **Web App**: Next.js (Admin & POS)
- **Mobile App**: Expo (Android/iOS)
- **API**: Express.js
- **Database**: PostgreSQL with Prisma

## Prerequisites
- Node.js (v18+)
- PostgreSQL (Running locally or hosted)
- VS Code (Recommended)

## 1. Environment Setup

Ensure you have a `.env` file in `packages/database` with your database connection string:
```env
# packages/database/.env
DATABASE_URL="postgresql://user:password@localhost:5432/motor_parts_db?client_encoding=UTF8"
```

Push the schema to the database:
```bash
npx turbo run db:push
```

## 2. Running the Project (Dev Mode)

To start all applications (Web, API, Mobile) simultaneously:
```bash
npm run dev
```
- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Mobile Bundler**: Press `a` in the terminal to open on Android Emulator (if running).

## 3. Building for Production

### Web App
```bash
cd apps/web
npm run build
npm start
```

### Mobile App (APK/IPA)
You need to use EAS Build or build locally with Android Studio/Xcode.
```bash
cd apps/mobile
npm install -g eas-cli
eas build -p android --profile preview
```

## 4. Troubleshooting
- **Web Build Errors**: If you encounter React type errors, ensure you are using the specific dependencies version pinned in `apps/web/package.json`. The root `package.json` has `overrides` to enforce React 18 types.
- **Mobile Start Issues**: Clear Metro cache with `npx expo start -c`.

## 5. Default Login
(If you haven't created users yet, run the seed script if available, or register via the API)
- User: `admin@ibrahimistore.com` (Example)
- Password: `securepassword`
