import archiver from 'archiver';
import { Response } from 'express';
import prisma from '../lib/prisma';

export const generateBackup = async (res: Response) => {
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            console.warn(err);
        } else {
            throw err;
        }
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(res);

    // Fetch Tables
    const customers = await prisma.customer.findMany();
    const products = await prisma.product.findMany();
    const invoices = await prisma.invoice.findMany({ include: { items: true, customer: true } });
    const expenses = await prisma.expense.findMany();
    const debts = await prisma.creditEntry.findMany({ include: { debtPayments: true, customer: true } });
    const users = await prisma.user.findMany();

    // Append table data as JSON files
    archive.append(JSON.stringify(customers, null, 2), { name: 'customers.json' });
    archive.append(JSON.stringify(products, null, 2), { name: 'inventory.json' });
    archive.append(JSON.stringify(invoices, null, 2), { name: 'sales.json' });
    archive.append(JSON.stringify(expenses, null, 2), { name: 'expenses.json' });
    archive.append(JSON.stringify(debts, null, 2), { name: 'debts.json' });
    archive.append(JSON.stringify(users, null, 2), { name: 'users.json' });

    // Append stats/metadata
    archive.append(JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '1.0',
        counts: {
            customers: customers.length,
            products: products.length,
            invoices: invoices.length
        }
    }, null, 2), { name: 'metadata.json' });


    await archive.finalize();
};
