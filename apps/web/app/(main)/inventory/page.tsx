'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Plus, Search, Filter, Edit2, Trash2, Package, RotateCcw, Upload, Printer } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../../lib/store';
import AddProductModal from '../../../components/AddProductModal';
import PasswordConfirmModal from '../../../components/PasswordConfirmModal';
import ProductImportModal from '../../../components/ProductImportModal';
import { useSettingsStore } from '../../../lib/settingsStore';

interface Product {
    id: number;
    sku: string;
    name: string;
    brand: string;
    category: string;
    salePrice: number;
    salePriceAFN?: number | null;
    costPrice: number;
    quantityOnHand: number;
    location: string;
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { user } = useAuthStore();

    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const { exchangeRate } = useSettingsStore();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Reuse PasswordConfirmModal logic but adapted for this page if it doesn't exist
    // Actually the page uses confirm() for single delete, let's switch to proper modal for bulk.
    // We need to import PasswordConfirmModal if not imported.
    // Wait, the file doesn't import it. I need to add import. 
    // And for single delete it uses window.confirm. I should probably harmonize.
    // For now I will add PasswordConfirmModal usage for bulk.

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchProducts();
    }, [activeTab, page, debouncedSearch]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products', {
                params: {
                    status: activeTab,
                    page,
                    limit: 50,
                    search: debouncedSearch
                }
            });
            // Handle new response format
            if (res.data.data) {
                setProducts(res.data.data);
                setTotalPages(res.data.meta.totalPages);
                setTotalItems(res.data.meta.total);
            } else {
                // Fallback if API hasn't updated or returns old format (though we updated it)
                setProducts(res.data);
            }
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        // Toggle Active Status
        const action = activeTab === 'active' ? 'archive' : 'restore';
        if (!confirm(`Are you sure you want to ${action} this product?`)) return;
        try {
            await api.put(`/products/${id}/toggle-status`);
            fetchProducts();
        } catch (error) {
            alert('Failed to update product status');
            console.error(error);
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingProduct(null);
    };

    // Removed client-side filtering
    const filteredProducts = products;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.size === 0) return;
        setIsDeleteModalOpen(true);
    };

    const handleConfirmBulkDelete = async (password: string) => {
        setDeleteLoading(true);
        try {
            const res = await api.post('/products/bulk-delete', {
                ids: Array.from(selectedIds),
                password
            });
            alert(res.data.message);
            setSelectedIds(new Set());
            setIsDeleteModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete products');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Management</h1>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'active'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Active Products
                        </button>
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'archived'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Archived
                        </button>
                    </div>
                </div>

                <div className='flex gap-2 items-start'>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDeleteClick}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-bold"
                        >
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}

                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => {
                                const ids = Array.from(selectedIds).join(',');
                                window.open(`/inventory/print-labels?ids=${ids}`, '_blank');
                            }}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition font-bold flex items-center gap-2"
                        >
                            {/* @ts-ignore */}
                            <Printer size={20} />
                            Print Selected ({selectedIds.size})
                        </button>
                    )}


                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Navigate to Print All
                                    window.open('/inventory/print-labels?all=true', '_blank');
                                }}
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-900 transition"
                            >
                                {/* @ts-ignore */}
                                <Printer size={20} />
                                Print All
                            </button>

                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
                            >
                                {/* @ts-ignore */}
                                <Upload size={20} />
                                Import
                            </button>

                            <button
                                onClick={() => { setEditingProduct(null); setIsAddModalOpen(true); }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                            >
                                {/* @ts-ignore */}
                                <Plus size={20} />
                                Add Product
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchProducts}
                product={editingProduct}
            />

            <ProductImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchProducts}
            />

            <PasswordConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmBulkDelete}
                title={`Delete ${selectedIds.size} Products`}
                message={`Are you sure you want to delete ${selectedIds.size} products? Products with sales history will be skipped.`}
                confirmText="Delete Selected"
                isLoading={deleteLoading}
            />

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        {/* @ts-ignore */}
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search products by Name, SKU, Brand..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700">
                        {/* @ts-ignore */}
                        <Filter size={20} />
                        Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(product.id)}
                                                onChange={() => handleSelectOne(product.id)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{product.sku}</td>
                                        <td className="px-6 py-4 text-gray-600">{product.category || '-'}</td>
                                        <td className="px-6 py-4 text-gray-900">؋{(product.salePriceAFN ? Number(product.salePriceAFN) : Math.floor(Number(product.salePrice) * exchangeRate)).toLocaleString()}</td>
                                        <td className={clsx("px-6 py-4 font-medium", product.quantityOnHand <= 5 ? "text-orange-600" : "text-green-600")}>
                                            {product.quantityOnHand} units
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{product.location || '-'}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                {/* @ts-ignore */}
                                                <Edit2 size={16} />
                                            </button>
                                            {(user?.role === 'ADMIN') && (
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className={clsx(
                                                        "p-2 rounded-lg",
                                                        activeTab === 'active' ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                                                    )}
                                                    title={activeTab === 'active' ? "Archive Product" : "Restore Product"}
                                                >
                                                    {/* @ts-ignore */}
                                                    {activeTab === 'active' ? <Package size={16} /> : <RotateCcw size={16} />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                <div className="text-sm text-gray-600">
                    Showing {products.length} of {totalItems} products (Page {page} of {totalPages})
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-white border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>

        </div>
    );
}
