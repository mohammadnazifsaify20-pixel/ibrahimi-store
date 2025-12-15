'use client';

import { useEffect, useState } from 'react';
import api from '../../../../../lib/api';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Printer, RotateCcw } from 'lucide-react';
import ReturnItemsModal from '../../../../../components/ReturnItemsModal';

interface InvoiceItem {
    id: number;
    product: { name: string; sku: string };
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    customer: { name: string; phone?: string; address?: string; displayId?: string } | null;
    user: { name: string };
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paidAmount: number;
    outstandingAmount: number;
    status: string;
    exchangeRate: number;
    totalLocal?: number;
}


export default function InvoicePage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    useEffect(() => {
        if (id) fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/sales/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading invoice...</div>;
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
                <button
                    onClick={() => setIsReturnModalOpen(true)}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-bold"
                >
                    {/* @ts-ignore */}
                    <RotateCcw size={20} />
                    Return Items
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {/* @ts-ignore */}
                    <Printer size={20} />
                    Print Invoice
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border print:shadow-none print:border-none print:p-0" id="invoice-content">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-8 mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 uppercase">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h2>
                        <h3 className="text-lg font-bold text-gray-800 font-arabic mt-1">(شرکت پرزه جات ابراهیمی و برادران)</h3>
                        <p className="text-gray-500 mt-1 font-bold">Khawaja Bahaawuddin - Bandar Takhar | خواجه بهاوالدین بندر تخار</p>
                        <p className="text-gray-500 font-bold">Contact: +93 70 617 5560 | تماس</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                        <p className="text-gray-500 mt-1">Date: {format(new Date(invoice.date), 'PPP')}</p>
                        <p className="text-gray-500">Status: <span className="font-bold uppercase text-gray-900">{invoice.status}</span></p>
                    </div>
                </div>

                {/* Customer & Bill To */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</h4>
                        <p className="font-bold text-gray-900">{invoice.customer?.name || 'Walk-in Customer'}</p>
                        {/* @ts-ignore */}
                        {invoice.customer?.displayId && <p className="text-gray-600 font-mono text-xs">ID: {invoice.customer.displayId}</p>}
                        {invoice.customer?.phone && <p className="text-gray-600">{invoice.customer.phone}</p>}
                        {invoice.customer?.address && <p className="text-gray-600">{invoice.customer.address}</p>}
                    </div>
                    <div className="text-right">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Served By</h4>
                        <p className="font-medium text-gray-900">{invoice.user.name}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead className="bg-gray-50 text-gray-600 font-bold text-sm uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">Item</th>
                            <th className="px-4 py-3 text-right">Qty</th>
                            <th className="px-4 py-3 text-right">Price (AFG)</th>
                            <th className="px-4 py-3 text-right">Total (AFG)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoice.items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-gray-900">{item.product.name}</p>
                                    <p className="text-xs text-gray-500">{item.product.sku}</p>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                    {item.quantity}
                                    {item.returnedQuantity > 0 && (
                                        <span className="block text-xs text-red-500 font-bold">(-{item.returnedQuantity} Returned)</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">؋{(Number(item.unitPrice) * Number(invoice.exchangeRate || 70)).toFixed(0)}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900">؋{(Number(item.total) * Number(invoice.exchangeRate || 70)).toFixed(0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal (AFG):</span>
                            <span className="font-medium">؋{(Number(invoice.subtotal) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                        </div>
                        {Number(invoice.tax) > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax:</span>
                                <span className="font-medium">؋{(Number(invoice.tax) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                            </div>
                        )}
                        {Number(invoice.discount) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Discount:</span>
                                <span className="font-medium">-؋{(Number(invoice.discount) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-3">
                            <span>Total (AFG):</span>
                            <span>؋{invoice.totalLocal ? Number(invoice.totalLocal).toFixed(0) : (Number(invoice.total) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                        </div>

                        {/* Return / Refund Info */}
                        {(() => {
                            const returnedVal = invoice.items.reduce((acc, item) => acc + ((item.returnedQuantity || 0) * Number(item.unitPrice)), 0);
                            const returnedValAFN = returnedVal * Number(invoice.exchangeRate || 70);

                            if (returnedVal > 0) {
                                return (
                                    <>
                                        <div className="flex justify-between text-red-600 border-b pb-2">
                                            <span>Less Returns:</span>
                                            <span>-؋{returnedValAFN.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
                                            <span>Net Total (AFG):</span>
                                            <span>؋{((Number(invoice.total) - returnedVal) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                                        </div>
                                    </>
                                );
                            }
                            return null;
                        })()}

                        <div className="flex justify-between text-gray-600 pt-2 border-t mt-2">
                            <span>Paid Amount (AFG):</span>
                            <span className="font-medium text-green-600">؋{(Number(invoice.paidAmount) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                        </div>
                        {Number(invoice.outstandingAmount) > 0 && (
                            <div className="flex justify-between text-red-600 font-bold">
                                <span>Balance Due (AFG):</span>
                                <span>؋{(Number(invoice.outstandingAmount) * Number(invoice.exchangeRate || 70)).toFixed(0)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
                    <p>Thank you for your business!</p>
                </div>
            </div>

            <ReturnItemsModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onSuccess={fetchInvoice}
                invoice={invoice}
            />
        </div>
    );
}
