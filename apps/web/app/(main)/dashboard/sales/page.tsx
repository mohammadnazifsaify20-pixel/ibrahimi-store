'use client';

import { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import { Search, FileText, Calendar, User } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    customer: { name: string } | null;
    total: number;
    status: string;
    paidAmount: number;
}

export default function SalesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const res = await api.get('/sales');
            setInvoices(res.data);
        } catch (error) {
            console.error('Failed to fetch sales', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <div className="relative max-w-md">
                        {/* @ts-ignore */}
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Invoice # or Customer..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Total (AFG)</th>
                                <th className="px-6 py-4">Paid (AFG)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading sales...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No sales found.</td></tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => router.push(`/dashboard/sales/${invoice.id}`)}>
                                        <td className="px-6 py-4 font-medium text-blue-600">{invoice.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">{format(new Date(invoice.date), 'MMM d, yyyy')}</td>
                                        <td className="px-6 py-4 text-gray-900">{invoice.customer?.name || 'Walk-in'}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">؋{(Number(invoice.total) * ((invoice as any).exchangeRate || 70)).toFixed(0)}</td>
                                        <td className="px-6 py-4 text-green-600">؋{(Number(invoice.paidAmount) * ((invoice as any).exchangeRate || 70)).toFixed(0)}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-full text-xs font-bold",
                                                invoice.status === 'PAID' ? "bg-green-100 text-green-700" :
                                                    invoice.status === 'PARTIAL' ? "bg-orange-100 text-orange-700" :
                                                        "bg-gray-100 text-gray-700"
                                            )}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/sales/${invoice.id}`);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                            >
                                                {/* @ts-ignore */}
                                                <FileText size={16} />
                                                View Invoice
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
