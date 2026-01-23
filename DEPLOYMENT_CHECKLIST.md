# ✅ Pre-Deployment Checklist

Use this checklist before deploying the Debt Management System to production.

---

## 📋 Code Review

### Files Created:
- [ ] `apps/api/src/routes/debt.routes.ts` exists
- [ ] `apps/web/app/(main)/debts/page.tsx` exists
- [ ] `DEBT_MANAGEMENT_SETUP.md` exists
- [ ] `DEBT_MANAGEMENT_SUMMARY.md` exists
- [ ] `QUICK_START_DEBTS.md` exists

### Files Modified:
- [ ] `packages/database/prisma/schema.prisma` - DebtStatus enum added
- [ ] `packages/database/prisma/schema.prisma` - CreditEntry enhanced
- [ ] `packages/database/prisma/schema.prisma` - DebtPayment model added
- [ ] `apps/api/src/index.ts` - debt routes registered
- [ ] `apps/api/src/routes/sales.routes.ts` - dueDate validation added
- [ ] `apps/web/components/CheckoutModal.tsx` - credit sale fields added
- [ ] `apps/web/app/(main)/layout.tsx` - Debts nav link added
- [ ] `apps/web/app/(main)/dashboard/page.tsx` - debt widget added

---

## 🗄️ Database

### Before Migration:
- [ ] Database backup created
- [ ] Checked for existing CreditEntry records
- [ ] Set default due dates for existing records (if any)

### Migration:
- [ ] Run: `cd packages/database`
- [ ] Run: `npx prisma generate`
- [ ] Run: `npx prisma migrate dev --name add-debt-management`
- [ ] No migration errors
- [ ] Prisma client regenerated successfully

### After Migration:
- [ ] DebtStatus enum exists in database
- [ ] CreditEntry.dueDate is NOT NULL
- [ ] CreditEntry.status uses enum
- [ ] CreditEntry.notes field exists
- [ ] DebtPayment table created
- [ ] All foreign keys intact

---

## 🔌 Backend API

### Endpoints:
- [ ] GET `/debts` returns debts list
- [ ] GET `/debts/debtors` returns customers with debts
- [ ] GET `/debts/summary` returns statistics
- [ ] GET `/debts/:id` returns single debt
- [ ] POST `/debts/:id/payments` records payment
- [ ] PATCH `/debts/:id` updates debt
- [ ] POST `/debts/batch-update-status` updates statuses

### Validation:
- [ ] Credit sale without due date fails
- [ ] Invalid payment amount rejected
- [ ] Authentication required on all endpoints
- [ ] Proper error messages returned

### Business Logic:
- [ ] Status calculation works (ACTIVE, DUE_SOON, OVERDUE, SETTLED)
- [ ] Payment updates balance correctly
- [ ] Customer outstanding balance syncs
- [ ] Invoice status updates properly
- [ ] Transaction rollback on errors

---

## 🎨 Frontend

### Pages:
- [ ] `/debts` page loads without errors
- [ ] Dashboard widget displays correctly
- [ ] Navigation link to Debts works

### Debtors Page (/debts):
- [ ] Summary cards show correct data
- [ ] Filter tabs work (All, Overdue, Due Soon, etc.)
- [ ] Debts table displays properly
- [ ] Status colors correct (red/yellow/green)
- [ ] Days until/past due calculated correctly
- [ ] "Record Payment" button appears
- [ ] Payment modal opens and works
- [ ] Data refreshes after payment

### Checkout Modal:
- [ ] Credit payment option available
- [ ] Due date field appears when CREDIT selected
- [ ] Due date field is required
- [ ] Cannot select past dates
- [ ] Notes field optional
- [ ] Form validation works
- [ ] Error messages display properly

### Dashboard Widget:
- [ ] Total outstanding displays
- [ ] Overdue/Due Soon/Active counts correct
- [ ] Visual indicators working
- [ ] "View All" link goes to /debts
- [ ] Alert box shows when needed

---

