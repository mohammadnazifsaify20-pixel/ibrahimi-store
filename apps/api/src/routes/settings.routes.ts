import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@repo/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get Exchange Rate
router.get('/exchange-rate', async (req: Request, res: Response) => {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'exchange_rate' }
        });

        // Default to 70 if not set
        const rate = setting ? parseFloat(setting.value) : 70;

        res.json({ rate });
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update Exchange Rate (Admin/Manager only)
router.post('/exchange-rate', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: AuthRequest, res: Response) => {
    try {
        const { rate } = req.body;

        if (!rate || isNaN(rate) || rate <= 0) {
            return res.status(400).json({ message: 'Invalid exchange rate' });
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key: 'exchange_rate' },
            update: { value: String(rate) },
            create: {
                key: 'exchange_rate',
                value: String(rate),
                description: 'USD to AFG Exchange Rate'
            }
        });

        res.json({ message: 'Exchange rate updated', rate: parseFloat(setting.value) });
    } catch (error) {
        console.error('Failed to update exchange rate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Fetch Live Rate (Auto +1 AFG Margin)
router.post('/fetch-live-rate', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: AuthRequest, res: Response) => {
    try {
        // Using native fetch (Node 18+)
        const response = await fetch('https://open.er-api.com/v6/latest/USD');

        if (!response.ok) {
            throw new Error('Failed to fetch from external API');
        }

        const data = await response.json() as any;
        const afnRate = data.rates?.AFN;

        if (!afnRate) {
            return res.status(400).json({ message: 'Could not retrieve AFN rate' });
        }

        // Add 1 AFG margin as requested (Exact value + 1)
        const adjustedRate = afnRate + 1;

        res.json({
            rate: adjustedRate,
            marketRate: afnRate,
            message: `Retrieved market rate (${afnRate.toFixed(2)}) and added margin.`
        });

    } catch (error) {
        console.error('Failed to fetch live rate:', error);
        res.status(500).json({ message: 'Internal server error while fetching rate' });
    }
});

// Get Shop Balance
router.get('/shop-balance', async (req: Request, res: Response) => {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'shop_balance' }
        });

        const balance = setting ? parseFloat(setting.value) : 0;
        res.json({ balance });
    } catch (error) {
        console.error('Failed to fetch shop balance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Validate Admin Password
router.post('/validate-admin-password', async (req: Request, res: Response) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required', valid: false });
        }

        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'admin_balance_password' }
        });

        // Default password if not set
        const adminPassword = setting ? setting.value : 'ibrahimi2024';

        if (password === adminPassword) {
            res.json({ valid: true, message: 'Password verified' });
        } else {
            res.status(401).json({ valid: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('Failed to validate password:', error);
        res.status(500).json({ message: 'Internal server error', valid: false });
    }
});

// Update Admin Password
router.post('/admin-balance-password', async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'admin_balance_password' }
        });

        const currentAdminPassword = setting ? setting.value : 'ibrahimi2024';

        if (currentPassword !== currentAdminPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        await prisma.systemSetting.upsert({
            where: { key: 'admin_balance_password' },
            update: { value: newPassword },
            create: {
                key: 'admin_balance_password',
                value: newPassword,
                description: 'Admin Password for Shop Balance Management'
            }
        });

        res.json({ message: 'Admin password updated successfully' });
    } catch (error) {
        console.error('Failed to update admin password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper function to log balance transactions
async function logBalanceTransaction(type: string, amount: number, description: string, referenceId?: string) {
    try {
        await prisma.systemSetting.create({
            data: {
                key: `balance_log_${Date.now()}`,
                value: JSON.stringify({
                    type, // 'SALE', 'EXPENSE', 'LENDING', 'MANUAL'
                    amount,
                    description,
                    referenceId,
                    timestamp: new Date().toISOString()
                }),
                description: `Balance Transaction: ${type}`
            }
        });
    } catch (error) {
        console.error('Failed to log balance transaction:', error);
    }
}

// Update Shop Balance with transaction logging
router.post('/shop-balance', async (req: Request, res: Response) => {
    try {
        const { balance, password, description, skipPasswordCheck } = req.body;

        if (balance === undefined || isNaN(balance) || balance < 0) {
            return res.status(400).json({ message: 'Invalid balance amount' });
        }

        // Skip password validation for system operations (lending, payments, etc)
        // Only validate password for manual balance updates from the UI
        if (!skipPasswordCheck && password !== undefined) {
            const passwordSetting = await prisma.systemSetting.findUnique({
                where: { key: 'admin_balance_password' }
            });
            const adminPassword = passwordSetting ? passwordSetting.value : 'ibrahimi2024';
            
            if (password !== adminPassword) {
                return res.status(401).json({ message: 'Invalid admin password' });
            }
        }

        const currentBalance = await prisma.systemSetting.findUnique({
            where: { key: 'shop_balance' }
        });
        const oldBalance = currentBalance ? parseFloat(currentBalance.value) : 0;

        const setting = await prisma.systemSetting.upsert({
            where: { key: 'shop_balance' },
            update: { value: String(balance) },
            create: {
                key: 'shop_balance',
                value: String(balance),
                description: 'Shop Cash Balance (AFN)'
            }
        });

        // Log the transaction
        await logBalanceTransaction(
            'MANUAL',
            balance - oldBalance,
            description || `Manual balance update from ؋${oldBalance.toLocaleString()} to ؋${balance.toLocaleString()}`
        );

        res.json({ message: 'Shop balance updated', balance: parseFloat(setting.value) });
    } catch (error) {
        console.error('Failed to update shop balance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get Balance Transaction History
router.get('/balance-history', async (req: Request, res: Response) => {
    try {
        const logs = await prisma.systemSetting.findMany({
            where: {
                key: { startsWith: 'balance_log_' }
            },
            orderBy: { updatedAt: 'desc' },
            take: 100 // Last 100 transactions
        });

        const transactions = logs.map(log => {
            try {
                return JSON.parse(log.value);
            } catch {
                return null;
            }
        }).filter(t => t !== null);

        res.json({ transactions });
    } catch (error) {
        console.error('Failed to fetch balance history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Export helper function for use in other routes
export { logBalanceTransaction };

export default router;
