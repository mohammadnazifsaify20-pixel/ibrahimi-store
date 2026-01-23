const { PrismaClient } = require('@repo/database');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const email = 'admin@example.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Admin User',
                role: 'ADMIN',
            },
        });

        console.log('✅ Admin user created/updated successfully!');
        console.log('📧 Email:', user.email);
        console.log('🔑 Password: password123');
        console.log('👤 Name:', user.name);
        console.log('🎭 Role:', user.role);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
