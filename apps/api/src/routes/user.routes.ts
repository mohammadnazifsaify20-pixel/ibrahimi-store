import { Router, Response } from 'express';
import { Role } from '@repo/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/auth.utils';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT']),
});

const changePasswordSchema = z.object({
    password: z.string().min(6),
});

const updateProfileSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
});

const adminUpdateUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT']),
});

// Update OWN profile (Name, Email)
// @ts-ignore
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email } = updateProfileSchema.parse(req.body);
        if (!req.user) return res.sendStatus(401);

        // Check if email is taken by another user
        if (email !== req.user.email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) return res.status(400).json({ message: 'Email already in use' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { name, email },
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Admin Update User (Name, Email, Role)
// @ts-ignore
router.put('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const { name, email, role } = adminUpdateUserSchema.parse(req.body);

        // Check email uniqueness if changed
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        if (email !== targetUser.email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) return res.status(400).json({ message: 'Email already in use' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name, email, role: role as Role },
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// List all users (Admin only)
// @ts-ignore
router.get('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create new user (Admin only)
// @ts-ignore
router.post('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, role } = createUserSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role as Role,
            },
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Change OWN password
// @ts-ignore
router.put('/profile/password', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { password } = changePasswordSchema.parse(req.body);
        if (!req.user) return res.sendStatus(401);

        const hashedPassword = await hashPassword(password);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update password' });
    }
});

// Reset another user's password (Admin only)
// @ts-ignore
router.put('/:id/password', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const { password } = changePasswordSchema.parse(req.body);
        const userId = Number(req.params.id);

        const hashedPassword = await hashPassword(password);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.json({ message: 'User password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// Delete user (Admin only)
// @ts-ignore
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);

        // Prevent deleting yourself
        if (req.user?.id === userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await prisma.user.delete({
            where: { id: userId },
        });
        res.status(204).send();
    } catch (error) {
        console.error(error); // Log for integrity constraint violations
        res.status(500).json({ message: 'Failed to delete user. They might have associated records.' });
    }
});

export default router;
