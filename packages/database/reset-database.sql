-- Reset Database - Delete all data in correct order (respects foreign keys)

-- 1. Delete DebtPayments (depends on CreditEntry)
DELETE FROM "DebtPayment" WHERE true;

-- 2. Delete InvoiceItems (depends on Invoice and Product)
DELETE FROM "InvoiceItem" WHERE true;

-- 3. Delete Payments (depends on Invoice and Customer)
DELETE FROM "Payment" WHERE true;

-- 4. Delete CreditEntries (depends on Invoice and Customer)
DELETE FROM "CreditEntry" WHERE true;

-- 5. Delete Invoices (depends on Customer)
DELETE FROM "Invoice" WHERE true;

-- 6. Delete Expenses
DELETE FROM "Expense" WHERE true;

-- 7. Delete Products
DELETE FROM "Product" WHERE true;

-- 8. Delete Customers
DELETE FROM "Customer" WHERE true;

-- 9. Delete SystemSettings
DELETE FROM "SystemSetting" WHERE true;

-- 10. Delete AuditLogs
DELETE FROM "AuditLog" WHERE true;

-- 11. Delete Users (keep admin if needed, or delete all)
DELETE FROM "User" WHERE true;

-- Database reset complete. All tables are now empty.
