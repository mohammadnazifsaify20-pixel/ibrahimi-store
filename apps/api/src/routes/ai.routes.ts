import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

// Simple intent parser
const parseIntent = (command: string) => {
    const lower = command.toLowerCase().trim();

    // Pattern: "find [query]" or "search [query]"
    // Support English and Farsi (Dari)
    // Farsi: پیدا کردن (find), جستجو (search), نشان بده (show)
    const findMatch = lower.match(/^(?:find|search|show|get|پیدا|جستجو|نشان)\s+(.+)/i);
    if (findMatch && findMatch[1]) {
        return { type: 'SEARCH_PRODUCT', query: findMatch[1].trim() };
    }

    // Pattern: "set stock [sku/name] to [qty]"
    // Farsi: موجودی (stock) ... را به ... تغییر بده (change to) / ست کن (set)
    // Regex simplified: (update/stock/change/set/موجودی) ... (product) ... (number)
    const stockSetMatch = lower.match(/^(?:set|update|change|موجودی|تعداد)\s+(?:stock\s+)?(?:for\s+)?(.+?)\s+(?:to|به)\s+(\d+)/i);
    if (stockSetMatch && stockSetMatch[1] && stockSetMatch[2]) {
        return {
            type: 'UPDATE_STOCK',
            identifier: stockSetMatch[1].trim(),
            quantity: parseInt(stockSetMatch[2], 10),
            action: 'SET'
        };
    }

    // Pattern: "add [qty] to [sku/name]"
    // Farsi: اضافه کردن (add) ... به (to) ...
    const stockAddMatch = lower.match(/^(?:add|اضافه)\s+(\d+)\s+(?:to|به)\s+(?:stock\s+(?:for\s+)?)?(.+)/i);
    if (stockAddMatch && stockAddMatch[1] && stockAddMatch[2]) {
        return {
            type: 'UPDATE_STOCK',
            identifier: stockAddMatch[2].trim(),
            quantity: parseInt(stockAddMatch[1], 10),
            action: 'ADD'
        };
    }

    return { type: 'UNKNOWN' };
};

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini if key is present
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Helper to get Context Data for AI
const getStoreContext = async () => {
    // Fetch critical data to give AI "eyes"
    const [lowStock, salesToday, customerCount] = await Promise.all([
        prisma.product.findMany({
            where: { quantityOnHand: { lte: 5 } },
            select: { name: true, sku: true, quantityOnHand: true },
            take: 10
        }),
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        }),
        prisma.customer.count()
    ]);

    return `
    Current Store Context:
    - Low Stock Items (First 10): ${JSON.stringify(lowStock)}
    - Sales Today: ؋${salesToday._sum.amount || 0}
    - Total Customers: ${customerCount}
    `;
};

