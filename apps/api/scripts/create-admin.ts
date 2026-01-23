import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function main() {
    const email = 'admin@mns.com';
    const password = 'Samir1379';
    const hashedPassword = await hashPassword(password);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        // Update existing user
        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin user updated successfully!');
        console.log('Email:', updatedUser.email);
        console.log('Role:', updatedUser.role);
    } else {
        // Create new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin user created successfully!');
        console.log('Email:', newUser.email);
        console.log('Role:', newUser.role);
    }

    console.log('\n🔑 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
