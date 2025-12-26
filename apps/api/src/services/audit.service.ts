import prisma from '../lib/prisma';

export const logAction = async (
    userId: number,
    action: string,
    entity: string,
    entityId: string | number,
    details?: string | object
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId: String(entityId),
                details: typeof details === 'object' ? JSON.stringify(details) : details,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't throw here to avoid failing main transactions if logging fails
    }
};
