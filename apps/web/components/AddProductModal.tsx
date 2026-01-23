'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../lib/api';
import { useSettingsStore } from '../lib/settingsStore';

interface Product {
    id?: number;
    sku: string;
    name: string;
    brand?: string;
    category?: string;
    salePrice: number;
    salePriceAFN?: number | null;
    costPrice: number;
    quantityOnHand: number;
    location?: string;
}

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: Product | null;
}

export default function AddProductModal({ isOpen, onClose, onSuccess, product }: AddProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        brand: '',
        category: '',
        salePrice: '',
        costPrice: '',
        quantityOnHand: '',
        location: ''
    });
    const [error, setError] = useState('');

    const [salePriceAFG, setSalePriceAFG] = useState('');
    const { exchangeRate } = useSettingsStore();

    // Load product data when modal opens or product changes
    useEffect(() => {
        if (product) {
            setFormData({
                sku: product.sku,
                name: product.name,
                brand: product.brand || '',
                category: product.category || '',
                salePrice: String(product.salePrice),
                costPrice: String(product.costPrice),
                quantityOnHand: String(product.quantityOnHand),
                location: product.location || ''
            });

            // Use the stored fixed AFN price if available, otherwise calculate from USD
            if (product.salePriceAFN) {
                setSalePriceAFG(String(Number(product.salePriceAFN)));
            } else {
                setSalePriceAFG((product.salePrice * exchangeRate).toFixed(0));
            }
        } else {
            // Reset form for new product
            setFormData({ sku: '', name: '', brand: '', category: '', salePrice: '', costPrice: '', quantityOnHand: '', location: '' });
            setSalePriceAFG('');
        }
    }, [product, isOpen, exchangeRate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Logic:
            // 1. User inputs AFN price (salePriceAFG)
            // 2. We save this EXCACT AFN amount as `salePriceAFN` (Fixed Price)
            // 3. We also calculate and save `salePrice` (USD) for reporting compatibility, using CURRENT rate.

            const fixedAFN = Number(salePriceAFG);
            const salePriceUSD = fixedAFN / exchangeRate;

            const payload = {
                ...formData,
                salePrice: salePriceUSD || 0,
                salePriceAFN: fixedAFN || 0, // NEW: Sending the fixed price
                costPrice: Number(formData.costPrice) || 0,
                quantityOnHand: Number(formData.quantityOnHand) || 0,
            };

            if (product && product.id) {
                await api.put(`/products/${product.id}`, payload);
            } else {
                await api.post('/products', payload);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Save product error:', err);

            // Handle different error structures
            if (err.response?.data?.errors) {
                // Zod validation errors (array of issues)
                const zodErrors = err.response.data.errors
                    .map((e: any) => `${e.path.join('.')}: ${e.message}`)
                    .join(', ');
                setError(`Validation Error: ${zodErrors}`);
            } else if (err.response?.data?.message) {
                // Application specific errors (e.g. SKU exists)
                setError(err.response.data.message);
            } else {
                // Generic fallback - Show full details for debugging
                setError(`Failed to save: ${JSON.stringify(err.response?.data || err.message)}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        {product ? 'Edit Product' : 'Add New Product'}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        {/* @ts-ignore */}
                                        <X size={24} />
                                    </button>
                                </div>

                                {error && (
                                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">SKU</label>
                                        <input name="sku" required value={formData.sku} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                                        <input name="brand" value={formData.brand} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                        <input name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Cost Price ($)</label>
                                        <input type="number" step="0.01" name="costPrice" required value={formData.costPrice} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fixed Sale Price (AFG)</label>
                                        <input
                                            type="number"
                                            value={salePriceAFG}
                                            onChange={(e) => setSalePriceAFG(e.target.value)}
                                            className="mt-1 block w-full border rounded-md p-2 bg-blue-50 focus:bg-white"
                                            placeholder="Enter Fixed AFN Price"
                                        />
                                        <p className="text-xs text-blue-600 mt-1">This price will NOT change with exchange rate.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                                        <input type="number" name="quantityOnHand" required value={formData.quantityOnHand} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Location</label>
                                        <input name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 mt-4 flex justify-end gap-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                                            {loading ? 'Saving...' : (product ? 'Update Product' : 'Save Product')}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
