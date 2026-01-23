# 🚀 QUICK START - Debt Management

## ⚡ 3-Step Deployment

### Step 1: Migrate Database (5 min)
```bash
cd packages/database
npx prisma generate
npx prisma migrate dev --name add-debt-management
```

### Step 2: Start Application (1 min)
```bash
# From root directory
npm run dev
```

### Step 3: Test (2 min)
1. Go to POS
2. Create sale with "CREDIT" payment
3. Set due date
4. Complete sale
5. Check `/debts` page

---

## 📍 Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| Debtors Dashboard | `/debts` | Manage all debts |
| Main Dashboard | `/dashboard` | View summary widget |
| POS | `/pos` | Create credit sales |

---

## 🎨 Visual Guide

### Credit Sale Flow:
```
POS → Add Items → Select Customer → 
Choose "CREDIT" → Set Due Date (required) → 
Add Notes (optional) → Complete Sale → 
✅ Debt Created Automatically
```

### Status Colors:
- 🟢 **Green** = ACTIVE (Safe)
- 🟡 **Yellow** = DUE_SOON (Alert)
- 🔴 **Red** = OVERDUE (Urgent)
- ⚪ **Gray** = SETTLED (Paid)

---

## 🔧 Common Tasks

### Record Payment:
1. Go to `/debts`
2. Find debt row
3. Click "Record Payment"
4. Enter amount
5. Submit
6. ✅ Balance updates

### Check Overdue:
1. Go to `/debts`
2. Click "Overdue" tab
3. See red status debts

### View Summary:
1. Go to `/dashboard`
2. Check "Debt Management Overview" widget
3. See total outstanding

---

## ⚠️ Important Rules

✅ **DO:**
- Set realistic due dates
- Record payments promptly
- Monitor overdue debts daily
- Keep notes for reference

❌ **DON'T:**
- Skip due date for credit sales
- Delete payment records
- Ignore overdue alerts

---

## 🆘 Quick Fixes

**Due date field not showing?**
→ Make sure "CREDIT" payment is selected

**Can't create credit sale?**
→ Due date is required, check validation

**Debt not appearing?**
→ Refresh page, check filters

**Payment not updating?**
→ Check console for errors, verify amount

---

## 📞 Need Help?

1. Read `DEBT_MANAGEMENT_SETUP.md` for details
2. Check `DEBT_MANAGEMENT_SUMMARY.md` for overview
3. Review console logs for errors
4. Verify database migration ran successfully

---

## 🎯 Success Checklist

- [ ] Database migrated
- [ ] Application running
- [ ] Can create credit sale
- [ ] Due date field appears
- [ ] Debt shows in `/debts`
- [ ] Can record payment
- [ ] Dashboard widget shows
- [ ] Status colors correct

---

**Version:** 2.0  
**Last Updated:** December 18, 2025  
**System:** Debt Management Module

---

*You're all set! 🎉*
