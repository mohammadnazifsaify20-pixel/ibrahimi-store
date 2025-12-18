'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import AddCustomerModal from '../../../../components/AddCustomerModal';
import ReceivePaymentModal from '../../../../components/ReceivePaymentModal';
import { ChevronLeft, Edit, Wallet, CreditCard } from 'lucide-react';
import { useSettingsStore } from '../../../../lib/settingsStore';

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [customer, setCustomer] = useState<any>(null);
    const [creditHistory, setCreditHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        fetchCustomer();
        fetchCreditHistory();
        fetchExchangeRate();
    }, [params.id]);

    const fetchCustomer = async () => {
        try {
            const res = await api.get(`/customers/${params.id}`);
            setCustomer(res.data);
        } catch (error) {
            console.error('Failed to fetch customer', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCreditHistory = async () => {
        try {
            const res = await api.get(`/debts`, { params: { customerId: params.id } });
            setCreditHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch credit history', error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!customer) return <div className="p-8 text-center">Customer not found</div>;

    const rate = Number(exchangeRate) || 70;

    // Display Logic for Debt: Use Fixed AFN if exists, else estimate
    const displayDebtAFN = customer.outstandingBalanceAFN
        ? Number(customer.outstandingBalanceAFN)
        : Number(customer.outstandingBalance || 0) * rate;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <AddCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchCustomer}
                customerToEdit={customer}
            />

            <ReceivePaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={fetchCustomer}
                customer={customer}
            />

            <button onClick={() => router.back()} className="flex items-center text-gray-600 mb-6 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back to Customers
            </button>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                        {/* @ts-ignore */}
                        {customer.displayId && (
                            <span className="bg-blue-100 text-blue-800 text-lg px-3 py-1 rounded-lg font-mono font-bold">
                                {/* @ts-ignore */}
                                {customer.displayId}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/customers/${params.id}/print-card`)}
                            className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-black transition shadow-sm"
                        >
                            {/* @ts-ignore */}
                            <CreditCard size={18} />
                            Print Card
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition border"
                        >
                            {/* @ts-ignore */}
                            <Edit size={16} />
                            Edit Details
                        </button>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm ml-3"
                        >
                            {/* @ts-ignore */}
                            <Wallet size={18} />
                            Receive Payment
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-600">
                    <div>
                        <span className="block text-sm text-gray-400">Email</span>
                        {customer.email || 'N/A'}
                    </div>
                    <div>
                        <span className="block text-sm text-gray-400">Phone</span>
                        {customer.phone || 'N/A'}
                    </div>
                    <div>
                        <span className="block text-sm text-gray-400">Current Debt</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-bold text-xl ${displayDebtAFN > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ؋{Math.floor(displayDebtAFN).toLocaleString()}
                            </span>
                            {customer.outstandingBalanceAFN && <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">Fixed</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Credit History Section */}
            {creditHistory.length > 0 && (
                <>
                    <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">Credit/Debt History</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Description</th>
                                    <th className="px-6 py-4 font-medium">Original (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Paid (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Remaining (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Due Date</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {creditHistory.map((credit: any) => (
                                    <tr key={credit.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(credit.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 font-medium">
                                                {credit.notes || 'Credit Sale'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Invoice: {credit.invoice?.invoiceNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ؋{Math.floor(Number(credit.originalAmountAFN)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-medium">
                                            ؋{Math.floor(Number(credit.paidAmountAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            ؋{Math.floor(Number(credit.remainingBalanceAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(credit.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                credit.status === 'SETTLED' ? 'bg-green-100 text-green-700' :
                                                credit.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                credit.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {credit.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <h2 className="text-xl font-bold text-gray-800 mb-4">Transaction History</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">Invoice #</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Total (AFG)</th>
                            <th className="px-6 py-4 font-medium">Paid (AFG)</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {customer.invoices?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No transactions found</td>
                            </tr>
                        ) : (
                            customer.invoices?.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-blue-600 hover:text-blue-800 transition">
                                        <a href={`/dashboard/sales/${inv.id}`} className="hover:underline">
                                            {inv.invoiceNumber}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(inv.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        ؋{inv.totalLocal ? Number(inv.totalLocal).toFixed(0) : (Number(inv.total) * 70).toFixed(0)}
                                    </td>
                                    <td className="px-6 py-4 text-green-600">
                                        ؋{(Number(inv.paidAmount) * 70).toFixed(0)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                            inv.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
