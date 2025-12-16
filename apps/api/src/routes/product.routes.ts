import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@repo/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { z, ZodError } from 'zod';
import multer from 'multer';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const prisma = new PrismaClient();

// Schemas
const createProductSchema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    category: z.string().optional(),
    compatibility: z.string().optional(),
    costPrice: z.number().min(0),
    salePrice: z.number().min(0),
    salePriceAFN: z.number().min(0).optional(),
    quantityOnHand: z.number().int().min(0).default(0),
    reorderLevel: z.number().int().min(0).default(5),
    location: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const stockAdjustmentSchema = z.object({
    productId: z.number().int(),
    qtyChange: z.number().int(), // Can be negative
    reason: z.string().min(1),
});

// Routes

// Download CSV Template
router.get('/template', (req: Request, res: Response) => {
    const headers = ['sku', 'name', 'cost_price', 'sale_price', 'sale_price_afg', 'exchange_rate', 'quantity', 'category', 'brand', 'compatibility', 'location', 'barcode', 'notes'];
    const csvContent = '\uFEFF' + headers.join(',') + '\n' + 'SKU_EXAMPLE,Brake Pads,10.00,,140,70,100,Brakes,Toyota,Camry 2020,Shelf A1,12345678,Premium pads';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=product_template.csv');
    res.send(csvContent);
});

// Get all products (Active by default, or 'archived', or 'all')
// Supports Pagination & Search
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { status, search, page = '1', limit = '50' } = req.query;

        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 50;
        const skip = (pageNum - 1) * limitNum;

        let where: any = {};

        // Status Filter
        if (status === 'archived') {
            where.isActive = false;
        } else if (status === 'all') {
            // No status filter
        } else {
            where.isActive = true; // Default
        }

        // Search Filter
        if (search) {
            const searchStr = search as string;
            where.OR = [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { sku: { contains: searchStr, mode: 'insensitive' } },
                { brand: { contains: searchStr, mode: 'insensitive' } },
                { category: { contains: searchStr, mode: 'insensitive' } },
                { barcode: { contains: searchStr, mode: 'insensitive' } } // Also search by barcode
            ];
        }

        const [total, products] = await prisma.$transaction([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { updatedAt: 'desc' },
            })
        ]);

        res.json({
            data: products,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ... (Toggle Status, Get Single, Create, Update, Delete, Bulk Delete, Template routes remain unchanged) ...

// Import Products from CSV (Optimized for Bulk)
router.post('/import', authenticate, authorize([Role.ADMIN, Role.MANAGER]), upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results: any[] = [];
        const errors: any[] = [];
        let rowCount = 0;

        const stream = Readable.from(req.file.buffer)
            .pipe(csvParser({ encoding: 'utf8' }))
            .on('data', (data) => {
                rowCount++;

                // Determine Sale Price (USD)
                let salePriceUSD = parseFloat(data.sale_price) || 0;

                // If USD price is missing/zero, try to use AFG price and Rate
                if (salePriceUSD === 0 && data.sale_price_afg && data.exchange_rate) {
                    const priceAFG = parseFloat(data.sale_price_afg);
                    const rate = parseFloat(data.exchange_rate);

                    if (!isNaN(priceAFG) && !isNaN(rate) && rate > 0) {
                        salePriceUSD = parseFloat((priceAFG / rate).toFixed(2));
                    }
                }

                // Basic Validation
                if (!data.sku || !data.name || salePriceUSD <= 0) {
                    errors.push({
                        row: rowCount,
                        message: `Row ${rowCount}: Missing required fields or invalid price.`
                    });
                    return;
                }

                // Transform data
                results.push({
                    sku: data.sku,
                    name: data.name,
                    costPrice: parseFloat(data.cost_price) || 0,
                    salePrice: salePriceUSD,
                    salePriceAFN: parseFloat(data.sale_price_afn) ? parseFloat(data.sale_price_afn) : null,
                    quantityOnHand: parseInt(data.quantity) || 0,
                    category: data.category || undefined,
                    brand: data.brand || undefined,
                    compatibility: data.compatibility || undefined,
                    location: data.location || undefined,
                    barcode: data.barcode || undefined,
                    notes: data.notes || undefined,
                    isActive: true
                });
            })
            .on('end', async () => {
                if (results.length === 0) {
                    return res.json({ message: 'No valid rows found.', successCount: 0, errors });
                }

                try {
                    // Optimized Bulk Insert
                    // 1. Identify existing SKUs to avoid unique constraint errors
                    const skus = results.map(p => p.sku);
                    const existingProducts = await prisma.product.findMany({
                        where: { sku: { in: skus } },
                        select: { sku: true }
                    });

                    const existingSkus = new Set(existingProducts.map(p => p.sku));

                    const newProducts = results.filter(p => {
                        if (existingSkus.has(p.sku)) {
                            errors.push({ sku: p.sku, message: 'Product already exists (Skipped)' });
                            return false;
                        }
                        return true;
                    });

                    // 2. Batch Insert
                    if (newProducts.length > 0) {
                        await prisma.product.createMany({
                            data: newProducts,
                            skipDuplicates: true // Extra safety
                        });
                    }

                    res.json({
                        message: `Import processed. Added: ${newProducts.length}, Skipped: ${existingSkus.size}, Errors: ${errors.length}`,
                        successCount: newProducts.length,
                        errors
                    });

                } catch (dbError: any) {
                    console.error('Database Bulk Insert Error:', dbError);
                    res.status(500).json({ message: 'Database error during bulk import' });
                }
            });

    } catch (error) {
        console.error('Import setup error:', error);
        res.status(500).json({ message: 'Internal server error during import' });
    }
});

