import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@repo/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { logAction } from '../services/audit.service';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const generateDisplayId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const first = letters.charAt(Math.floor(Math.random() * letters.length));
    const second = letters.charAt(Math.floor(Math.random() * letters.length));
    const fiveNumbers = Math.floor(10000 + Math.random() * 90000).toString();
    return first + second + fiveNumbers;
};

// Update Schema to allow displayId
const customerSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    creditLimit: z.number().min(0).default(0),
    paymentTerms: z.string().optional(),
    displayId: z.string().optional(), // Allow manual override if needed
});

// GET all customers
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { status } = req.query; // 'active' | 'archived' | 'all'

        let where: any = {};
        if (status === 'archived') {
            where.isActive = false;
        } else if (status === 'all') {
            // No filter
        } else {
            // Default to active
            where.isActive = true;
        }

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { invoices: true }
                }
            }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Toggle Customer Status (Archive/Restore)
router.put('/:id/toggle-status', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({ where: { id: Number(id) } });

        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        const updated = await prisma.customer.update({
            where: { id: Number(id) },
            data: { isActive: !customer.isActive }
        });

        res.json({
            message: `Customer ${updated.isActive ? 'restored' : 'archived'} successfully`,
            customer: updated
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET single customer
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: Number(id) },
            include: {
                invoices: {
                    orderBy: { date: 'desc' },
                    take: 20 // Recent history
                },
                payments: {
                    orderBy: { date: 'desc' },
                    take: 20
                }
            }
        });
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const data = customerSchema.parse(req.body);
        console.log('Creating customer:', data);

        let displayId = data.displayId;
        let customer;
        let retries = 0;

        // Auto-generate ID if not provided
        if (!displayId) {
            while (retries < 3) {
                try {
                    displayId = generateDisplayId();
                    customer = await prisma.customer.create({
                        data: { ...data, displayId }
                    });
                    break; // Success
                } catch (error: any) {
                    // Check for unique constraint violation on displayId
                    if (error.code === 'P2002' && error.meta?.target?.includes('display_id')) {
                        retries++;
                        console.log('Duplicate displayId generated, retrying...');
                        continue;
                    }
                    throw error; // Other error
                }
            }
            if (!customer) throw new Error('Failed to generate unique Customer ID');
        } else {
            customer = await prisma.customer.create({ data });
        }

        res.status(201).json(customer);
    } catch (error) {
        if (error instanceof ZodError) return res.status(400).json({ errors: error.issues });
        console.error('Failed to create customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// UPDATE customer
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = customerSchema.partial().parse(req.body); // Allow partial updates

        // Prevent updating displayId manually
        if (data.displayId) {
            delete data.displayId;
        }

        const customer = await prisma.customer.update({
            where: { id: Number(id) },
            data
        });
        res.json(customer);
    } catch (error) {
        if (error instanceof ZodError) return res.status(400).json({ errors: error.issues });

        // Record not found
        if ((error as any).code === 'P2025') {
            return res.status(404).json({ message: 'Customer not found' });
        }

        console.error('Failed to update customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// POST Payment (Pay off debt)
router.post('/:id/payment', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const paymentSchema = z.object({
            amount: z.number().refine(val => val !== 0, "Amount cannot be zero"),
            amountAFN: z.number().optional(), // Allow passing exact AFN amount
            method: z.string().default('CASH'),
            reference: z.string().optional(),
            exchangeRate: z.number().optional() // Rate used for this payment
        });

        const { amount, amountAFN, method, reference, exchangeRate } = paymentSchema.parse(req.body);

        // Derive AFN amount if not provided: amount * rate.
        // If rate is not provided, we might have issues.
        // But for now, let's assume if amountAFN stands, we use it. 
        // If not, we assume amount * 1 (USD payment?) No, shop is AFN.
        // Let's rely on frontend sending amountAFN or we estimate.
        // Fallback: If no AFN, we don't update AFN balance? No, that causes drift.
        // We MUST update AFN balance.
        // Let's fetch system rate if missing?
        // Better: Use `amount * (exchangeRate || 1)`.

        const effectiveRate = exchangeRate || 1;
        // Note: Ideally fetch current rate from settings if not passed.

        const finalAmountAFN = amountAFN || (Number(amount) * effectiveRate);

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({
                where: { id: Number(id) }
            });

            if (!customer) throw new Error('Customer not found');

            // 1. Create Payment Record (General Payment)
            const payment = await tx.payment.create({
                data: {
                    customerId: customer.id,
                    amount,
                    // @ts-ignore
                    amountAFN: finalAmountAFN,
                    method: 'CASH', // simplified for now, or map to enum if needed
                    reference: reference || 'Debt Repayment',
                }
            });

            // 2. Decrement Outstanding Balance
            // If they pay MORE than balance, it goes negative (Credit) - which is allowed/correct.
            const updatedCustomer = await tx.customer.update({
                where: { id: customer.id },
                data: {
                    outstandingBalance: { decrement: amount },
                    // @ts-ignore
                    outstandingBalanceAFN: { decrement: finalAmountAFN }
                }
            });

            // 3. FIFO Invoice Reconciliation
            // Find all unpaid or partial invoices, oldest first
            const unpaidInvoices = await tx.invoice.findMany({
                where: {
                    customerId: customer.id,
                    status: { in: ['DRAFT', 'PARTIAL', 'OVERDUE'] },
                    outstandingAmount: { gt: 0 }
                },
                orderBy: { date: 'asc' }
            });

            let remainingPayment = Number(amount);

            for (const invoice of unpaidInvoices) {
                if (remainingPayment <= 0) break;

                const outstanding = Number(invoice.outstandingAmount);
                const paymentToApply = Math.min(remainingPayment, outstanding);

                if (paymentToApply > 0) {
                    const newPaidAmount = Number(invoice.paidAmount) + paymentToApply;
                    const newOutstanding = Number(invoice.outstandingAmount) - paymentToApply;
                    const newStatus = newOutstanding <= 0.01 ? 'PAID' : 'PARTIAL'; // Use epsilon for float safety

                    await tx.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            paidAmount: newPaidAmount,
                            outstandingAmount: newOutstanding,
                            status: newStatus as any
                        }
                    });

                    // Also update associated CreditEntry if exists (mark as SETTLED if paid)
                    if (newStatus === 'PAID') {
                        await tx.creditEntry.updateMany({
                            where: { invoiceId: invoice.id },
                            data: {
                                paidAmount: { increment: paymentToApply },
                                remainingBalance: 0,
                                status: 'SETTLED'
                            }
                        });
                    } else {
                        // Partial update for credit entry
                        await tx.creditEntry.updateMany({
                            where: { invoiceId: invoice.id },
                            data: {
                                paidAmount: { increment: paymentToApply },
                                remainingBalance: { decrement: paymentToApply }
                            }
                        });
                    }

                    remainingPayment -= paymentToApply;
                }
            }

            // EXTRA SAFEGUARD: If the customer's total outstanding balance is now <= 0 (or very small), 
            // ensure ALL their invoices are marked as PAID. This fixes historical data inconsistencies 
            // where balance was reduced but invoices weren't updated.
            if (Number(updatedCustomer.outstandingBalance) <= 1) {

                const remainingUnpaid = await tx.invoice.findMany({
                    where: { customerId: customer.id, status: { not: 'PAID' } }
                });

                for (const inv of remainingUnpaid) {
                    await tx.invoice.update({
                        where: { id: inv.id },
                        data: {
                            status: 'PAID',
                            paidAmount: inv.total, // Assume fully paid
                            outstandingAmount: 0
                        }
                    });
                    // Clear credit entries too
                    await tx.creditEntry.updateMany({
                        where: { invoiceId: inv.id },
                        data: { status: 'SETTLED', remainingBalance: 0 }
                    });
                }
            }

            return { payment, updatedBalance: updatedCustomer.outstandingBalance };
        });

        res.json(result);
    } catch (error) {
        if (error instanceof ZodError) return res.status(400).json({ errors: error.issues });
        if ((error as any).message === 'Customer not found') return res.status(404).json({ message: 'Customer not found' });

        console.error('Payment Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE customer
// DELETE customer (Cascading delete)
router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        const userId = req.user?.id;
        const customerId = Number(id);

        if (!password) {
            return res.status(400).json({ message: 'Password is required to confirm deletion' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Verify Admin Password
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(403).json({ message: 'Invalid password' });
        }

        // Check if customer has outstanding balance
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { 
                outstandingBalance: true,
                name: true
            }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        if (Number(customer.outstandingBalance) > 0) {
            return res.status(400).json({ 
                message: `Cannot delete customer "${customer.name}" with outstanding balance. Please clear all debts first.` 
            });
        }

        // Cascade Delete: Delete related records first
        await prisma.$transaction(async (tx) => {
            // 1. Find all invoices and credit entries to cleanup
            const invoices = await tx.invoice.findMany({
                where: { customerId: customerId },
                select: { id: true }
            });
            const invoiceIds = invoices.map(inv => inv.id);

            const creditEntries = await tx.creditEntry.findMany({
                where: { customerId: customerId },
                select: { id: true }
            });
            const creditEntryIds = creditEntries.map(ce => ce.id);

            // 2. Delete Debt Payments first (foreign key to creditEntry)
            if (creditEntryIds.length > 0) {
                await tx.debtPayment.deleteMany({
                    where: { creditEntryId: { in: creditEntryIds } }
                });
            }

            // 3. Delete Invoice Items
            if (invoiceIds.length > 0) {
                await tx.invoiceItem.deleteMany({
                    where: { invoiceId: { in: invoiceIds } }
                });
            }

            // 4. Delete Credit Entries
            await tx.creditEntry.deleteMany({
                where: { customerId: customerId }
            });

            // 5. Delete Payments
            await tx.payment.deleteMany({
                where: { customerId: customerId }
            });

            // 6. Delete Invoices
            await tx.invoice.deleteMany({
                where: { customerId: customerId }
            });

            // 7. Delete Customer
            await tx.customer.delete({
                where: { id: customerId }
            });
        });

        res.status(204).send();
    } catch (error: any) {
        console.error('Delete customer error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// BULK DELETE Customers (Admin Only)
router.post('/bulk-delete', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
        const { ids, password } = req.body; // ids: number[]
        const userId = req.user?.id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No customer IDs provided' });
        }
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Verify Admin Password
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) return res.status(401).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(403).json({ message: 'Invalid password' });

        let deletedCount = 0;
        let failedIds: number[] = [];

        await prisma.$transaction(async (tx) => {
            for (const id of ids) {
                // Cascade Delete for each ID

                // 1. Find invoices and credit entries
                const invoices = await tx.invoice.findMany({
                    where: { customerId: id },
                    select: { id: true }
                });
                const invoiceIds = invoices.map(inv => inv.id);

                const creditEntries = await tx.creditEntry.findMany({
                    where: { customerId: id },
                    select: { id: true }
                });
                const creditEntryIds = creditEntries.map(ce => ce.id);

                // 2. Delete Debt Payments first
                if (creditEntryIds.length > 0) {
                    await tx.debtPayment.deleteMany({
                        where: { creditEntryId: { in: creditEntryIds } }
                    });
                }

                // 3. Delete Invoice Items
                if (invoiceIds.length > 0) {
                    await tx.invoiceItem.deleteMany({
                        where: { invoiceId: { in: invoiceIds } }
                    });
                }

                // 4. Delete dependencies
                await tx.creditEntry.deleteMany({ where: { customerId: id } });
                await tx.payment.deleteMany({ where: { customerId: id } });
                await tx.invoice.deleteMany({ where: { customerId: id } });

                // 5. Delete Customer
                await tx.customer.delete({ where: { id } });

                deletedCount++;
            }
        });

        // Log action
        await logAction(userId!, 'BULK_DELETE_CUSTOMER', 'Customer', 'BULK', { count: deletedCount, failed: failedIds.length });

        res.json({
            message: `Deleted ${deletedCount} customers. ${failedIds.length > 0 ? `${failedIds.length} skipped due to existing history.` : ''}`,
            deletedCount,
            failedIds
        });

    } catch (error: any) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
