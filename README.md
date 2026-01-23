# 🏎️ Ibrahimi Store Management System

![Project Banner](https://placehold.co/1200x400?text=Ibrahimi+Store+System)
<!-- Replace with actual banner later -->

> A comprehensive, full-stack Point of Sale (POS) and Inventory Management System designed specifically for motor parts retail. Features bilingual invoicing, multi-currency support (USD/AFN), and robust customer credit tracking.

---

## 📋 Table of Contents

- [🚀 Project Overview](#-project-overview)
- [✨ Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [📱 Installation & Setup](#-installation--setup)
- [🔧 Configuration](#-configuration-options)
- [🚀 Deployment](#-deployment-instructions)
- [📚 User Guide](#-user-guide)
- [🔒 Security](#-security-notes)
- [🤝 Contributing](#-contributing-guidelines)
- [📄 License](#-license)

---

## 🚀 Project Overview

The **Ibrahimi Store System** is a modern web application built to streamline operations for auto parts businesses. It replaces manual bookkeeping with a digital ledger that handles stock levels, sales, debts, and expense tracking.

Crucially, it handles the complexity of operating in dual currencies (USD and AFN), allowing for fixed local pricing while maintaining accurate cost tracking in USD.

---

## ✨ Key Features

### 🛍️ Point of Sale (POS)
- **Fast Checkout**: Barcode scanning and quick product search.
- **Smart Cart**: Dynamic tax, discount, and total calculations.
- **Dual Currency**: Displays totals in AFN based on real-time or fixed rates.
- **Invoice Generation**: Bilingual (English/Dari) invoices with professional branding.

### 📦 Inventory Management
- **Stock Tracking**: Real-time updates on quantity and reorder alerts.
- **Pricing Control**: Support for Cost Price (USD), Sale Price (USD), and Fixed Sale Price (AFN).
- **Label Printing**: Generate A4 sheets of QR/Barcodes for products (33 labels/sheet).

### 👥 Customer Management
- **Digital Ledger**: Track purchase history and outstanding balances.
- **Credit System**: "Pay Later" functionality with debt tracking in AFN to prevent exchange rate losses.
- **ID Cards**: Generate and print VIP Customer ID cards.

### 💰 Financials
- **Expense Tracking**: Log operational expenses with category breakdown.
- **Secure Deletion**: Admin password protection for deleting sensitive records (Sales/Expenses).
- **Reporting**: Visual dashboards for sales performance and audit logs.

---

## 🛠 Tech Stack

This project uses a high-performance Monorepo architecture.

### **Core**
- **Monorepo Manager**: [Turborepo](https://turbo.build/)
- **Package Manager**: `npm`

### **Frontend (`apps/web`)**
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: Headless UI, Lucide React
- **Printing**: Custom print CSS for A4 labels and thermal receipts

### **Backend (`apps/api`)**
- **Runtime**: Node.js / Express.js
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod

### **Infrastructure**
- **Containerization**: Docker & Docker Compose

---

## 📱 Installation & Setup

Follow these steps to get the system running locally.

### Prerequisites
- Node.js (v18+)
- Docker Desktop (for Database)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ibrahimi-store.git
cd ibrahimi-store
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
Ensure Docker is running, then start the PostgreSQL container:
```bash
docker-compose up -d
```
*Note: This creates a database on localhost:5432 with credentials defined in `docker-compose.yml`.*

### 4. Configure Environment
Create `.env` files in both `apps/web` and `apps/api` (or a root `.env` if configured) mirroring the examples.

**`apps/api/.env`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ibrahimi_store?schema=public&client_encoding=UTF8"
JWT_SECRET="your-super-secret-key"
PORT=3001
```

**`apps/web/.env`**:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 5. Initialize Schema
Push the Prisma schema to your database:
```bash
npx prisma db push
npx prisma generate
```

### 6. Start Development Server
Run the app in development mode:
```bash
npm run dev
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:3001](http://localhost:3001)

---

## 📚 User Guide

### For Cashiers
1.  **Login**: Access the POS via `/login`.
2.  **Sell**: Go to **POS**. Scan items or search by name.
    *   *Tip: Use the "Pay Later" button for credit customers.*
3.  **Checkout**: Enter payment amount. Converting AFN/USD handled automatically.

### For Admins
1.  **Inventory**: Go to **Inventory** to add products.
    *   Set **Fixed Price (AFN)** to lock local prices.
    *   Select items and click **Print Labels** to generate stickers.
2.  **Reports**: Check **Dashboard** for daily sales stats.
3.  **Security**: Use your Admin Password to authorized deletions in Sales History and Expenses.

---

## 🔧 Configuration Options

### Currency Settings
You can adjust the global Exchange Rate in the **Settings** page.
- **Dynamic Rate**: Updates USD prices to AFN automatically.
- **Fixed Pricing**: Products with a set "Fixed Price AFN" ignore this rate.

### Printing Config
The system is optimized for **A4** printing for labels and invoices.
- **Margins**: Set print margins to **None** in browser settings for best results.
- **Scale**: Keep scale at **100%**.

---

## 🔒 Security Notes

- **Role-Based Access**:
    - `ADMIN`: Full access + deletion capabilities.
    - `CASHIER`: POS and Sales view only.
- **Sensitive Actions**: Deleting a sale or expense requires the **Admin Master Password**.
- **Data Safety**: All critical inputs are validated with **Zod** schema validation.

---

## 📈 Performance & Optimization

- **Database**: Prisma indexes are configured for `sku`, `invoiceNumber`, and `customerId` for fast lookups.
- **Frontend**: Cached data fetching and optimistic UI updates for snappy POS experience.
- **Cleanup**: Unused resources are automatically pruned to keep the build lightweight.

---

## ❗ Troubleshooting

### "Prisma Client not found"
If you see errors related to Prisma Client, simple regenerate it:
```bash
npx prisma generate
```

### "Connection Refused" (Database)
Check if your Docker container is running:
```bash
docker ps
```
If not, restart it: `docker-compose up -d`.

### "ReferenceError: currentBalanceAFG is not defined"
This is a known legacy error. Ensure you are on the latest commit where variables have been strictly typed and renamed.

---

## 🤝 Contributing Guidelines

We welcome contributions!
1.  **Fork** the repository.
2.  Create a feature branch: `git checkout -b feature/amazing-feature`.
3.  Commit changes: `git commit -m 'Add amazing feature'`.
4.  Push to branch: `git push origin feature/amazing-feature`.
5.  Open a **Pull Request**.

---

## 📄 License

This project is proprietary software developed for **Ibrahimi & Brothers Motor Parts L.L.C**.
Unauthorized distribution or commercial use is prohibited.

---

## 🙌 Acknowledgments

- **Next.js Team** for the incredible React framework.
- **Turborepo** for making monorepo management a breeze.
- **Lucide** for the clean and scalable icon set.

---

*Documentation generated by Antigravity AI.*
