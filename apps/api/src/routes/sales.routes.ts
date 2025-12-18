import { Router, Request, Response } from 'express';
import { PrismaClient, Role, InvoiceStatus, PaymentMethod } from '@repo/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { logAction } from '../services/audit.service';
import { sendInvoiceEmail } from '../services/email.service';
import { z, ZodError } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Schemas
const saleItemSchema = z.object({
    productId: z.number().int(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0), // Allow overriding price
    discount: z.number().min(0).default(0),
});

const createSaleSchema = z.object({
    customerId: z.union([z.number().int(), z.null(), z.undefined()]).optional(),
    items: z.array(saleItemSchema).min(1),
    tax: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
    paidAmount: z.number().min(0),
    paymentMethod: z.nativeEnum(PaymentMethod),
    paymentReference: z.string().optional(),
    exchangeRate: z.number().min(0).default(1),
    dueDate: z.string().optional(), // Will be validated as datetime when present
    debtNotes: z.string().optional(), // Optional notes for credit sales
});

// --- Customer Routes ---



// --- Sales / Invoice Routes ---

// Get all sales (Invoices) - Excludes lending-only invoices
router.get('/sales', authenticate, async (req: Request, res: Response) => {
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                // Exclude lending invoices (those starting with LEND-)
                NOT: {
                    invoiceNumber: {
                        startsWith: 'LEND-'
                    }
                }
            },
            include: {
                customer: true,
                user: { select: { name: true } }
            },
            orderBy: { date: 'desc' },
            take: 50 // Limit to recent 50 for now
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single invoice
router.get('/sales/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                user: { select: { name: true } },
                items: {
                    include: {
                        product: true
                    }
                },
                payments: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new Sale (POS)
router.post('/sales', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { customerId, items, tax, discount, paidAmount, paymentMethod, paymentReference, exchangeRate, dueDate, debtNotes } = createSaleSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await prisma.$transaction(async (tx) => {
            // Handle Guest/Walk-in Customer
            let finalCustomerId = customerId;
            if (!finalCustomerId) {
                const guest = await tx.customer.findFirst({ where: { name: 'Walk-in Customer' } });
                if (guest) {
                    finalCustomerId = guest.id;
                } else {
                    const newGuest = await tx.customer.create({
                        data: {
                            name: 'Walk-in Customer',
                            email: null,
                            phone: null,
                            address: 'Store Counter',
                        }
                    });
                    finalCustomerId = newGuest.id;
                }
            }

            // 1. Calculate totals
            let subtotal = 0;
            const invoiceItemsData = [];

            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Product ID ${item.productId} not found`);

                if (product.quantityOnHand < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name}`);
                }

                const lineTotal = item.quantity * item.unitPrice; // Simplified logic, discount per line is optional
                subtotal += lineTotal;

                invoiceItemsData.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: lineTotal,
                });

                // Deduct stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantityOnHand: product.quantityOnHand - item.quantity }
                });
            }

            const total = subtotal + tax - discount;
            let outstanding = total - paidAmount;

            // TOLERANCE FIX: If outstanding is very small (e.g. < 0.05), treat as 0
            // This handles rounding errors where AFG->USD conversion leaves dust like 0.0000001
            if (outstanding > 0 && outstanding < 0.05) {
                outstanding = 0;
            }

            // 2. Create Invoice
            // Generate simple invoice number
            const invoiceCount = await tx.invoice.count();
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`;

            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    customerId: finalCustomerId,
                    userId,
                    subtotal,
                    tax,
                    discount,
                    total,
                    exchangeRate,
                    totalLocal: Number(total) * Number(exchangeRate),
                    paidAmount,
                    outstandingAmount: outstanding < 0 ? 0 : outstanding, // Handle overpayment later?
                    status: outstanding <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
                    items: {
                        create: invoiceItemsData,
                    },
                },
            });

            // 3. Record Payment if any
            if (paidAmount > 0) {
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        customerId: finalCustomerId!,
                        amount: paidAmount,
                        method: paymentMethod,
                        reference: paymentReference,
                    },
                });
            }

            // 4. Handle Credit (Loan) if outstanding > 0 AND it is a real customer (optional check)
            // Even Walk-in can technically have credit if we track them, but usually not. 
            // For now, allow it to keep consistency.
            // 4. Handle Credit (Loan) if outstanding > 0 AND it is a real customer (optional check)
            if (outstanding > 0 && finalCustomerId) {
                // Use provided due date or default to 30 days from now
                const creditDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                // Calculate AFN equivalent of the outstanding amount at THIS MOMENT's rate
                // This "locks" the debt in AFN, preventing exchange rate fluctuations from affecting the owed amount in local currency.
                const outstandingAFN = Number(outstanding) * Number(exchangeRate);

                await tx.customer.update({
                    where: { id: finalCustomerId },
                    data: {
                        outstandingBalance: { increment: outstanding },
                        // @ts-ignore - Field might not exist in types yet if generation failed, but DB has it via push
                        outstandingBalanceAFN: { increment: outstandingAFN }
                    }
                });

                await tx.creditEntry.create({
                    data: {
                        customerId: finalCustomerId,
                        invoiceId: invoice.id,
                        originalAmount: outstanding,
                        // @ts-ignore
                        originalAmountAFN: outstandingAFN,
                        remainingBalance: outstanding,
                        // @ts-ignore
                        remainingBalanceAFN: outstandingAFN,
                        dueDate: creditDueDate,
                        notes: debtNotes || null,
                        status: 'ACTIVE'
                    }
                });
            }

            return invoice;
        });

        // Log Sale Creation
        await logAction(userId, 'CREATE_SALE', 'Invoice', result.id, { invoiceNumber: result.invoiceNumber, total: result.total });

        // Update Shop Balance - Add paid amount to balance
        if (paidAmount > 0) {
            try {
                const balanceSetting = await prisma.systemSetting.findUnique({
                    where: { key: 'shop_balance' }
                });
                const currentBalance = balanceSetting ? parseFloat(balanceSetting.value) : 0;
                const paidAmountAFN = Number(paidAmount) * Number(exchangeRate);
                const newBalance = currentBalance + paidAmountAFN;

                await prisma.systemSetting.upsert({
                    where: { key: 'shop_balance' },
                    update: { value: String(newBalance) },
                    create: {
                        key: 'shop_balance',
                        value: String(newBalance),
                        description: 'Shop Cash Balance (AFN)'
                    }
                });

                // Log the transaction
                await prisma.systemSetting.create({
                    data: {
                        key: `balance_log_${Date.now()}`,
                        value: JSON.stringify({
                            type: 'SALE',
                            amount: paidAmountAFN,
                            description: `Sale #${result.invoiceNumber} - Payment received`,
                            referenceId: result.id,
                            timestamp: new Date().toISOString()
                        }),
                        description: 'Balance Transaction: SALE'
                    }
                });
            } catch (error) {
                console.error('Failed to update shop balance after sale:', error);
                // Don't fail the sale if balance update fails
            }
        }

        // Send Invoice Email (Fire and forget)
        if (result.customerId) {
            // Fetch fresh customer data to get email (result might only have ID depending on prisma return)
            // But we can check if we loaded it. result is from transaction, typically returns model.
            // Let's safe fetch or use available data if we eager loaded? Transaction return is just `invoice`.
            // The `invoice` created in tx doesn't include relation unless include is used.
            // But we have finalCustomerId.

            // We'll run this async without awaiting to return response faster
            prisma.customer.findUnique({ where: { id: result.customerId } }).then(customer => {
                if (customer && customer.email) {
                    sendInvoiceEmail(customer.email, { ...result, customer });
                }
            });
        }

        res.status(201).json(result);

    } catch (error: any) {
        if (error instanceof ZodError) return res.status(400).json({ errors: error.issues });
        // Basic error handling
        if (error.message.includes('Insufficient stock')) return res.status(400).json({ message: error.message });
        if (error.message.includes('Product ID')) return res.status(404).json({ message: error.message });

        // Check for "Foreign key constraint failed" for customer
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid Customer ID' });
        }

        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper to verify admin password
