import { PrismaClient } from '@repo/database';
import * as dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from apps/api root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    console.log(`Loading env from: ${envPath}`);

    const dbUrl = process.env.DATABASE_URL;
    const jwtSecret = process.env.JWT_SECRET;

    console.log(`DATABASE_URL defined: ${!!dbUrl}`);
    // Show first few chars if defined to verify format (e.g. postgresql://)
    if (dbUrl) console.log(`DATABASE_URL prefix: ${dbUrl.substring(0, 15)}...`);

    console.log(`JWT_SECRET defined: ${!!jwtSecret}`);
    if (!jwtSecret) {
        console.error('CRITICAL: JWT_SECRET is missing!');
    }

    if (!dbUrl) {
        console.error('CRITICAL: DATABASE_URL is missing!');
        process.exit(1);
    }

    console.log('Attempting Database Connection...');
    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('✅ Database Connection Successful');

        const userCount = await prisma.user.count();
        console.log(`Total Users in DB: ${userCount}`);

        const admin = await prisma.user.findUnique({
            where: { email: 'admin@example.com' }
        });

        if (admin) {
            console.log('✅ Admin user found: admin@example.com');
            console.log(`Admin Role: ${admin.role}`);
        } else {
            console.error('⚠️ Admin user NOT found (admin@example.com)');
        }

    } catch (e: any) {
        console.error('❌ Database Connection FAILED');
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
    console.log('--- DIAGNOSTIC END ---');
}

diagnose();
