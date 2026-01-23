'use client';

import { useEffect, useState, useRef } from 'react';
import api from '../../../lib/api';
import { DollarSign, FileText, AlertTriangle, CreditCard, Printer } from 'lucide-react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        salesToday: 0,
        invoicesToday: 0,
        lowStockItems: 0,
        totalOutstandingCredit: 0,
        lowStockList: [] as any[]
    });
    
    const [debtSummary, setDebtSummary] = useState<any>(null);

    useEffect(() => {
        // Mock data for initial loading or fetch from API
        api.get('/reports/dashboard')
            .then(res => setStats(res.data))
            .catch(err => console.error(err));
            
        // Fetch debt summary
        api.get('/debts/summary')
            .then(res => setDebtSummary(res.data))
            .catch(err => console.error('Failed to fetch debt summary:', err));
    }, []);

    const EXCHANGE_RATE = 70;

    const handlePrintLowStock = () => {
        window.print();
    };

    const statCards = [
        { title: 'Sales Today', value: `؋${Math.round(Number(stats.salesToday)).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Invoices Today', value: stats.invoicesToday, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Low Stock Items', value: stats.lowStockItems, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
        { title: 'Customer Credit', value: `؋${Math.round(Number(stats.totalOutstandingCredit)).toLocaleString()}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                    <p className="text-2xl font-bold mt-1 text-gray-900">{card.value}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${card.bg}`}>
                                    {/* @ts-ignore */}
                                    <Icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Debt Summary Widget */}
                {debtSummary && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {/* @ts-ignore */}
                                <CreditCard className="text-blue-500" size={20} />
                                Debt Management Overview
                            </h2>
                            <Link
                                href="/debts"
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-600 font-medium">Total Outstanding</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">
                                    ؋{debtSummary.totalOutstandingAFN.toLocaleString()}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    ${debtSummary.totalOutstanding.toFixed(2)} USD
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                    <p className="text-xs text-red-600 font-medium">Overdue</p>
                                    <p className="text-xl font-bold text-red-700 mt-1">
                                        {debtSummary.overdueCount}
                                    </p>
                                </div>

                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    <p className="text-xs text-yellow-600 font-medium">Due Soon</p>
                                    <p className="text-xl font-bold text-yellow-700 mt-1">
                                        {debtSummary.dueSoonCount}
                                    </p>
                                </div>

                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p className="text-xs text-green-600 font-medium">Active</p>
                                    <p className="text-xl font-bold text-green-700 mt-1">
                                        {debtSummary.activeCount}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 border-t">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Debtors:</span>
                                    <span className="font-bold text-gray-900">{debtSummary.totalDebtors}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-600">Active Debts:</span>
                                    <span className="font-bold text-gray-900">{debtSummary.totalDebts}</span>
                                </div>
                            </div>

                            {(debtSummary.overdueCount > 0 || debtSummary.dueSoonCount > 0) && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                    <div className="flex items-start gap-2">
                                        {/* @ts-ignore */}
                                        <AlertTriangle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-orange-900">Action Required</p>
                                            <p className="text-xs text-orange-700 mt-1">
                                                {debtSummary.overdueCount > 0 
                                                    ? `${debtSummary.overdueCount} overdue payment${debtSummary.overdueCount > 1 ? 's' : ''} need${debtSummary.overdueCount === 1 ? 's' : ''} immediate attention`
                                                    : `${debtSummary.dueSoonCount} payment${debtSummary.dueSoonCount > 1 ? 's' : ''} due within 24 hours`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-xl shadow-sm border min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            {/* @ts-ignore */}
                            <AlertTriangle className="text-orange-500" size={20} />
                            Low Stock Alerts
                        </h2>
                        {stats.lowStockList && stats.lowStockList.length > 0 && (
                            <button
                                onClick={handlePrintLowStock}
                                className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
                                title="Print Low Stock List"
                            >
                                {/* @ts-ignore */}
                                <Printer size={18} />
                            </button>
                        )}
                    </div>

                    {/* Printable Container */}
                    <div id="low-stock-print-section" className="p-4 print:p-0">
                        {/* Only show header when printing - Using inline style for safety in print iframe */}
                        <div className="hidden print:block mb-6">
                            <h1 className="text-xl font-bold text-gray-900">Low Stock Report</h1>
                            <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
                        </div>

                        {stats.lowStockList && stats.lowStockList.length > 0 ? (
                            <div className="overflow-x-auto print:overflow-visible">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-orange-50 text-orange-800 font-medium print:bg-gray-100 print:text-black">
                                        <tr>
                                            <th className="px-3 py-2 rounded-l-md border-b print:border-gray-300">Product</th>
                                            <th className="px-3 py-2 text-right rounded-r-md border-b print:border-gray-300">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y print:divide-gray-300">
                                        {stats.lowStockList.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-gray-50 print:bg-white">
                                                <td className="px-3 py-2 font-medium text-gray-900 border-b print:border-gray-200">
                                                    <div className="flex flex-col">
                                                        <span>{item.name}</span>
                                                        <span className="text-xs text-gray-500">{item.sku}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-red-600 border-b print:border-gray-200">{item.quantityOnHand}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-green-600 text-center py-10 bg-green-50 rounded-lg print:border print:border-green-200">
                                All stock levels are healthy!
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border min-h-[300px]">
                    <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/pos" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block">New Sale</Link>
                        <Link href="/inventory" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block">Add Product</Link>
                        <Link href="/customers" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block">Add Customer</Link>
                        <Link href="/expenses" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block">Expenses</Link>
                        <Link href="/debts" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block text-purple-600 bg-purple-50">Manage Debts</Link>
                        <Link href="/sales" className="p-4 border rounded-lg hover:bg-gray-50 text-left font-medium block text-blue-600 bg-blue-50">Sales History</Link>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 20mm; }
                    body {
                        visibility: hidden;
                    }
                    #low-stock-print-section {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        z-index: 9999;
                    }
                    #low-stock-print-section * {
                        visibility: visible;
                    }
                    .print\\:block { display: block !important; }
                }
            `}</style>
        </div>
    );
}