const verifyAdminPassword = async (providedPassword: string, currentUser: any) => {
    try {
        if (!providedPassword) {
            console.log('No password provided');
            return false;
        }

        // Use current user if they are admin, otherwise find a global admin
        let targetAdmin = null;

        if (currentUser && currentUser.role === Role.ADMIN) {
            // We need to fetch the full user to get the password hash (req.user might be partial from token)
            targetAdmin = await prisma.user.findUnique({ where: { id: currentUser.id } });
        } else {
            // Find any admin to act as "Master Key" verifier
            targetAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
        }

        if (!targetAdmin) {
            console.log('No admin user found');
            return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(providedPassword, targetAdmin.password);
        console.log('Password verification result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Error in verifyAdminPassword:', error);
        return false;
    }
};

// Delete a Sale (Admin Key Required)
router.delete('/sales/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { adminPassword } = req.body;

        // STRICT VERIFICATION: Always require password for destructive actions
        const isAuthorized = await verifyAdminPassword(adminPassword, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Invalid Admin Key. Deletion unauthorized.' });
        }

        // 2. Process Deletion & Stock Restoration
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: Number(id) },
                include: { items: true }
            });

            if (!invoice) throw new Error('Invoice not found');

            // Restore Stock
            for (const item of invoice.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantityOnHand: { increment: item.quantity } }
                });
            }

            // Revert Customer Credit if applicable
            if (invoice.outstandingAmount.toNumber() > 0 && invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { outstandingBalance: { decrement: invoice.outstandingAmount } }
                });
            }

            // Delete Association (Payments, Items, CreditEntries)
            await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
            await tx.payment.deleteMany({ where: { invoiceId: invoice.id } });
            await tx.creditEntry.deleteMany({ where: { invoiceId: invoice.id } });

            // Finally Delete Invoice
            await tx.invoice.delete({ where: { id: Number(id) } });
        });

        // Log Sale Deletion
        await logAction(req.user?.id || 0, 'DELETE_SALE', 'Invoice', String(id), { reason: 'Admin Deletion' });

        res.json({ message: 'Sale deleted and stock restored successfully' });

    } catch (error: any) {
        console.error('Delete Error:', error);
        res.status(500).json({ message: error.message || 'Failed to delete sale' });
    }
});

