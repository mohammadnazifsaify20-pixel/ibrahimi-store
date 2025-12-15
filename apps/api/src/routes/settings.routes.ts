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

export default router;
