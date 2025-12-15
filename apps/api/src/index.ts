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

app.get("/", (req, res) => {
    res.json({ message: "Hello from API" });
});

app.listen(port, () => {
    console.log(`API server running on port ${port}`);
    startExchangeRateScheduler();
});
// Trigger restart