// BULK DELETE Sales (Admin Key Required)
router.post('/bulk-delete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { ids, adminPassword } = req.body; // ids: number[]

        // STRICT VERIFICATION
        const isAuthorized = await verifyAdminPassword(adminPassword, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Invalid Admin Key. Bulk deletion unauthorized.' });
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No IDs provided' });
        }

        // 2. Process Batch
        await prisma.$transaction(async (tx) => {
            for (const id of ids) {
                const invoice = await tx.invoice.findUnique({
                    where: { id: Number(id) },
                    include: { items: true }
                });

                if (!invoice) continue; // Skip if not found

                // Restore Stock
                for (const item of invoice.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantityOnHand: { increment: item.quantity } }
                    });
                }

                // Revert Credit
                if (invoice.outstandingAmount.toNumber() > 0 && invoice.customerId) {
                    await tx.customer.update({
                        where: { id: invoice.customerId },
                        data: { outstandingBalance: { decrement: invoice.outstandingAmount } }
                    });
                }

                // Delete Relations
                await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
                await tx.payment.deleteMany({ where: { invoiceId: invoice.id } });
                await tx.creditEntry.deleteMany({ where: { invoiceId: invoice.id } });

                // Delete Invoice
                await tx.invoice.delete({ where: { id: Number(id) } });
            }
        });

        await logAction(req.user?.id || 0, 'BULK_DELETE_SALE', 'Invoice', 'BULK', { count: ids.length });

        res.json({ message: `Successfully deleted ${ids.length} sales.` });

    } catch (error: any) {
        console.error('Bulk Delete Error:', error);
        res.status(500).json({ message: error.message || 'Failed to process bulk delete' });
    }
});