router.post('/process', authenticate, async (req: Request, res: Response) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ message: 'Command is required' });

        // 1. Try Fast Regex Parser First
        const intent = parseIntent(command);

        if (intent.type !== 'UNKNOWN') {
            // ... (Existing Regex Logic Copied for reference - need to merge carefully)
            // Since I am replacing the whole file, I will rewrite the regex handler logic here quickly or delegate?
            // Actually, best to keep the regex handler function `parseIntent` and use it.
            // Let's reuse the internal handler block below.

            if (intent.type === 'SEARCH_PRODUCT') {
                const query = (intent as any).query;
                const products = await prisma.product.findMany({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { sku: { contains: query, mode: 'insensitive' } },
                            { notes: { contains: query, mode: 'insensitive' } },
                            { compatibility: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    take: 5
                });
                return res.json({
                    type: 'SEARCH_RESULT',
                    message: `Found ${products.length} products for "${query}"`,
                    data: products
                });
            }

            if (intent.type === 'UPDATE_STOCK') {
                const { identifier, quantity, action } = intent as any;
                const product = await prisma.product.findFirst({
                    where: {
                        OR: [
                            { sku: { equals: identifier, mode: 'insensitive' } },
                            { name: { equals: identifier, mode: 'insensitive' } },
                            { name: { contains: identifier, mode: 'insensitive' } }
                        ]
                    }
                });

                if (!product) return res.json({ type: 'ERROR', message: `Could not find product matching "${identifier}"` });

                let newQuantity = quantity;
                if (action === 'ADD') newQuantity = product.quantityOnHand + quantity;

                return res.json({
                    type: 'CONFIRMATION_NEEDED',
                    message: `I will update stock for **${product.name}** (SKU: ${product.sku}) from ${product.quantityOnHand} to ${newQuantity}.`,
                    action: 'EXECUTE_UPDATE_STOCK',
                    payload: { productId: product.id, newQuantity }
                });
            }
        }

        // 2. Fallback to Gemini LLM if Regex Failed (UNKNOWN)
        if (genAI) {
            // Try explicit versions as well
            const modelsToTry = [
                "gemini-1.5-flash",
                "gemini-1.5-flash-001",
                "gemini-1.5-pro",
                "gemini-1.5-pro-001",
                "gemini-1.0-pro",
                "gemini-pro"
            ];

            let text = '';
            let failedModels: string[] = [];

            const context = await getStoreContext();
            const prompt = `
            You are an intelligent assistant for "Ibrahimi Store", a car parts shop.
            You have access to the following live data:
            ${context}

            The user is asking: "${command}"

            Rules:
            1. Support any language (Persian/Dari, English).
            2. If the user asks a general question (e.g., "How do I make a website?", "What is SEO?"), answer it helpfully and concisely.
            3. If the user asks about the store state (e.g., "How are sales?", "What is low on stock?"), use the context provided.
            4. If the user clearly wants to perform an action you can't do via text (like "Delete customer X"), explain that you can't do that yet but guide them.
            
            Response format: Just return the plain text response. Keep it friendly.
            `;

            // 1. Try SDK First
            for (const modelName of modelsToTry) {
                try {
                    console.log(`Attempting AI with model: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    text = response.text();
                    if (text) {
                        console.log(`Success with model: ${modelName}`);
                        break;
                    }
                } catch (err: any) {
                    console.warn(`Model ${modelName} failed:`, err.message);
                    failedModels.push(`${modelName} (${err.status || 'Error'})`);
                }
            }

            // 2. Direct REST Fallback (Bypassing SDK) if SDK failed
            if (!text) {
                try {
                    console.log('Attempting Direct REST API fallback...');
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });

                    if (response.ok) {
                        const data = await response.json() as any;
                        if (data.candidates && data.candidates.length > 0) {
                            text = data.candidates[0].content.parts[0].text;
                            console.log('Success with Direct REST API');
                        }
                    } else {
                        const errorData = await response.text();
                        console.warn('Direct REST API failed:', response.status, errorData);
                        failedModels.push(`REST-Direct (${response.status})`);
                    }
                } catch (restError: any) {
                    console.error('REST Fetch Error:', restError);
                    failedModels.push(`REST-Fetch (${restError.message})`);
                }
            }

            if (!text) {
                return res.json({
                    type: 'ERROR',
                    message: `AI Connection Failed. Tried: ${failedModels.join(', ')}. Please verify API Key permissions.`
                });
            }

            return res.json({
                type: 'AI_RESPONSE',
                message: text
            });

        } else {
            // No API Key
            return res.json({
                type: 'UNKNOWN',
                message: "I didn't understand that command. To enable smart web search and general AI, please configure the GEMINI_API_KEY server-side. For now, try specific commands like 'Find brake pads'."
            });
        }

    } catch (error) {
        console.error('AI Processing Error:', error);
        res.status(500).json({ message: 'Internal server error processing command' });
    }
});

// Endpoint to actually execute the action after confirmation
router.post('/execute', authenticate, async (req: Request, res: Response) => {
    try {
        const { action, payload } = req.body;

        if (action === 'EXECUTE_UPDATE_STOCK') {
            const { productId, newQuantity } = payload;
            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { quantityOnHand: newQuantity }
            });
            return res.json({
                type: 'SUCCESS',
                message: `Successfully updated stock for ${updatedProduct.name} to ${updatedProduct.quantityOnHand}.`,
                data: updatedProduct
            });
        }
        return res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        console.error('AI Execution Error:', error);
        res.status(500).json({ message: 'Internal server error executing command' });
    }
});

export default router;
