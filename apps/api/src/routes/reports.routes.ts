import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@repo/database';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Dashboard Summary
router.get('/dashboard', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));

        // Parallel queries for performance
        const [todayInvoices, lowStockList, outcomes] = await Promise.all([
            prisma.invoice.findMany({
                where: { date: { gte: startOfDay }, status: { not: 'CANCELLED' } },
                include: { items: true }
            }),
            prisma.product.findMany({
                where: { quantityOnHand: { lte: 3 } }, // User requested limit 3
                orderBy: { quantityOnHand: 'asc' },
                select: { id: true, name: true, sku: true, quantityOnHand: true }
            }),
            prisma.customer.aggregate({
                _sum: { 
                    outstandingBalance: true,
                    outstandingBalanceAFN: true 
                },
            })
        ]);

        let salesTodayAFN = 0;
        todayInvoices.forEach(inv => {
            let invTotalAFN = Number(inv.totalLocal) || (Number(inv.total) * Number(inv.exchangeRate));

            // Subtract Returns
            inv.items.forEach(item => {
                // @ts-ignore
                const retQty = item.returnedQuantity || 0;
                if (retQty > 0) {
                    const retVal = retQty * Number(item.unitPrice);
                    invTotalAFN -= (retVal * Number(inv.exchangeRate));
                }
            });
            salesTodayAFN += invTotalAFN;
        });

        // Use AFN field if available, otherwise calculate from USD (for backward compatibility)
        const totalOutstandingAFN = outcomes._sum.outstandingBalanceAFN 
            ? Math.round(Number(outcomes._sum.outstandingBalanceAFN))
            : Math.round(Number(outcomes._sum.outstandingBalance || 0) * 70);

        res.json({
            salesToday: Math.round(salesTodayAFN), // Sending AFN directly, rounded to integer
            invoicesToday: todayInvoices.length,
            lowStockItems: lowStockList.length,
            lowStockList,
            totalOutstandingCredit: totalOutstandingAFN, // AFN amount, NOT USD
            currency: 'AFN'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Inventory Valuation
router.get('/inventory-valuation', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        // Prisma doesn't support complex arithmetic in aggregation easily without raw query or fetching all
        // For scalability, we might use raw query or keep a running total.
        // Fetching all for now (suitable for < 10k items)
        const products = await prisma.product.findMany({
            select: { costPrice: true, salePrice: true, quantityOnHand: true, category: true }
        });

        let totalCostValue = 0;
        let totalRetailValue = 0;
        const categoryMap: Record<string, number> = {};

        products.forEach(p => {
            const qty = p.quantityOnHand;
            const cost = Number(p.costPrice);
            const price = Number(p.salePrice);

            totalCostValue += cost * qty;
            totalRetailValue += price * qty;

            // Category breakdown (Retail Value)
            const cat = p.category || 'Uncategorized'; // Note: Product schema has category as String?
            categoryMap[cat] = (categoryMap[cat] || 0) + price * qty;
        });

        // Convert map to array for Recharts
        const categoryDistribution = Object.keys(categoryMap).map(key => ({
            name: key,
            value: categoryMap[key]
        }));

        res.json({
            totalItems: products.length,
            totalCostValue,
            totalRetailValue,
            potentialMargin: totalRetailValue - totalCostValue,
            distribution: categoryDistribution
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Sales Report (Simple Date Range)
router.get('/sales', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        // Default to last 30 days if not provided
        const end = endDate ? new Date(String(endDate)) : new Date();
        const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(end.getDate() - 30));

        const sales = await prisma.payment.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                invoice: { select: { invoiceNumber: true } },
                customer: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Aging Receivables (Overdue Credits)
router.get('/aging', authenticate, authorize([Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]), async (req: Request, res: Response) => {
    try {
        const credits = await prisma.creditEntry.findMany({
            where: {
                remainingBalance: { gt: 0 }
            },
            include: {
                customer: { select: { name: true, phone: true } },
                invoice: { select: { invoiceNumber: true, date: true } }
            },
            orderBy: { createdAt: 'asc' } // Oldest first
        });

        // Calculate days overdue
        const now = new Date();
        const agingReport = credits.map(credit => {
            const daysOpen = Math.floor((now.getTime() - new Date(credit.createdAt).getTime()) / (1000 * 3600 * 24));
            return {
                ...credit,
                daysOpen,
                isOverdue: daysOpen > 30 // Example policy
            };
        });

        res.json(agingReport);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Period Report (Monthly/Yearly)
router.get('/period', authenticate, authorize([Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]), async (req: Request, res: Response) => {
    try {
        const { type, year, month } = req.query; // type: 'monthly' | 'yearly'

        if (!year) {
            return res.status(400).json({ message: 'Year is required' });
        }

        const yearNum = Number(year);
        const monthNum = month ? Number(month) : 0; // 0-indexed if using Date() but let's assume 1-12 input

        let startDate: Date;
        let endDate: Date;
        let periodLabel = '';

        if (type === 'monthly') {
            if (!month) return res.status(400).json({ message: 'Month is required for monthly report' });
            startDate = new Date(yearNum, monthNum - 1, 1);
            endDate = new Date(yearNum, monthNum, 0, 23, 59, 59); // Last day of month
            periodLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        } else {
            // Yearly
            startDate = new Date(yearNum, 0, 1);
            endDate = new Date(yearNum, 11, 31, 23, 59, 59);
            periodLabel = `${yearNum}`;
        }

        // 1. Total Sales (Revenue) - Sum of finalized invoices in this period
        // Using Invoice because it represents the "Bill", whether paid or not (Accrual basis is usually better for P&L, but user might want Cash basis. 
        // Standard is Accrual for "Sales").
        // Let's use Invoice Total for Sales.
        const invoices = await prisma.invoice.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                status: { not: 'CANCELLED' }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        let totalSales = 0;
        let totalCOGS = 0; // Cost of Goods Sold
        let totalInvoices = invoices.length;

        invoices.forEach(inv => {
            let invTotal = Number(inv.total);

            // Calculate COGS for this invoice
            inv.items.forEach(item => {
                // @ts-ignore
                const returnedQty = item.returnedQuantity || 0;
                const effectiveQty = item.quantity - returnedQty;

                // Adjust Sales for Return
                const returnedValue = returnedQty * Number(item.unitPrice);
                invTotal -= returnedValue;

                const cost = Number(item.product.costPrice);
                totalCOGS += (cost * effectiveQty);
            });

            totalSales += invTotal;
        });

        const grossProfit = totalSales - totalCOGS;

        res.json({
            periodLabel,
            totalSales,
            totalCOGS,
            grossProfit,
            totalInvoices,
            currency: 'USD' // The base values are in USD
        });



    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;

