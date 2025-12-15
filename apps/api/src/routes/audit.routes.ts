import { Router } from 'express';
import { PrismaClient, Role } from '@repo/database';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get all audit logs (Admin only)
router.get('/', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                user: {
                    select: { name: true, email: true, role: true }
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 100 // Limit to last 100 actions for now
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
});

export default router;