## 🧪 Testing

### Test Case 1: Create Credit Sale
- [ ] Start: Go to POS
- [ ] Add items to cart
- [ ] Select a customer
- [ ] Choose "CREDIT" payment
- [ ] Due date field appears
- [ ] Enter due date (tomorrow)
- [ ] Add optional notes
- [ ] Complete sale
- [ ] Success: Debt created
- [ ] Verify: Check `/debts` page

### Test Case 2: Status Logic
- [ ] Create debt with due date > 1 day away
- [ ] Status = ACTIVE (green)
- [ ] Create debt with due date tomorrow
- [ ] Status = DUE_SOON (yellow)
- [ ] Create debt with past due date
- [ ] Status = OVERDUE (red)

### Test Case 3: Record Payment
- [ ] Go to `/debts`
- [ ] Find a debt
- [ ] Click "Record Payment"
- [ ] Enter partial amount
- [ ] Submit
- [ ] Balance updated correctly
- [ ] Status unchanged (still has balance)
- [ ] Record another payment (full remaining)
- [ ] Status changes to SETTLED

### Test Case 4: Dashboard Integration
- [ ] Go to `/dashboard`
- [ ] Debt widget visible
- [ ] Data matches `/debts` page
- [ ] Click "View All"
- [ ] Navigates to `/debts`

### Test Case 5: Validation
- [ ] Try credit sale without due date
- [ ] Should fail with error message
- [ ] Try payment exceeding balance
- [ ] Should fail with error message

### Test Case 6: Edge Cases
- [ ] Try with Walk-in Customer
- [ ] Try with customer who has existing debt
- [ ] Try with zero-value payment
- [ ] Try with very large amounts
- [ ] Try with special characters in notes

---

## 🔒 Security

- [ ] All endpoints require authentication
- [ ] User permissions respected
- [ ] No sensitive data exposed in errors
- [ ] SQL injection protected (Prisma)
- [ ] XSS protection in place
- [ ] CSRF tokens if needed

---

## 📊 Performance

- [ ] Debt list loads quickly (<2s)
- [ ] No N+1 query issues
- [ ] Proper database indexes
- [ ] Efficient status calculations
- [ ] No memory leaks

---

## 📱 UI/UX

- [ ] Responsive design works on mobile
- [ ] Colors consistent with existing design
- [ ] Icons display correctly
- [ ] Loading states present
- [ ] Error states handled gracefully
- [ ] Success messages clear
- [ ] Tooltips helpful

---

## 📝 Documentation

- [ ] DEBT_MANAGEMENT_SETUP.md complete
- [ ] DEBT_MANAGEMENT_SUMMARY.md complete
- [ ] QUICK_START_DEBTS.md complete
- [ ] Code comments in complex sections
- [ ] API endpoints documented

---

## 🚀 Deployment

### Pre-Deployment:
- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Git commits made

### Production:
- [ ] Backup current production database
- [ ] Deploy database migration
- [ ] Deploy API changes
- [ ] Deploy frontend changes
- [ ] Verify deployment successful
- [ ] Run smoke tests on production

### Post-Deployment:
- [ ] Monitor logs for errors
- [ ] Test critical paths
- [ ] Verify data integrity
- [ ] Check performance metrics
- [ ] User acceptance testing

---

## 🎓 Training

- [ ] Team trained on new feature
- [ ] User manual updated
- [ ] Demo completed
- [ ] Support team briefed
- [ ] FAQ created

---

## 📞 Rollback Plan

- [ ] Database backup location documented
- [ ] Rollback procedure tested
- [ ] Rollback script ready
- [ ] Team knows rollback process

---

## ✅ Final Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Approved By:** _______________  
**Date:** _______________  

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 🎉 Ready for Production?

If all items are checked, you're ready to deploy!

**Deployment Command:**
```bash
npm run build
npm start
```

**Monitor:**
- Server logs
- Error tracking
- User feedback
- Performance metrics

---

**Good luck with your deployment! 🚀**