// Return Items from a Sale (Admin Key Required)
router.post('/sales/:id/return', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { items, adminPassword } = req.body; // items: { itemId: number, quantity: number }[]

        // 1. Strict Authorization
        const isAuthorized = await verifyAdminPassword(adminPassword, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Invalid Admin Key. Return unauthorized.' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No items provided for return' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: Number(id) },
                include: { items: true }
            });

            if (!invoice) throw new Error('Invoice not found');

            let totalRefundValue = 0;
            let totalRefundValueAFN = 0; // For debt adjustment

            for (const returnRequest of items) {
                const invoiceItem = invoice.items.find(i => i.id === returnRequest.itemId);
                if (!invoiceItem) throw new Error(`Item ID ${returnRequest.itemId} not found in this invoice`);

                // Validate Quantity
                // @ts-ignore
                const currentReturnable = invoiceItem.quantity - (invoiceItem.returnedQuantity || 0);
                if (returnRequest.quantity > currentReturnable) {
                    throw new Error(`Cannot return ${returnRequest.quantity} of item ${invoiceItem.id}. Only ${currentReturnable} remaining.`);
                }
                if (returnRequest.quantity <= 0) continue;

                // 1. Update Invoice Item
                await tx.invoiceItem.update({
                    where: { id: invoiceItem.id },
                    // @ts-ignore
                    data: { returnedQuantity: { increment: returnRequest.quantity } }
                });

                // 2. Restore Stock
                await tx.product.update({
                    where: { id: invoiceItem.productId },
                    data: { quantityOnHand: { increment: returnRequest.quantity } }
                });

                // Calculate Value
                const refundLineValue = Number(invoiceItem.unitPrice) * returnRequest.quantity;
                totalRefundValue += refundLineValue;
            }

            // 3. Financial Adjustment
            // Exchange Rate at time of invoice used for value consistency?
            const rate = Number(invoice.exchangeRate);
            totalRefundValueAFN = totalRefundValue * rate;

            let remainingRefund = totalRefundValue;

            // Scenario A: Customer has Debt on THIS invoice
            if (Number(invoice.outstandingAmount) > 0) {
                const debtToReduce = Math.min(Number(invoice.outstandingAmount), remainingRefund);

                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: { outstandingAmount: { decrement: debtToReduce } }
                });

                if (invoice.customerId) {
                    const debtToReduceAFN = debtToReduce * rate;
                    // Verify if this matches exact logic of debt creation? Yes, locked at creation rate usually.

                    await tx.customer.update({
                        where: { id: invoice.customerId },
                        data: {
                            outstandingBalance: { decrement: debtToReduce },
                            // @ts-ignore
                            outstandingBalanceAFN: { decrement: debtToReduceAFN }
                        }
                    });

                    // Update Credit Entry?
                    // Ideally yes, but complexity. Let's stick to Customer Balance for now as it's the source of truth for display.
                }
                remainingRefund -= debtToReduce;
            }

            // Scenario B: Money needs to be returned (Refund)
            // If remainingRefund > 0, it means they paid for this item.
            // We should record a negative payment or "Refund" type payment?
            // For now, let's just log it. The cashier gives cash back.
            // To balance the drawer, we create a NEGATIVE payment.
            if (remainingRefund > 0) {
                await tx.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        customerId: invoice.customerId || 0, // 0 for Walk-in? Need valid ID.
                        // If walk-in (null customerId), handle gracefully?
                        // DB schema says customerId Int. Walk-in has an ID usually.
                        amount: -remainingRefund,
                        // @ts-ignore
                        amountAFN: -(remainingRefund * rate),
                        method: PaymentMethod.CASH, // Default to Cash refund
                        reference: 'RETURN REFUND'
                    }
                });
            }

            return { totalRefundValue };
        });

        await logAction(req.user?.id || 0, 'RETURN_ITEMS', 'Invoice', String(id), { refund: result.totalRefundValue });

        res.json({ message: 'Items returned successfully', refund: result.totalRefundValue });

    } catch (error: any) {
        console.error('Return Error:', error);
        res.status(500).json({ message: error.message || 'Failed to process return' });
    }
});

// DELETE ALL Sales History (Admin Key Required - Nuclear Option)
router.post('/delete-all', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
        const { adminPassword } = req.body;

        // STRICT VERIFICATION
        const isAuthorized = await verifyAdminPassword(adminPassword, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Invalid Admin Key. Cannot delete all sales history.' });
        }

        // Delete ALL sales data (NUCLEAR OPTION)
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get all invoices for stock restoration
            const allInvoices = await tx.invoice.findMany({
                include: { items: true }
            });

            // 2. Restore stock for all items
            for (const invoice of allInvoices) {
                for (const item of invoice.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantityOnHand: { increment: item.quantity } }
                    });
                }
            }

            // 3. Reset all customer outstanding balances to 0
            await tx.customer.updateMany({
                data: { 
                    outstandingBalance: 0,
                    outstandingBalanceAFN: 0
                }
            });

            // 4. Delete all related data
            await tx.invoiceItem.deleteMany({});
            await tx.payment.deleteMany({});
            await tx.creditEntry.deleteMany({});
            await tx.debtPayment.deleteMany({});

            // 5. Delete all invoices
            const deletedCount = await tx.invoice.deleteMany({});

            return { deletedCount: deletedCount.count, invoicesProcessed: allInvoices.length };
        });

        // Log the nuclear action
        await logAction(
            req.user?.id || 0, 
            'DELETE_ALL_SALES', 
            'Invoice', 
            'ALL', 
            { deletedCount: result.deletedCount }
        );

        res.json({ 
            message: `Successfully deleted ALL sales history (${result.deletedCount} invoices). Stock restored, customer balances reset.`,
            deletedCount: result.deletedCount
        });

    } catch (error: any) {
        console.error('Delete All Sales Error:', error);
        res.status(500).json({ message: error.message || 'Failed to delete all sales history' });
    }
});

export default router;
