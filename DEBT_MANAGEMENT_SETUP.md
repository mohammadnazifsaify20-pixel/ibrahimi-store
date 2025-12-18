# Debt Management System - Migration & Setup Guide

## Overview
This guide will help you deploy the new Debt/Credit Management feature to your production system.

## Database Migration Steps

### 1. Navigate to Database Package
```bash
cd packages/database
```

### 2. Generate Prisma Client with Updated Schema
```bash
npx prisma generate
```

### 3. Create and Apply Migration
```bash
npx prisma migrate dev --name add-debt-management-system
```

For production (after testing):
```bash
npx prisma migrate deploy
```

### 4. Verify Migration
Check that these changes were applied:
- `DebtStatus` enum created (ACTIVE, DUE_SOON, OVERDUE, SETTLED)
- `CreditEntry` model updated with:
  - `dueDate` (now required)
  - `notes` field
  - `status` using DebtStatus enum
- `DebtPayment` model created for payment tracking

## Installation & Deployment

### 1. Install Dependencies (if needed)
```bash
# From root directory
npm install
# or
pnpm install
```

### 2. Build the Application
```bash
npm run build
```

### 3. Start the Services

**Development:**
```bash
# Terminal 1 - API Server
cd apps/api
npm run dev

# Terminal 2 - Web App
cd apps/web
npm run dev
```

**Production:**
```bash
npm start
```

## Feature Overview

### What's New:

#### 1. **Automatic Debt Creation**
- Credit sales automatically create debt records
- Due date is MANDATORY for credit sales
- No manual debt entry needed

#### 2. **Smart Status Management**
- **ACTIVE**: More than 1 day before due date
- **DUE_SOON**: Within 24 hours of due date
- **OVERDUE**: Past due date
- **SETTLED**: Balance = 0
- Status updates automatically based on current date

#### 3. **Enhanced Checkout Flow**
- Credit payment option shows due date field (required)
- Optional notes field for payment terms
- Validation prevents credit sales without due date

#### 4. **Debtors Dashboard** (`/debts`)
- View all active debts with real-time status
- Filter by: All Active, Overdue, Due Soon, Active, Settled
- Visual indicators (red/yellow/green)
- Quick payment recording
- Shows days until/past due date

#### 5. **Payment Management**
- Record partial or full payments
- Automatic balance updates
- Payment history tracking
- Multiple payment methods supported

#### 6. **Dashboard Widget**
- Real-time debt summary
- Total outstanding amount (AFN & USD)
- Count of overdue/due soon/active debts
- Visual alerts for action needed
- Quick link to debt management

## API Endpoints

### Debt Management Routes
```
GET    /debts                     - List all debts
GET    /debts/debtors            - List customers with debts
GET    /debts/summary            - Get debt statistics
GET    /debts/:id                - Get single debt details
POST   /debts/:id/payments       - Record a payment
PATCH  /debts/:id                - Update debt (notes, due date)
POST   /debts/batch-update-status - Update all debt statuses
```

### Sales Route Updates
```
POST   /sales                    - Now accepts dueDate and debtNotes
                                  - dueDate required for credit sales
```

## Testing Checklist

### Before Going Live:

- [ ] Database migration completed successfully
- [ ] API server starts without errors
- [ ] Web app builds and runs
- [ ] Can create a credit sale with due date
- [ ] Debt appears in `/debts` page
- [ ] Status colors show correctly
- [ ] Can record a payment
- [ ] Balance updates after payment
- [ ] Dashboard widget displays correctly
- [ ] Navigation link to "Debts" works

### Test Scenarios:

1. **Create Credit Sale**
   - Go to POS
   - Add items
   - Select "CREDIT" payment
   - Enter due date (required)
   - Complete sale
   - Verify debt created

2. **Check Status Logic**
   - Create debt with due date tomorrow → Status: ACTIVE
   - Create debt with due date today → Status: DUE_SOON
   - Create debt with past due date → Status: OVERDUE

3. **Record Payment**
   - Go to `/debts`
   - Find a debt
   - Click "Record Payment"
   - Enter amount
   - Submit
   - Verify balance updated

4. **Dashboard Widget**
   - Navigate to `/dashboard`
   - Check debt summary displays
   - Click "View All" → Should go to `/debts`

## Troubleshooting

### Migration Issues

**Error: "dueDate is required"**
- Existing CreditEntry records without dueDate will fail
- Solution: Set a default due date for existing records before migration

**Fix command:**
```sql
-- Run before migration if you have existing credit entries
UPDATE "CreditEntry" 
SET "due_date" = CURRENT_DATE + INTERVAL '30 days'
WHERE "due_date" IS NULL;
```

### API Errors

**"DebtStatus is not defined"**
- Run: `npx prisma generate` in packages/database

**"Cannot find module './routes/debt.routes'"**
- Ensure debt.routes.ts was created in apps/api/src/routes/
- Check import in index.ts

### Frontend Issues

**"/debts page not found"**
- Verify file exists at: `apps/web/app/(main)/debts/page.tsx`
- Check file permissions

**"api.get is not a function"**
- Check api.ts configuration
- Verify base URL is set correctly

## Production Considerations

### 1. Scheduled Status Updates
Consider setting up a cron job to update debt statuses:

```javascript
// Example: Every hour
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  await fetch('https://your-api.com/debts/batch-update-status', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  });
});
```

### 2. Email Notifications
Implement automated reminders:
- 3 days before due date
- 1 day before due date
- On due date
- Daily after overdue

### 3. Backup Considerations
- Always backup database before migration
- Test migration in staging environment first
- Have rollback plan ready

### 4. Performance
- Add indexes for frequently queried fields:
```prisma
@@index([status])
@@index([dueDate])
@@index([customerId])
```

## Rollback Plan

If you need to revert:

```bash
# Revert last migration
cd packages/database
npx prisma migrate resolve --rolled-back [migration_name]

# Or restore from backup
# Restore database from backup taken before migration
```

## Support & Maintenance

### Regular Maintenance Tasks:
1. Monitor overdue debts daily
2. Review debt summary weekly
3. Reconcile payments monthly
4. Archive settled debts annually

### Monitoring:
- Track total outstanding amount trend
- Monitor overdue rate
- Review payment collection time

## Notes

- All amounts stored in USD, displayed in AFN using exchange rate
- Exchange rate locked at time of debt creation
- Status calculation is automatic - no manual updates needed
- Payment history is immutable - cannot delete payments
- Debts marked SETTLED are hidden by default but retained for records

---

## Quick Start Commands

```bash
# 1. Migrate Database
cd packages/database && npx prisma generate && npx prisma migrate dev --name add-debt-management

# 2. Start Development
npm run dev

# 3. Access Application
# Web: http://localhost:3000
# API: http://localhost:5000
```

---

**Deployment Date:** [Fill in]  
**Deployed By:** [Fill in]  
**Version:** 2.0 - Debt Management System
