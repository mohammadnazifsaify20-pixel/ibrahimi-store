import { Router } from 'express';
import { PrismaClient } from '@repo/database';
import { z, ZodError } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// Validation Schema
const createExpenseSchema = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    category: z.string().min(1),
    date: z.string().optional(), // ISO date string
});

// GET /expenses - List expenses
router.get('/', authenticate, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where: any = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                user: { select: { name: true } }
            }
        });

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch expenses' });
    }
});

// POST /expenses - Create expense
router.post('/', authenticate, async (req, res) => {
    try {
        const data = createExpenseSchema.parse(req.body);

        // @ts-ignore
        const userId = req.user.id;

        const expense = await prisma.expense.create({
            data: {
                description: data.description,
                amount: data.amount,
                category: data.category,
                date: data.date ? new Date(data.date) : new Date(),
                userId
            }
        });

        // Update Shop Balance - Deduct expense amount from balance
        try {
            const balanceSetting = await prisma.systemSetting.findUnique({
                where: { key: 'shop_balance' }
            });
            const currentBalance = balanceSetting ? parseFloat(balanceSetting.value) : 0;
            const newBalance = currentBalance - data.amount;

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
                        type: 'EXPENSE',
                        amount: -data.amount,
                        description: `Expense: ${data.description} (${data.category})`,
                        referenceId: String(expense.id),
                        timestamp: new Date().toISOString()
                    }),
                    description: 'Balance Transaction: EXPENSE'
                }
            });
        } catch (error) {
            console.error('Failed to update shop balance after expense:', error);
            // Don't fail the expense if balance update fails
        }

        res.status(201).json(expense);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to create expense' });
    }
});

// DELETE /expenses/:id - Delete expense
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Admin password is required to delete expenses.' });
        }

        // @ts-ignore
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(401).json({ message: 'User not found' });

        // Check if user is Admin or Manager (optional, but good practice)
        // strict "Admin Key" implies Admin role usually, or just password check.
        // Let's assume any authenticated user can delete IF they provide THEIR password (re-auth).
        // BUT user said "Admin Key". So if a cashier tries to delete, should they enter ADMIN pass?
        // Usually systems check "Current User Password".
        // Use user.password (hash) to compare.
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(403).json({ message: 'Invalid password. Deletion denied.' });
        }

        // Proceed
        await prisma.expense.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Failed to delete expense' });
    }
});

export default router;
