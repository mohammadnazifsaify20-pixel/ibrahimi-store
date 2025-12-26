import { Router, Request, Response } from 'express';
import { PrismaClient, DebtStatus, PaymentMethod } from '@repo/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { logAction } from '../services/audit.service';
import { z, ZodError } from 'zod';
import * as bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const router = Router();

// Helper function to calculate debt status based on due date
function calculateDebtStatus(dueDate: Date, remainingBalance: number): DebtStatus {
    if (remainingBalance <= 0) return DebtStatus.SETTLED;

    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 0) return DebtStatus.OVERDUE;
    if (daysDiff <= 1) return DebtStatus.DUE_SOON;
    return DebtStatus.ACTIVE;
}

// Get all debts with automatic status calculation
router.get('/debts', authenticate, async (req: Request, res: Response) => {
    try {
        const { status, customerId } = req.query;

        const where: any = {};

        if (customerId) {
            where.customerId = Number(customerId);
        }

        // Fetch all debts
        let debts = await prisma.creditEntry.findMany({
            where,
            include: {
                customer: true,
                invoice: true,
                debtPayments: {
                    orderBy: { paymentDate: 'desc' }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        // Update statuses based on current date
        const updatedDebts = await Promise.all(
            debts.map(async (debt) => {
                const calculatedStatus = calculateDebtStatus(
                    debt.dueDate,
                    Number(debt.remainingBalance)
                );

                // Update if status changed
                if (calculatedStatus !== debt.status) {
                    await prisma.creditEntry.update({
                        where: { id: debt.id },
                        data: { status: calculatedStatus }
                    });
                    debt.status = calculatedStatus;
                }

                return debt;
            })
        );

        // Filter by status if requested
        let filteredDebts = updatedDebts;
        if (status) {
            filteredDebts = updatedDebts.filter(d => d.status === status);
        }

        res.json(filteredDebts);
    } catch (error) {
        console.error('Error fetching debts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get active debtors (customers with unpaid balances)
router.get('/debts/debtors', authenticate, async (req: Request, res: Response) => {
    try {
        // Get customers with outstanding balance > 0
        const debtors = await prisma.customer.findMany({
            where: {
                outstandingBalance: { gt: 0 }
            },
            include: {
                creditEntries: {
                    where: {
                        remainingBalance: { gt: 0 }
                    },
                    include: {
                        invoice: true,
                        debtPayments: true
                    },
                    orderBy: { dueDate: 'asc' }
                }
            }
        });

        // Update statuses and calculate metrics for each debtor
        const debtorsWithMetrics = await Promise.all(
            debtors.map(async (debtor) => {
                let overdueCount = 0;
                let dueSoonCount = 0;

                const updatedEntries = await Promise.all(
                    debtor.creditEntries.map(async (debt) => {
                        const calculatedStatus = calculateDebtStatus(
                            debt.dueDate,
                            Number(debt.remainingBalance)
                        );

                        if (calculatedStatus !== debt.status) {
                            await prisma.creditEntry.update({
                                where: { id: debt.id },
                                data: { status: calculatedStatus }
                            });
                            debt.status = calculatedStatus;
                        }

                        if (calculatedStatus === DebtStatus.OVERDUE) overdueCount++;
                        if (calculatedStatus === DebtStatus.DUE_SOON) dueSoonCount++;

                        return debt;
                    })
                );

                return {
                    ...debtor,
                    creditEntries: updatedEntries,
                    overdueCount,
                    dueSoonCount
                };
            })
        );

        res.json(debtorsWithMetrics);
    } catch (error) {
        console.error('Error fetching debtors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get debt summary statistics
router.get('/debts/summary', authenticate, async (req: Request, res: Response) => {
    try {
        // Update all debt statuses first
        const allDebts = await prisma.creditEntry.findMany({
            where: {
                remainingBalance: { gt: 0 }
            }
        });

        await Promise.all(
            allDebts.map(async (debt) => {
                const calculatedStatus = calculateDebtStatus(
                    debt.dueDate,
                    Number(debt.remainingBalance)
                );

                if (calculatedStatus !== debt.status) {
                    await prisma.creditEntry.update({
                        where: { id: debt.id },
                        data: { status: calculatedStatus }
                    });
                }
            })
        );

        // Get fresh data with updated statuses
        const debts = await prisma.creditEntry.findMany({
            where: {
                remainingBalance: { gt: 0 }
            }
        });

        const totalOutstanding = debts.reduce(
            (sum, debt) => sum + Number(debt.remainingBalance),
            0
        );

        const totalOutstandingAFN = debts.reduce(
            (sum, debt) => sum + Number(debt.remainingBalanceAFN || 0),
            0
        );

        const activeCount = debts.filter(d => d.status === DebtStatus.ACTIVE).length;
        const dueSoonCount = debts.filter(d => d.status === DebtStatus.DUE_SOON).length;
        const overdueCount = debts.filter(d => d.status === DebtStatus.OVERDUE).length;

        const totalDebtors = await prisma.customer.count({
            where: {
                outstandingBalance: { gt: 0 }
            }
        });

        res.json({
            totalOutstanding,
            totalOutstandingAFN,
            totalDebtors,
            activeCount,
            dueSoonCount,
            overdueCount,
            totalDebts: debts.length
        });
    } catch (error) {
        console.error('Error fetching debt summary:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single debt with full details
router.get('/debts/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        let debt = await prisma.creditEntry.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                invoice: {
                    include: {
                        items: {
                            include: { product: true }
                        }
                    }
                },
                debtPayments: {
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });

        if (!debt) {
            return res.status(404).json({ message: 'Debt not found' });
        }

        // Update status if needed
        const calculatedStatus = calculateDebtStatus(
            debt.dueDate,
            Number(debt.remainingBalance)
        );

        if (calculatedStatus !== debt.status) {
            debt = await prisma.creditEntry.update({
                where: { id: debt.id },
                data: { status: calculatedStatus },
                include: {
                    customer: true,
                    invoice: {
                        include: {
                            items: {
                                include: { product: true }
                            }
                        }
                    },
                    debtPayments: {
                        orderBy: { paymentDate: 'desc' }
                    }
                }
            });
        }

        res.json(debt);
    } catch (error) {
        console.error('Error fetching debt:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Record a debt payment
const debtPaymentSchema = z.object({
    amount: z.number().positive().optional(),
    amountAFN: z.number().positive().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

router.post('/debts/:id/payments', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, amountAFN, paymentMethod, reference, notes } = debtPaymentSchema.parse(req.body);
        const userId = req.user!.id;

        // Ensure at least one amount is provided
        if (!amount && !amountAFN) {
            throw new Error('Payment amount is required');
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get the debt
            const debt = await tx.creditEntry.findUnique({
                where: { id: Number(id) },
                include: { customer: true, invoice: true }
            });

            if (!debt) {
                throw new Error('Debt not found');
            }

            if (Number(debt.remainingBalance) <= 0) {
                throw new Error('This debt is already settled');
            }

            // Use AFN amounts directly - no USD conversion needed
            const remainingBalanceAFN = Number(debt.remainingBalanceAFN) || 0;
            const paymentAmountAFN = amountAFN || (amount ? amount * Number(debt.invoice.exchangeRate) : 0);

            // Allow paying up to remaining balance with 10 AFN tolerance for rounding
            if (paymentAmountAFN > remainingBalanceAFN + 10) {
                throw new Error('Payment amount exceeds remaining balance');
            }

            // If paying close to full amount, use exact remaining balance
            const finalAmountAFN = Math.abs(paymentAmountAFN - remainingBalanceAFN) <= 10 ? remainingBalanceAFN : paymentAmountAFN;
            // Calculate USD equivalent for backward compatibility
            const actualPayment = finalAmountAFN / Number(debt.invoice.exchangeRate);

            // Validate calculated amounts
            if (!actualPayment || isNaN(actualPayment) || actualPayment <= 0) {
                throw new Error('Invalid payment amount calculated');
            }

            // Record the payment
            const payment = await tx.debtPayment.create({
                data: {
                    creditEntryId: debt.id,
                    amount: actualPayment,
                    amountAFN: finalAmountAFN,
                    paymentMethod,
                    reference,
                    notes
                }
            });

            // Update debt entry
            const newPaidAmount = Number(debt.paidAmount) + actualPayment;
            const newPaidAmountAFN = Number(debt.paidAmountAFN || 0) + finalAmountAFN;
            const newRemainingBalance = Number(debt.remainingBalance) - actualPayment;
            const newRemainingBalanceAFN = Number(debt.remainingBalanceAFN || 0) - finalAmountAFN;

            // Calculate new status - ensure it's SETTLED if remaining balance is very small (< 1 AFN)
            const isFullyPaid = newRemainingBalanceAFN < 1 || newRemainingBalance < 0.01;
            const newStatus = isFullyPaid ? DebtStatus.SETTLED : calculateDebtStatus(debt.dueDate, newRemainingBalance);

            const updatedDebt = await tx.creditEntry.update({
                where: { id: debt.id },
                data: {
                    paidAmount: newPaidAmount,
                    paidAmountAFN: newPaidAmountAFN,
                    remainingBalance: isFullyPaid ? 0 : newRemainingBalance,
                    remainingBalanceAFN: isFullyPaid ? 0 : newRemainingBalanceAFN,
                    status: newStatus
                }
            });

            // Update customer outstanding balance
            await tx.customer.update({
                where: { id: debt.customerId },
                data: {
                    outstandingBalance: { decrement: actualPayment },
                    outstandingBalanceAFN: { decrement: finalAmountAFN }
                }
            });

            // Update shop balance - Add back the paid amount
            const shopBalanceSetting = await tx.systemSetting.findUnique({
                where: { key: 'shop_balance' }
            });

            if (shopBalanceSetting) {
                const currentBalance = Number(shopBalanceSetting.value) || 0;
                const newBalance = currentBalance + finalAmountAFN;

                await tx.systemSetting.update({
                    where: { key: 'shop_balance' },
                    data: { value: newBalance.toString() }
                });

                // Log the balance transaction
                await tx.systemSetting.create({
                    data: {
                        key: `balance_log_${Date.now()}`,
                        value: JSON.stringify({
                            type: 'DEBT_PAYMENT',
                            previousBalance: currentBalance,
                            newBalance: newBalance,
                            amount: finalAmountAFN,
                            description: `Debt payment received from ${debt.customer.name}`,
                            timestamp: new Date().toISOString(),
                            reference: `DEBT-${debt.id}`
                        })
                    }
                });
            }

            // Update invoice if applicable
            const currentInvoiceOutstanding = Number(debt.invoice.outstandingAmount) || 0;
            const newInvoiceOutstanding = Math.max(0, currentInvoiceOutstanding - actualPayment);
            const newInvoiceStatus = newInvoiceOutstanding <= 0 ? 'PAID' : debt.invoice.status;

            await tx.invoice.update({
                where: { id: debt.invoiceId },
                data: {
                    outstandingAmount: newInvoiceOutstanding,
                    paidAmount: { increment: actualPayment },
                    status: newInvoiceStatus as any
                }
            });

            // Create a Payment record for consistency
            await tx.payment.create({
                data: {
                    invoiceId: debt.invoiceId,
                    customerId: debt.customerId,
                    amount: actualPayment,
                    amountAFN: finalAmountAFN,
                    method: paymentMethod,
                    reference: reference || 'Debt Payment'
                }
            });

            return { payment, updatedDebt };
        });

        // Log the action
        await logAction(
            userId,
            'DEBT_PAYMENT',
            'CreditEntry',
            Number(id),
            { amount, paymentMethod }
        );

        res.json(result);
    } catch (error: any) {
        if (error instanceof ZodError) {
            const errorMessages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
            return res.status(400).json({ message: `Validation error: ${errorMessages}` });
        }

        console.error('Error recording debt payment:', error);
        res.status(400).json({ message: error.message || 'Failed to record payment' });
    }
});

// Update debt (notes, due date)
const updateDebtSchema = z.object({
    notes: z.string().optional(),
    dueDate: z.string().datetime().optional()
});

router.patch('/debts/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, dueDate } = updateDebtSchema.parse(req.body);
        const userId = req.user!.id;

        const updateData: any = {};
        if (notes !== undefined) updateData.notes = notes;
        if (dueDate) {
            updateData.dueDate = new Date(dueDate);
            // Recalculate status with new due date
            const debt = await prisma.creditEntry.findUnique({ where: { id: Number(id) } });
            if (debt) {
                updateData.status = calculateDebtStatus(
                    new Date(dueDate),
                    Number(debt.remainingBalance)
                );
            }
        }

        const updatedDebt = await prisma.creditEntry.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                customer: true,
                invoice: true,
                debtPayments: true
            }
        });

        await logAction(userId, 'UPDATE_DEBT', 'CreditEntry', Number(id), updateData);

        res.json(updatedDebt);
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        console.error('Error updating debt:', error);
        res.status(400).json({ message: error.message || 'Failed to update debt' });
    }
});

// Batch update debt statuses (useful for cron jobs)
router.post('/debts/batch-update-status', authenticate, async (req: Request, res: Response) => {
    try {
        const debts = await prisma.creditEntry.findMany({
            where: {
                remainingBalance: { gt: 0 }
            }
        });

        const updates = await Promise.all(
            debts.map(async (debt) => {
                const newStatus = calculateDebtStatus(
                    debt.dueDate,
                    Number(debt.remainingBalance)
                );

                if (newStatus !== debt.status) {
                    return prisma.creditEntry.update({
                        where: { id: debt.id },
                        data: { status: newStatus }
                    });
                }
                return null;
            })
        );

        const updatedCount = updates.filter(u => u !== null).length;

        res.json({ message: `Updated ${updatedCount} debt statuses` });
    } catch (error) {
        console.error('Error batch updating debt statuses:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create Lending Entry (Give money to customer - they owe you)
const lendingSchema = z.object({
    customerId: z.number().int().positive(),
    amount: z.number().positive(),
    amountAFN: z.number().positive(),
    dueDate: z.string().datetime(),
    notes: z.string().optional(),
    exchangeRate: z.number().positive().default(70),
});

router.post('/debts/lend', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { customerId, amount, amountAFN, dueDate, notes, exchangeRate } = lendingSchema.parse(req.body);
        const userId = req.user!.id;

        const result = await prisma.$transaction(async (tx) => {
            // Verify customer exists
            const customer = await tx.customer.findUnique({
                where: { id: customerId }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Create a dummy invoice for the lending entry
            const invoiceCount = await tx.invoice.count();
            const invoiceNumber = `LEND-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, '0')}`;

            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    customerId,
                    userId,
                    subtotal: 0,
                    tax: 0,
                    discount: 0,
                    total: 0,
                    exchangeRate,
                    totalLocal: 0,
                    paidAmount: 0,
                    outstandingAmount: 0,
                    status: 'PAID',
                }
            });

            // Create credit entry (customer owes you)
            const creditEntry = await tx.creditEntry.create({
                data: {
                    customerId,
                    invoiceId: invoice.id,
                    originalAmount: amount,
                    originalAmountAFN: amountAFN,
                    remainingBalance: amount,
                    remainingBalanceAFN: amountAFN,
                    paidAmount: 0,
                    paidAmountAFN: 0,
                    dueDate: new Date(dueDate),
                    notes: notes || 'Cash Lending',
                    status: calculateDebtStatus(new Date(dueDate), amount)
                }
            });

            // Update customer outstanding balance
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    outstandingBalance: { increment: amount },
                    outstandingBalanceAFN: { increment: amountAFN }
                }
            });

            return { creditEntry, invoice };
        });

        // Log the action
        await logAction(
            userId,
            'CREATE_LENDING',
            'CreditEntry',
            result.creditEntry.id,
            { customerId, amount, amountAFN }
        );

        res.status(201).json(result);
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }

        console.error('Error creating lending entry:', error);
        res.status(400).json({ message: error.message || 'Failed to create lending entry' });
    }
});

// DELETE Debt/Lending Entry (Admin Password Required)
router.delete('/debts/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { adminPassword } = req.body;

        if (!adminPassword) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Validate user's login password
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id }
        });

        if (!user || !user.password) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
        if (!isPasswordValid) {
            return res.status(403).json({ message: 'Invalid password' });
        }

        // Delete the debt entry
        const result = await prisma.$transaction(async (tx) => {
            const creditEntry = await tx.creditEntry.findUnique({
                where: { id: Number(id) },
                include: { customer: true, invoice: true }
            });

            if (!creditEntry) {
                throw new Error('Debt entry not found');
            }

            // Restore customer balance
            await tx.customer.update({
                where: { id: creditEntry.customerId },
                data: {
                    outstandingBalance: { decrement: creditEntry.remainingBalance },
                    outstandingBalanceAFN: { decrement: creditEntry.remainingBalanceAFN }
                }
            });

            // Calculate balance restoration
            // If debt is paid: restore original amount minus payments (net effect)
            // If debt is unpaid: restore full original amount
            const isPaid = creditEntry.status === 'SETTLED';
            const balanceRestoration = isPaid
                ? Number(creditEntry.originalAmountAFN) - Number(creditEntry.paidAmountAFN)
                : Number(creditEntry.originalAmountAFN);

            // Restore shop balance
            const balanceSetting = await tx.systemSetting.findUnique({
                where: { key: 'shop_balance' }
            });
            const currentBalance = balanceSetting ? parseFloat(balanceSetting.value) : 0;
            const newBalance = currentBalance + balanceRestoration;

            await tx.systemSetting.upsert({
                where: { key: 'shop_balance' },
                update: { value: String(newBalance) },
                create: {
                    key: 'shop_balance',
                    value: String(newBalance),
                    description: 'Shop Cash Balance (AFN)'
                }
            });

            // Log balance restoration
            await tx.systemSetting.create({
                data: {
                    key: `balance_log_${Date.now()}`,
                    value: JSON.stringify({
                        type: 'LENDING_DELETE',
                        amount: balanceRestoration,
                        originalAmount: Number(creditEntry.originalAmountAFN),
                        paidAmount: Number(creditEntry.paidAmountAFN),
                        description: isPaid
                            ? `Paid lending deleted - Net balance restored for ${creditEntry.customer.name} (Original: ؋${creditEntry.originalAmountAFN}, Paid: ؋${creditEntry.paidAmountAFN})`
                            : `Lending deleted - Balance restored for ${creditEntry.customer.name}`,
                        referenceId: String(creditEntry.id),
                        timestamp: new Date().toISOString()
                    }),
                    description: 'Balance Transaction: LENDING_DELETE'
                }
            });

            // Delete debt payments first (foreign key constraint)
            await tx.debtPayment.deleteMany({
                where: { creditEntryId: Number(id) }
            });

            // Delete the credit entry
            await tx.creditEntry.delete({
                where: { id: Number(id) }
            });

            // Delete the associated invoice if it's a lending invoice
            if (creditEntry.invoiceId && creditEntry.invoice?.invoiceNumber?.startsWith('LEND-')) {
                await tx.invoice.delete({
                    where: { id: creditEntry.invoiceId }
                });
            }

            return { creditEntry, restoredBalance: newBalance };
        });

        // Log the action
        await logAction(
            req.user!.id,
            'DELETE_LENDING',
            'CreditEntry',
            id,
            {
                customerId: result.creditEntry.customerId,
                amount: Number(result.creditEntry.originalAmountAFN),
                restoredBalance: result.restoredBalance
            }
        );

        res.json({
            message: 'Lending entry deleted and shop balance restored',
            restoredBalance: result.restoredBalance
        });
    } catch (error: any) {
        console.error('Error deleting lending entry:', error);
        res.status(500).json({ message: error.message || 'Failed to delete lending entry' });
    }
});

export default router;
