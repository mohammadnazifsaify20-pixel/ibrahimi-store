'use client';

import { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import { Search, FileText, Calendar, User } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { getEmailConfig, generateInvoicePDF, sendInvoiceEmail } from '../../../../lib/emailUtils';

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
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [emailProcessing, setEmailProcessing] = useState(false);
    const [emailProgress, setEmailProgress] = useState('');
    // For batch email PDF generation
    const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<any>(null);
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

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
        }
    };

    const handleBatchEmail = async () => {
        if (selectedIds.size === 0) return;

        // Load config
        const config = await getEmailConfig();
        if (!config || !config.serviceId) {
            alert('Email settings not configured. Please go to Settings > Email Config.');
            return;
        }

        if (!confirm(`Are you sure you want to email receipts for ${selectedIds.size} invoices?`)) return;

        setEmailProcessing(true);
        let successCount = 0;
        let failCount = 0;

        const ids = Array.from(selectedIds);

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            setEmailProgress(`Processing ${i + 1}/${ids.length}...`);

            try {
                // Fetch full invoice details
                const res = await api.get(`/sales/${id}`);
                const invoice = res.data;

                // Set to state for rendering
                setSelectedInvoiceForEmail(invoice);

                // Wait for render
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check if customer has email
                if (!invoice.customer?.email) {
                    console.warn(`Skipping invoice ${invoice.invoiceNumber}: No customer email`);
                    failCount++;
                    continue;
                }

                // Generate PDF
                const pdfBlob = await generateInvoicePDF('email-invoice-content', invoice.invoiceNumber);

                if (pdfBlob) {
                    await sendInvoiceEmail(invoice, pdfBlob, config);
                    successCount++;
                } else {
                    console.error('Failed to generate PDF for', invoice.invoiceNumber);
                    failCount++;
                }

            } catch (error) {
                console.error(`Failed to email invoice ${id}`, error);
                failCount++;
            }
        }

        setEmailProcessing(false);
        setEmailProgress('');
        setSelectedInvoiceForEmail(null);
        alert(`Batch Email Completed.\n✅ Sent: ${successCount}\n⚠️ Skipped/Failed: ${failCount}\n\nNote: Invoices are skipped if the customer has no email address.`);
        setSelectedIds(new Set());
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="relative max-w-md flex-1">
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
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBatchEmail}
                            disabled={emailProcessing}
                            className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold shadow-sm flex items-center gap-2"
                        >
                            {emailProcessing ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    {emailProgress}
                                </>
                            ) : (
                                <>
                                    📧 Email Selected ({selectedIds.size})
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                </th>
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
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(invoice.id)}
                                                onChange={() => toggleSelect(invoice.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            />
                                        </td>
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
