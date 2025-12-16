'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Trash2, Search, Lock, AlertTriangle, Eye, X } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Auth / Delete State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState('');

    // View Invoice State
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales');
            setSales(res.data);
        } catch (error) {
            console.error('Failed to fetch sales', error);
        } finally {
            setLoading(false);
        }
    };

    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredSales.map(s => s.id)));
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
        setDeleteId(null);
        setAdminPassword('');
        setError('');
        setIsDeleteModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setAdminPassword('');
        setError('');
        setIsDeleteModalOpen(true);
    };

    const handleViewInvoice = async (id: number) => {
        setInvoiceLoading(true);
        setIsViewModalOpen(true);
        try {
            const res = await api.get(`/sales/${id}`);
            setSelectedInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice', error);
            setIsViewModalOpen(false);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const confirmDelete = async () => {
        setDeleteLoading(true);
        setError('');

        try {
            if (deleteId) {
                // Single Delete
                await api.delete(`/sales/${deleteId}`, {
                    data: { adminPassword }
                });
                setDeleteId(null);
            } else if (selectedIds.size > 0) {
                // Bulk Delete
                await api.post('/sales/bulk-delete', {
                    ids: Array.from(selectedIds),
                    adminPassword
                });
                setSelectedIds(new Set());
            }

            // Success
            setIsDeleteModalOpen(false);
            fetchSales(); // Refresh list
        } catch (err: any) {
            console.error('Delete failed', err);
            setError(err.response?.data?.message || 'Failed to verify Admin Key');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredSales = sales.filter(s =>
        s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
                <div className="flex items-center gap-4">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDeleteClick}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-bold shadow-sm"
                        >
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <div className="relative w-64">
                        {/* @ts-ignore */}
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search invoice or customer..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredSales.length > 0 && filteredSales.every(s => selectedIds.has(s.id))}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Total (AFG)</th>
                                <th className="px-6 py-4">Paid (AFG)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredSales.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No sales found.</td></tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(sale.id)}
                                                onChange={() => handleSelectOne(sale.id)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{sale.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(sale.date).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">
                                            {sale.customer?.name || 'Walk-in'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ؋{sale.totalLocal ? Number(sale.totalLocal).toFixed(0) : (Number(sale.total) * 70).toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-green-600">
                                            ؋{sale.paidAmount ? (Number(sale.paidAmount) * (sale.exchangeRate || 70)).toFixed(0) : '0'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${sale.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                sale.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewInvoice(sale.id)}
                                                    className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition"
                                                    title="View Invoice"
                                                >
                                                    {/* @ts-ignore */}
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(sale.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                                                    title="Delete Sale"
                                                >
                                                    {/* @ts-ignore */}
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Admin Password Modal */}
            <Transition appear show={isDeleteModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50" />
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        {/* @ts-ignore */}
                                        <AlertTriangle className="text-red-600" />
                                        {deleteId ? 'Confirm Deletion' : `Bulk Delete (${selectedIds.size})`}
                                    </Dialog.Title>

                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 mb-4">
                                            {deleteId
                                                ? 'Are you sure you want to delete this sale? This action will restore the stock and cannot be undone.'
                                                : `Are you sure you want to delete ${selectedIds.size} sales? This will restore stock for ALL selected items.`
                                            }
                                        </p>

                                        <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-4">
                                            <label className="block text-sm font-bold text-red-900 mb-1">
                                                Admin Key Required
                                            </label>
                                            <div className="relative">
                                                {/* @ts-ignore */}
                                                <Lock className="absolute left-3 top-2.5 text-red-400" size={16} />
                                                <input
                                                    type="password"
                                                    value={adminPassword}
                                                    onChange={(e) => setAdminPassword(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="Enter Admin Password"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <p className="text-xs text-red-600 font-bold mb-4">{error}</p>
                                        )}

                                        <div className="flex gap-3 justify-end">
                                            <button
                                                onClick={() => setIsDeleteModalOpen(false)}
                                                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={deleteLoading || !adminPassword}
                                                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleteLoading ? 'Verifying...' : (deleteId ? 'Delete Sale' : 'Delete Selected')}
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* View Invoice Modal */}
            <Transition appear show={isViewModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all relative" id="invoice-modal">
                                    {/* Background Logo Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0" id="invoice-watermark">
                                        <img src="/logo.png" alt="" className="w-96 h-auto" style={{ filter: 'blur(2px)' }} />
                                    </div>
                                    <div className="relative z-10" id="invoice-content">
                                    {invoiceLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : selectedInvoice ? (
                                        <>
                                            {/* Company Header with Logo */}
                                            <div className="border-b-2 pb-4 mb-6 print:border-b" id="invoice-header">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4" id="company-info">
                                                        <img src="/logo.png" alt="Company Logo" className="h-20 w-auto invoice-logo" id="invoice-logo" />
                                                        <div>
                                                            <h1 className="text-xl font-bold text-gray-900">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h1>
                                                            <p className="text-sm text-gray-600 mt-1">Motor Parts & Accessories</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 print:hidden">
                                                        <button
                                                            onClick={() => window.print()}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                        >
                                                            Print Invoice
                                                        </button>
                                                        <button
                                                            onClick={() => setIsViewModalOpen(false)}
                                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition"
                                                        >
                                                            {/* @ts-ignore */}
                                                            <X size={24} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Invoice Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex-1">
                                                    <Dialog.Title as="h2" className="text-3xl font-bold text-gray-900">
                                                        Invoice {selectedInvoice.invoiceNumber}
                                                    </Dialog.Title>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Date: {new Date(selectedInvoice.date).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Customer Info */}
                                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                                <h3 className="font-bold text-gray-900 mb-2">Customer Information</h3>
                                                <p className="text-gray-700">
                                                    <span className="font-medium">Name:</span> {selectedInvoice.customer?.name || 'Walk-in Customer'}
                                                </p>
                                                {selectedInvoice.customer?.email && (
                                                    <p className="text-gray-700">
                                                        <span className="font-medium">Email:</span> {selectedInvoice.customer.email}
                                                    </p>
                                                )}
                                                {selectedInvoice.customer?.phone && (
                                                    <p className="text-gray-700">
                                                        <span className="font-medium">Phone:</span> {selectedInvoice.customer.phone}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Items Table */}
                                            <div className="mb-6">
                                                <h3 className="font-bold text-gray-900 mb-3">Invoice Items</h3>
                                                <div className="overflow-x-auto border rounded-lg">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-50 border-b">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                                                                <th className="px-4 py-3 text-right font-medium text-gray-600">Quantity</th>
                                                                <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                                                                <th className="px-4 py-3 text-right font-medium text-gray-600">Discount</th>
                                                                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {selectedInvoice.items?.map((item: any) => (
                                                                <tr key={item.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-3 text-gray-900">
                                                                        {item.product?.name || 'Product'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-gray-700">
                                                                        {item.quantity}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-gray-700">
                                                                        ${Number(item.unitPrice).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-gray-700">
                                                                        ${Number(item.discount || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                                        ${((Number(item.unitPrice) * item.quantity) - Number(item.discount || 0)).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Totals */}
                                            <div className="border-t pt-6 space-y-3">
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Subtotal (USD):</span>
                                                    <span className="font-medium">${Number(selectedInvoice.total).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Exchange Rate:</span>
                                                    <span className="font-medium">1 USD = ؋{selectedInvoice.exchangeRate || 70}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                                                    <span>Total (AFG):</span>
                                                    <span>؋{(Number(selectedInvoice.total) * (selectedInvoice.exchangeRate || 70)).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-700">
                                                    <span>Paid Amount:</span>
                                                    <span className="font-medium text-green-600">
                                                        ؋{(Number(selectedInvoice.paidAmount || 0) * (selectedInvoice.exchangeRate || 70)).toFixed(0)}
                                                    </span>
                                                </div>
                                                {selectedInvoice.status !== 'PAID' && (
                                                    <div className="flex justify-between text-gray-700">
                                                        <span>Outstanding:</span>
                                                        <span className="font-medium text-red-600">
                                                            ؋{((Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount || 0)) * (selectedInvoice.exchangeRate || 70)).toFixed(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Payment Info */}
                                            <div className="mt-6 bg-blue-50 rounded-lg p-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm text-gray-600">Payment Method</p>
                                                        <p className="font-bold text-gray-900">{selectedInvoice.paymentMethod}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Status</p>
                                                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                                            selectedInvoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                            selectedInvoice.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {selectedInvoice.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payments History */}
                                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                                <div className="mt-6">
                                                    <h3 className="font-bold text-gray-900 mb-3">Payment History</h3>
                                                    <div className="space-y-2">
                                                        {selectedInvoice.payments.map((payment: any) => (
                                                            <div key={payment.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                                                                <div>
                                                                    <p className="text-sm text-gray-600">
                                                                        {new Date(payment.date).toLocaleString()}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">{payment.method}</p>
                                                                </div>
                                                                <p className="font-bold text-green-600">
                                                                    ؋{(Number(payment.amount) * (selectedInvoice.exchangeRate || 70)).toFixed(0)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Close Button */}
                                            <div className="mt-8 flex justify-end">
                                                <button
                                                    onClick={() => setIsViewModalOpen(false)}
                                                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </>
                                    ) : null}
                                    </div>
                                    
                                    <style jsx global>{`
                                        @media print {
                                            @page {
                                                size: A4;
                                                margin: 1cm;
                                            }
                                            * {
                                                -webkit-print-color-adjust: exact !important;
                                                print-color-adjust: exact !important;
                                                color-adjust: exact !important;
                                            }
                                            body * {
                                                visibility: hidden;
                                            }
                                            #invoice-modal,
                                            #invoice-modal *,
                                            #invoice-watermark,
                                            #invoice-watermark *,
                                            #invoice-content,
                                            #invoice-content *,
                                            #invoice-header,
                                            #invoice-header *,
                                            #company-info,
                                            #company-info *,
                                            .invoice-logo,
                                            #invoice-logo {
                                                visibility: visible !important;
                                            }
                                            #invoice-modal {
                                                position: absolute;
                                                left: 0;
                                                top: 0;
                                                width: 100%;
                                                max-width: 100% !important;
                                                box-shadow: none !important;
                                                border-radius: 0 !important;
                                                padding: 20px !important;
                                            }
                                            #invoice-watermark {
                                                opacity: 0.05 !important;
                                            }
                                            #invoice-watermark img {
                                                display: block !important;
                                                visibility: visible !important;
                                            }
                                            #invoice-logo,
                                            .invoice-logo {
                                                display: block !important;
                                                visibility: visible !important;
                                                max-height: 80px !important;
                                                width: auto !important;
                                                opacity: 1 !important;
                                            }
                                        }
                                    `}</style>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
