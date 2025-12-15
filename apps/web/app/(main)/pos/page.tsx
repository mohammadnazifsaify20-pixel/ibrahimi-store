'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '../../../lib/cartStore';
import api from '../../../lib/api';
import CheckoutModal from '../../../components/CheckoutModal';
import { useSettingsStore } from '../../../lib/settingsStore';

interface Product {
    id: number;
    name: string;
    salePrice: number;
    salePriceAFN?: number | null;
    sku: string;
    quantityOnHand: number;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        fetchExchangeRate();
    }, []);

    const getPrice = (item: Product | any) => {
        if (item.salePriceAFN !== null && item.salePriceAFN !== undefined) return Number(item.salePriceAFN);
        return Number(item.salePrice) * Number(exchangeRate);
    };

    const total = items.reduce((sum, item) => sum + (getPrice(item) * item.quantity), 0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchProducts();
    }, [debouncedSearch]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products', {
                params: {
                    search: debouncedSearch,
                    limit: 20 // Load fewer for POS grid, maybe infinite scroll later
                }
            });

            if (res.data.data) {
                setProducts(res.data.data);
            } else {
                setProducts(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products;

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] -m-4 lg:-m-6 overflow-x-hidden">
            {/* Product Grid Area */}
            <div className="flex-1 flex flex-col p-4 lg:p-6 lg:pr-0 min-w-0 bg-gray-50 border-r h-[calc(100vh-200px)] lg:h-auto overflow-y-auto">
                <div className="mb-4 lg:mb-6 relative">
                    {/* @ts-ignore */}
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Scan or search..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex-1 pb-20 lg:pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                        {filteredProducts.map((product) => {
                            const price = getPrice(product);
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addItem(product)}
                                    disabled={product.quantityOnHand <= 0}
                                    className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md transition text-left flex flex-col h-32 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className="font-bold text-gray-900 truncate w-full">{product.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 mb-auto">{product.sku}</span>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-lg font-bold text-blue-600">؋{price.toFixed(0)}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${product.quantityOnHand > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.quantityOnHand}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {filteredProducts.length === 0 && !loading && (
                        <div className="text-center py-20 text-gray-500">No products found.</div>
                    )}
                </div>
            </div>

            {/* Cart Sidebar / Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 lg:static lg:w-96 bg-white flex flex-col lg:h-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:shadow-2xl z-20 border-t lg:border-t-0">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden lg:flex p-4 border-b items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {/* @ts-ignore */}
                        <ShoppingCart size={20} />
                        Current Order
                    </h2>
                    <button onClick={clearCart} className="text-sm text-red-600 hover:underline">Clear</button>
                </div>

                {/* Cart Items - Hidden on Mobile unless expanded (simplified for now: just show total and checkout on mobile, items visible on desktop) */}
                <div className="hidden lg:flex flex-1 overflow-y-auto p-4 space-y-3">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            {/* @ts-ignore */}
                            <ShoppingCart size={48} className="opacity-20" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        items.map((item, index) => {
                            const price = getPrice(item);
                            return (
                                <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-2 relative group">
                                    <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-10">
                                        {index + 1}
                                    </div>
                                    <div className="flex justify-between pl-2">
                                        <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                                        <span className="font-bold">؋{(price * item.quantity).toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm pl-2">
                                        <span className="text-gray-500">؋{price.toFixed(0)} x {item.quantity}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded shadow-sm transition">
                                                    {/* @ts-ignore */}
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-bold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded shadow-sm transition">
                                                    {/* @ts-ignore */}
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove Item"
                                            >
                                                {/* @ts-ignore */}
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Mobile View Toggle / Summary */}
                <div className="lg:hidden p-3 bg-blue-50 flex justify-between items-center border-b">
                    <span className="font-bold text-gray-700">{items.length} Items</span>
                    <button onClick={() => alert('View Cart details not implemented for mobile yet, use Desktop')} className="text-blue-600 text-sm font-bold">View List</button>
                </div>

                <div className="p-4 border-t bg-gray-50 space-y-2 lg:space-y-4">
                    <div className="flex justify-between items-center text-xl font-bold pt-2 lg:border-t border-gray-200">
                        <span>Total</span>
                        <span>؋{total.toFixed(0)}</span>
                    </div>

                    <button
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={items.length === 0}
                        className="w-full bg-blue-600 text-white py-3 lg:py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                    >
                        Checkout
                    </button>
                </div>
            </div>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                onSuccess={() => {/* Maybe show success toast */ }}
            />
        </div>
    );
}
