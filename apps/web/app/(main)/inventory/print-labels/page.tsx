'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../../../lib/api';
import { Printer } from 'lucide-react';
import { useSettingsStore } from '../../../../lib/settingsStore';

interface Product {
    id: number;
    name: string;
    sku: string;
    salePrice: number;
    salePriceAFN?: number | null;
    location?: string;
}

function PrintLabelsContent() {
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        fetchExchangeRate();
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const ids = searchParams.get('ids');
                const runAll = searchParams.get('all');

                let data: Product[] = [];

                if (runAll === 'true') {
                    // Fetch all active products
                    // We might need a better endpoint for "ALL" without pagination if the list is huge,
                    // but for now let's reuse /products with a big limit or a specific export endpoint.
                    // Ideally we should add an endpoint `GET /products/all` or similar. 
                    // Let's try regular fetch with high limit for MVP.
                    const res = await api.get('/products', { params: { limit: 1000, status: 'active' } });
                    data = res.data.data || res.data;
                } else if (ids) {
                    // Fetch specific IDs
                    // We don't have a specific bulk get endpoint, but we can filter on client or filter by filtering param if API supports it.
                    // Assuming API might not support `?ids=1,2,3` directly yet.
                    // Let's implement a quick client-side filter or fetch all and filter if necessary, 
                    // OR (Better) assume the backend can handle filtering or we use what we have.
                    // Actually, the csv export logic usually handles bulk.
                    // Let's iterate fetches or use a loop for now if no bulk endpoint, 
                    // BUT better is to just fetch the list page logic.
                    // WAIT, the most robust way without changing API is to pass the data via state or just fetch them.
                    // Let's try to pass IDs to `GET /products` if supported, or just fetch filtered.
                    // For now, let's fetch all and filter client side if list isn't massive, 
                    // OR if list is massive, we DO need an API change.
                    // Let's assume user won't print 1000s of selected labels at once manually.
                    // Filtering 50 selected from 1000 is fine.

                    // Actually, let's just use the `ids` param if we add it to API, 
                    // OR just reuse the bulk delete endpoint style logic but for fetching? No.

                    // Workaround: Call get product for each ID (Slow) or Fetch All and filter (OK for small shops).
                    // Let's go with: Fetch All with high limit, then filter.
                    const res = await api.get('/products', { params: { limit: 1000, status: 'active' } });
                    const allProducts = res.data.data || res.data;
                    const idSet = new Set(ids.split(',').map(Number));
                    data = allProducts.filter((p: Product) => idSet.has(p.id));
                }

                setProducts(data);
            } catch (error) {
                console.error('Failed to fetch products for labels', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [searchParams]);

    const getPrice = (p: Product) => {
        if (p.salePriceAFN) return Number(p.salePriceAFN);
        return Number(p.salePrice) * (Number(exchangeRate) || 70);
    };

    if (loading) return <div className="p-8 text-center">Loading labels...</div>;

    return (
        <div className="min-h-screen bg-white text-black p-4 print:p-0">
            {/* No-Print Header */}
            <div className="mb-8 flex justify-between items-center print:hidden max-w-[210mm] mx-auto">
                <h1 className="text-2xl font-bold">Print Labels ({products.length})</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.href = '/inventory'}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                        {/* @ts-ignore */}
                        <Printer size={20} />
                        Print Now
                    </button>
                </div>
            </div>

            {/* A4 Sheet Container */}
            {/* 
               Standard A4: 210mm x 297mm.
               33 Labels (3 cols x 11 rows).
               Label size approx: 70mm x 25.4mm.
               Margins: Usually small.
            */}
            <div
                id="print-area"
                className="mx-auto bg-white grid gap-0"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridAutoRows: '25.4mm', // Exact height for 11 rows
                    padding: '6mm 5mm', // Reduced top/bottom padding to ensure fit within single A4
                }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="border-[0.5px] border-gray-200 border-dashed print:border-none flex flex-col justify-center items-center text-center p-1 overflow-hidden"
                        style={{ height: '25.4mm' }}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 leading-tight">Ibrahimi Store</div>
                        <div className="font-bold text-sm leading-tight line-clamp-1 w-full px-1">{product.name}</div>
                        <div className="text-xl font-black leading-none my-0.5">
                            <span className="text-xs align-top mr-0.5">؋</span>
                            {Math.floor(getPrice(product)).toLocaleString()}
                        </div>
                        <div className="flex justify-between w-full px-2 mt-auto">
                            <div className="text-[9px] font-mono text-gray-600 leading-tight">{product.sku}</div>
                            {product.location && <div className="text-[9px] font-bold text-gray-800 leading-tight bg-gray-100 px-1 rounded">{product.location}</div>}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    /* Ensure the print area and all its children are visible */
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    /* Position the print area at the top left of the page */
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default function PrintLabelsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrintLabelsContent />
        </Suspense>
    );
}
