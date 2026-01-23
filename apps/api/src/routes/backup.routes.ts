import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { Role } from '@repo/database';
import { generateBackup } from '../services/backup.service';

const router = Router();

// Trigger System Backup (Download ZIP)
router.get('/', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: AuthRequest, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-ibrahimi-${timestamp}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        await generateBackup(res);
    } catch (error) {
        console.error('Backup generation failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Backup generation failed' });
        }
    }
});

export default router;
