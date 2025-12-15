const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const password = "$2b$10$Bvl5ZrK/75s4KDllcrZO4OSHncVWrJErFkkA7NsSDsLSbseb.briO";
    const user = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: password,
            role: 'ADMIN',
        },
    });
    console.log('Created user:', user);
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
