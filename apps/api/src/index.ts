import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { startExchangeRateScheduler } from './services/scheduler.service';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import salesRoutes from './routes/sales.routes';
import reportsRoutes from './routes/reports.routes';
import auditRoutes from './routes/audit.routes';
import aiRoutes from './routes/ai.routes';
import settingsRoutes from './routes/settings.routes';
import expenseRoutes from './routes/expense.routes';
import debtRoutes from './routes/debt.routes';
import depositRoutes from './routes/deposit.routes';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

import customerRoutes from './routes/customer.routes';
import userRoutes from './routes/user.routes';

// ... imports

app.use('/auth', authRoutes);
app.use('/users', userRoutes); // Admin user management
app.use('/products', productRoutes);
app.use('/customers', customerRoutes); // New mount
app.use('/', salesRoutes); // Changed from /api to root because salesRoutes internal paths start with /sales
app.use('/reports', reportsRoutes);
app.use('/audit-logs', auditRoutes); // New Audit Logs Endpoint
app.use('/ai', aiRoutes);
app.use('/settings', settingsRoutes);
app.use('/expenses', expenseRoutes);
app.use('/', debtRoutes); // Debt management routes
app.use('/deposits', depositRoutes); // Customer deposit routes

app.get("/", async (req, res) => {
    try {
        // Simple query to ensure DB connection is alive
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: "Hello from API (DB Connected)" });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ message: "API Error", error });
    }
});

import prisma from './lib/prisma';

app.listen(port, async () => {
    console.log(`API server running on port ${port}`);

    // Eagerly connect to DB to avoid cold start latency
    try {
        await prisma.$connect();
        console.log('Database connected eagerly');
    } catch (err) {
        console.error('Failed to connect to database eagerly:', err);
    }

    startExchangeRateScheduler();
});
// Trigger restart
