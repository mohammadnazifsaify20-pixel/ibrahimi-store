import { Router, Response } from 'express';
import { PrismaClient, DepositStatus } from '@repo/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createDepositSchema = z.object({
    customerId: z.number(),
    amountAFN: z.number().positive(),
    notes: z.string().optional(),
});

const withdrawSchema = z.object({
    amountAFN: z.number().positive(),
    notes: z.string().optional(),
});

// Generate deposit number
async function generateDepositNumber(): Promise<string> {
    const lastDeposit = await prisma.customerDeposit.findFirst({
        orderBy: { id: 'desc' },
        select: { depositNumber: true }
    });

    if (!lastDeposit) {
        return 'DEP-0001';
    }

    const lastNumber = parseInt(lastDeposit.depositNumber.split('-')[1]);
    return `DEP-${String(lastNumber + 1).padStart(4, '0')}`;
}

// GET /deposits - Get all deposits
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { customerId, status } = req.query;
        
        const deposits = await prisma.customerDeposit.findMany({
            where: {
                ...(customerId ? { customerId: Number(customerId) } : {}),
                ...(status ? { status: status as DepositStatus } : {})
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        displayId: true,
                        phone: true
                    }
                },
                withdrawals: {
                    orderBy: { withdrawalDate: 'desc' }
                }
            },
            orderBy: { depositDate: 'desc' }
        });

        res.json(deposits);
    } catch (error) {
        console.error('Failed to fetch deposits:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /deposits/:id - Get single deposit with history
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const deposit = await prisma.customerDeposit.findUnique({
            where: { id: Number(id) },
            include: {
                customer: true,
                withdrawals: {
                    orderBy: { withdrawalDate: 'desc' }
                }
            }
        });

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        res.json(deposit);
    } catch (error) {
        console.error('Failed to fetch deposit:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /deposits - Create new deposit
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const data = createDepositSchema.parse(req.body);
        
        const result = await prisma.$transaction(async (tx) => {
            // Generate deposit number
            const depositNumber = await generateDepositNumber();
            
            // Create deposit
            const deposit = await tx.customerDeposit.create({
                data: {
                    customerId: data.customerId,
                    depositNumber,
                    originalAmountAFN: data.amountAFN,
                    remainingAmountAFN: data.amountAFN,
                    withdrawnAmountAFN: 0,
                    status: 'ACTIVE',
                    notes: data.notes
                },
                include: {
                    customer: true
                }
            });
            
            // Update shop balance - Add deposit to shop balance
            const balanceSetting = await tx.systemSetting.findUnique({
                where: { key: 'shop_balance' }
            });
            const currentBalance = balanceSetting ? parseFloat(balanceSetting.value) : 0;
            const newBalance = currentBalance + data.amountAFN;
            
            await tx.systemSetting.upsert({
                where: { key: 'shop_balance' },
                update: { value: String(newBalance) },
                create: {
                    key: 'shop_balance',
                    value: String(newBalance),
                    description: 'Shop Cash Balance (AFN)'
                }
            });
            
            // Log transaction
            await tx.systemSetting.create({
                data: {
                    key: `balance_log_${Date.now()}`,
                    value: JSON.stringify({
                        type: 'CUSTOMER_DEPOSIT',
                        amount: data.amountAFN,
                        description: `Customer deposit from ${deposit.customer.name}`,
                        reference: depositNumber,
                        timestamp: new Date().toISOString()
                    }),
                    description: 'Balance Transaction: CUSTOMER_DEPOSIT'
                }
            });
            
            return deposit;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Failed to create deposit:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /deposits/:id/withdraw - Withdraw from deposit
router.post('/:id/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = withdrawSchema.parse(req.body);
        
        const result = await prisma.$transaction(async (tx) => {
            // Get deposit
            const deposit = await tx.customerDeposit.findUnique({
                where: { id: Number(id) },
                include: { customer: true }
            });
            
            if (!deposit) {
                throw new Error('Deposit not found');
            }
            
            if (deposit.status === 'WITHDRAWN') {
                throw new Error('This deposit has been fully withdrawn');
            }
            
            // Validate withdrawal amount
            if (data.amountAFN > Number(deposit.remainingAmountAFN)) {
                throw new Error('Withdrawal amount exceeds remaining balance');
            }
            
            // Record withdrawal
            const withdrawal = await tx.depositWithdrawal.create({
                data: {
                    depositId: deposit.id,
                    amountAFN: data.amountAFN,
                    notes: data.notes
                }
            });
            
            // Update deposit
            const newWithdrawnAmount = Number(deposit.withdrawnAmountAFN) + data.amountAFN;
            const newRemainingAmount = Number(deposit.remainingAmountAFN) - data.amountAFN;
            const newStatus = newRemainingAmount === 0 ? 'WITHDRAWN' : 
                             newRemainingAmount < Number(deposit.originalAmountAFN) ? 'PARTIAL' : 'ACTIVE';
            
            const updatedDeposit = await tx.customerDeposit.update({
                where: { id: deposit.id },
                data: {
                    withdrawnAmountAFN: newWithdrawnAmount,
                    remainingAmountAFN: newRemainingAmount,
                    status: newStatus
                },
                include: {
                    customer: true,
                    withdrawals: true
                }
            });
            
            // Update shop balance - Deduct withdrawal from shop balance
            const balanceSetting = await tx.systemSetting.findUnique({
                where: { key: 'shop_balance' }
            });
            const currentBalance = balanceSetting ? parseFloat(balanceSetting.value) : 0;
            const newBalance = currentBalance - data.amountAFN;
            
            await tx.systemSetting.update({
                where: { key: 'shop_balance' },
                data: { value: String(newBalance) }
            });
            
            // Log transaction
            await tx.systemSetting.create({
                data: {
                    key: `balance_log_${Date.now()}`,
                    value: JSON.stringify({
                        type: 'DEPOSIT_WITHDRAWAL',
                        amount: -data.amountAFN,
                        description: `Withdrawal by ${deposit.customer.name} from ${deposit.depositNumber}`,
                        reference: deposit.depositNumber,
                        timestamp: new Date().toISOString()
                    }),
                    description: 'Balance Transaction: DEPOSIT_WITHDRAWAL'
                }
            });
            
            return { deposit: updatedDeposit, withdrawal };
        });

        res.json(result);
    } catch (error: any) {
        console.error('Failed to process withdrawal:', error);
        res.status(400).json({ message: error.message || 'Internal server error' });
    }
});

// GET /deposits/summary/stats - Get deposit summary
router.get('/summary/stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const [totalActive, totalWithdrawn, allDeposits] = await Promise.all([
            prisma.customerDeposit.aggregate({
                where: { status: { in: ['ACTIVE', 'PARTIAL'] } },
                _sum: { remainingAmountAFN: true }
            }),
            prisma.customerDeposit.aggregate({
                where: { status: 'WITHDRAWN' },
                _sum: { originalAmountAFN: true }
            }),
            prisma.customerDeposit.count()
        ]);

        res.json({
            totalActiveAmount: totalActive._sum.remainingAmountAFN || 0,
            totalWithdrawnAmount: totalWithdrawn._sum.originalAmountAFN || 0,
            totalDeposits: allDeposits
        });
    } catch (error) {
        console.error('Failed to fetch deposit summary:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
