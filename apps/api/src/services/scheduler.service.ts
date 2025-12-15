import { PrismaClient } from '@repo/database';

const prisma = new PrismaClient();

// In-memory flag to prevent overlapping runs if api hangs
let isUpdating = false;

export const startExchangeRateScheduler = () => {
    console.log('Starting Exchange Rate Scheduler (Every 1 Minute)...');

    // Run every 60 seconds (1 minute)
    setInterval(async () => {
        if (isUpdating) return;
        isUpdating = true;

        try {
            console.log('Running scheduled exchange rate update...');

            // 1. Fetch live rate
            // Using native fetch (Node 18+)
            const response = await fetch('https://open.er-api.com/v6/latest/USD');

            if (!response.ok) {
                throw new Error('Failed to fetch from external API');
            }

            const data = await response.json() as any;
            const afnRate = data.rates?.AFN;

            if (!afnRate) {
                throw new Error('Could not retrieve AFN rate');
            }

            // 2. Add Margin (+1)
            const adjustedRate = afnRate + 1;

            // 3. Update DB
            await prisma.systemSetting.upsert({
                where: { key: 'exchange_rate' },
                update: { value: String(adjustedRate) },
                create: {
                    key: 'exchange_rate',
                    value: String(adjustedRate),
                    description: 'USD to AFG Exchange Rate (Auto-Updated)'
                }
            });

            console.log(`Scheduler: Updated Exchange Rate to ${adjustedRate} (Market: ${afnRate})`);

        } catch (error) {
            console.error('Scheduler Error:', error);
        } finally {
            isUpdating = false;
        }
    }, 60 * 1000);
};