// Toggle Product Status (Archive/Restore)
router.put('/:id/toggle-status', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({ where: { id: Number(id) } });

        if (!product) return res.status(404).json({ message: 'Product not found' });

        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data: { isActive: !product.isActive }
        });

        res.json({
            message: `Product ${updated.isActive ? 'restored' : 'archived'} successfully`,
            product: updated
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get single product
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
            include: { stockAdjustments: true },
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create product
router.post('/', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const data = createProductSchema.parse(req.body);

        const existingProduct = await prisma.product.findUnique({
            where: { sku: data.sku },
        });

        if (existingProduct) {
            return res.status(400).json({ message: 'Product with this SKU already exists' });
        }

        if (data.barcode) {
            const existingBarcode = await prisma.product.findUnique({
                where: { barcode: data.barcode },
            });
            if (existingBarcode) {
                return res.status(400).json({ message: 'Product with this barcode already exists' });
            }
        }

        const product = await prisma.product.create({
            data,
        });

        res.status(201).json(product);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update product
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.MANAGER]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateProductSchema.parse(req.body);

        const product = await prisma.product.update({
            where: { id: Number(id) },
            data,
        });

        res.json(product);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        // Prisma error code for record not found
        if ((error as any).code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete product
router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        if ((error as any).code === 'P2025') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// BULK DELETE Products (Admin Only)
router.post('/bulk-delete', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
        const { ids, password } = req.body;
        const userId = req.user?.id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No product IDs provided' });
        }
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Verify Admin Password
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) return res.status(401).json({ message: 'User not found' });

        const { compare } = require('bcryptjs'); // standard import might be needed if not top level
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) return res.status(403).json({ message: 'Invalid password' });

        let deletedCount = 0;
        let failedIds: number[] = [];

        await prisma.$transaction(async (tx) => {
            for (const id of ids) {
                // Check for sales history (InvoiceItems)
                const hasHistory = await tx.invoiceItem.count({ where: { productId: id } }) > 0;

                if (hasHistory) {
                    failedIds.push(id);
                } else {
                    await tx.product.delete({ where: { id } });
                    deletedCount++;
                }
            }
        });

        res.json({
            message: `Deleted ${deletedCount} products. ${failedIds.length > 0 ? `${failedIds.length} skipped due to existing sales history.` : ''}`,
            deletedCount,
            failedIds
        });

    } catch (error: any) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Import Products from CSV
router.post('/import', authenticate, authorize([Role.ADMIN, Role.MANAGER]), upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results: any[] = [];
        const errors: any[] = [];
        let rowCount = 0;

        const stream = Readable.from(req.file.buffer)
            .pipe(csvParser({ encoding: 'utf8' }))
            .on('data', (data) => {
                rowCount++;

                // Determine Sale Price (USD)
                let salePriceUSD = parseFloat(data.sale_price) || 0;

                // If USD price is missing/zero, try to use AFG price and Rate
                if (salePriceUSD === 0 && data.sale_price_afg && data.exchange_rate) {
                    const priceAFG = parseFloat(data.sale_price_afg);
                    const rate = parseFloat(data.exchange_rate);

                    if (!isNaN(priceAFG) && !isNaN(rate) && rate > 0) {
                        salePriceUSD = parseFloat((priceAFG / rate).toFixed(2));
                    }
                }

                // Basic Validation
                if (!data.sku || !data.name || salePriceUSD <= 0) {
                    errors.push({
                        row: rowCount,
                        message: `Missing required fields or invalid price. Provide either 'sale_price' (USD) OR ('sale_price_afg' AND 'exchange_rate').`
                    });
                    return;
                }

                // transform data
                results.push({
                    sku: data.sku,
                    name: data.name,
                    costPrice: parseFloat(data.cost_price) || 0,
                    salePrice: salePriceUSD,
                    salePriceAFN: parseFloat(data.sale_price_afn) ? parseFloat(data.sale_price_afn) : null,
                    quantityOnHand: parseInt(data.quantity) || 0,
                    category: data.category || undefined,
                    brand: data.brand || undefined,
                    compatibility: data.compatibility || undefined,
                    location: data.location || undefined,
                    barcode: data.barcode || undefined,
                    notes: data.notes || undefined,
                });
            })
            .on('end', async () => {
                let successCount = 0;

                // Process sequentially to capture errors nicely
                for (const productData of results) {
                    try {
                        const existing = await prisma.product.findUnique({ where: { sku: productData.sku } });
                        if (existing) {
                            errors.push({ row: 'N/A', sku: productData.sku, message: 'Product with this SKU already exists' });
                            continue;
                        }

                        await prisma.product.create({ data: productData });
                        successCount++;
                    } catch (err: any) {
                        errors.push({ sku: productData.sku, message: err.message });
                    }
                }

                res.json({
                    message: `Import processed. Success: ${successCount}, Failed: ${errors.length}`,
                    successCount,
                    errors
                });
            });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Internal server error during import' });
    }
});

// Stock Adjustment
router.post('/adjust-stock', authenticate, authorize([Role.ADMIN, Role.MANAGER, Role.WAREHOUSE]), async (req: AuthRequest, res: Response) => {
    try {
        const { productId, qtyChange, reason } = stockAdjustmentSchema.parse(req.body);
        const userId = req.user!.id;

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product) throw new Error('Product not found');

            const newQuantity = product.quantityOnHand + qtyChange;
            if (newQuantity < 0) {
                throw new Error('Insufficient stock');
            }

            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: { quantityOnHand: newQuantity },
            });

            const adjustment = await tx.stockAdjustment.create({
                data: {
                    productId,
                    qtyChange,
                    reason,
                    userId,
                },
            });

            return { product: updatedProduct, adjustment };
        });

        res.json(result);
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        if (error.message === 'Product not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Insufficient stock') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
