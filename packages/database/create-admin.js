const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // Delete old admin
    await prisma.user.deleteMany({
        where: { email: 'admin@example.com' }
    });

    // Create new admin with fresh password hash
    const password = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: password,
            role: 'ADMIN',
        },
    });
    console.log('Created fresh admin user:', user);
    console.log('\nLogin with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
