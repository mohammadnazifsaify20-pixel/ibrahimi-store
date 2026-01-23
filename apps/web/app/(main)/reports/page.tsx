'use client';

import { useEffect, useState, useRef } from 'react';
import api from '../../../lib/api';
import { DollarSign, FileText, AlertTriangle, CreditCard, TrendingUp, Printer, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useReactToPrint } from 'react-to-print';

const EXCHANGE_RATE = 70; // Hardcoded exchange rate for consistency

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'yearly'>('overview');

    // Overview Stats
    const [stats, setStats] = useState({
        salesToday: 0,
        invoicesToday: 0,
        lowStockItems: 0,
        totalOutstandingCredit: 0,
        debtors: [] as any[]
    });
    const [loading, setLoading] = useState(true);

    // Report Stats
    const [reportData, setReportData] = useState<any>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Mock data for charts (Backend API extension needed for timeline data)
    const salesData = [
        { name: 'Mon', sales: 4000 },
        { name: 'Tue', sales: 3000 },
        { name: 'Wed', sales: 2000 },
        { name: 'Thu', sales: 2780 },
        { name: 'Fri', sales: 1890 },
        { name: 'Sat', sales: 2390 },
        { name: 'Sun', sales: 3490 },
    ];

    // Valuation Data
    const [valuationData, setValuationData] = useState<any>(null);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reportRes, customersRes, valuationRes] = await Promise.all([
                    api.get('/reports/dashboard'),
                    api.get('/customers'),
                    api.get('/reports/inventory-valuation')
                ]);

                const debtors = customersRes.data.filter((c: any) => Number(c.outstandingBalance) > 0);

                setStats({
                    ...reportRes.data,
                    debtors
                });

                setValuationData(valuationRes.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const fetchPeriodReport = async () => {
        setReportLoading(true);
        try {
            const params: any = {
                type: activeTab,
                year: selectedYear
            };
            if (activeTab === 'monthly') {
                params.month = selectedMonth;
            }

            const res = await api.get('/reports/period', { params });
            setReportData(res.data);
        } catch (error) {
            console.error('Failed to fetch report:', error);
            alert('Failed to generate report');
        } finally {
            setReportLoading(false);
        }
    };

    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        // @ts-ignore
        content: () => componentRef.current,
        documentTitle: `Financial Report - ${reportData?.periodLabel || 'Report'}`,
    });

    const statCards = [
        { title: 'Total Revenue Today', value: `؋${Math.round(Number(stats.salesToday)).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Invoices Generated', value: stats.invoicesToday, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Pending Credits', value: `؋${Math.round(Number(stats.totalOutstandingCredit)).toLocaleString()}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Low Stock Alerts', value: stats.lowStockItems, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
        { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
        { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    const years = [2023, 2024, 2025, 2026];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Monthly Report
                    </button>
                    <button
                        onClick={() => setActiveTab('yearly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Yearly Report
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((card, idx) => {
                            const Icon = card.icon;
                            return (
                                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                            <p className="text-2xl font-bold mt-1 text-gray-900">
                                                {loading ? '...' : card.value}
                                            </p>
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
                        <div className="bg-white p-6 rounded-xl shadow-sm border h-[400px]">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                {/* @ts-ignore */}
                                <TrendingUp size={20} />
                                Sales Overview (Weekly)
                            </h2>
                            {/* @ts-ignore */}
                            <ResponsiveContainer width="100%" height="85%">
                                {/* @ts-ignore */}
                                <AreaChart data={salesData}>
                                    {/* @ts-ignore */}
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    {/* @ts-ignore */}
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    {/* @ts-ignore */}
                                    <YAxis axisLine={false} tickLine={false} prefix="$" />
                                    {/* @ts-ignore */}
                                    <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                                    {/* @ts-ignore */}
                                    <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border h-[400px]">
                            <h2 className="text-lg font-semibold mb-6">Inventory Value Distribution</h2>
                            <div className="flex h-full items-center justify-center text-gray-500">
                                {valuationData?.distribution ? (
                                    // @ts-ignore
                                    <ResponsiveContainer width="100%" height="90%">
                                        {/* @ts-ignore */}
                                        <PieChart>
                                            {/* @ts-ignore */}
                                            <Pie
                                                data={valuationData.distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {valuationData.distribution.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            {/* @ts-ignore */}
                                            <Tooltip formatter={(value: number) => `؋${(value * EXCHANGE_RATE).toLocaleString()}`} />
                                            {/* @ts-ignore */}
                                            <Legend />
                                        </PieChart>
                                        {/* @ts-ignore */}
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center">Loading Data...</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {/* @ts-ignore */}
                                <AlertTriangle className="text-red-500" size={20} />
                                Outstanding Balances
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Outstanding Balance</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loading ? (
                                        <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                                    ) : stats.debtors && stats.debtors.length > 0 ? (
                                        stats.debtors.map((debtor: any) => (
                                            <tr key={debtor.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900">{debtor.name}</td>
                                                <td className="px-6 py-4 text-gray-600">{debtor.phone || '-'}</td>
                                                <td className="px-6 py-4 font-bold text-red-600">
                                                    ؋{debtor.outstandingBalanceAFN 
                                                        ? Math.round(Number(debtor.outstandingBalanceAFN)).toLocaleString() 
                                                        : Math.round(Number(debtor.outstandingBalance) * EXCHANGE_RATE).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <a href={`/customers/${debtor.id}`} className="text-blue-600 hover:underline">View</a>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No customers with outstanding debt.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-wrap items-end gap-4">
                        {activeTab === 'monthly' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="w-40 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-32 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchPeriodReport}
                            disabled={reportLoading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {reportLoading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>

                    {reportData && (
                        <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto">
                            <div className="flex justify-end mb-4">
                                <button onClick={handlePrint} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                                    {/* @ts-ignore */}
                                    <Printer size={20} />
                                    Print Report
                                </button>
                            </div>

                            <div ref={componentRef} className="p-8 bg-white" style={{ minHeight: '800px' }}>
                                {/* Invoice-style Header */}
                                <div className="border-b-2 border-gray-800 pb-6 mb-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-bold text-gray-900">IBRAHIMI STORE</h1>
                                            <p className="text-gray-500 mt-1">Financial Statement</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                                                {activeTab === 'monthly' ? 'Monthly Report' : 'Yearly Report'}
                                            </p>
                                            <p className="text-gray-600 mt-1">{reportData.periodLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Table */}
                                <table className="w-full mb-8">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 font-semibold text-gray-600">Description</th>
                                            <th className="text-right py-3 font-semibold text-gray-600">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="py-4 text-gray-900">Total Sales Revenue</td>
                                            <td className="py-4 text-right font-medium text-gray-900">
                                                ؋{(reportData.totalSales * EXCHANGE_RATE).toFixed(0)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 text-gray-900">Cost of Goods Sold (COGS)</td>
                                            <td className="py-4 text-right font-medium text-red-600">
                                                - ؋{(reportData.totalCOGS * EXCHANGE_RATE).toFixed(0)}
                                            </td>
                                        </tr>
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="py-4 px-4 text-gray-900">Gross Profit</td>
                                            <td className="py-4 px-4 text-right text-green-700 text-lg">
                                                ؋{(reportData.grossProfit * EXCHANGE_RATE).toFixed(0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
                                        <p className="text-2xl font-bold text-gray-900">{reportData.totalInvoices}</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="text-sm font-medium text-gray-500 mb-1">Profit Margin</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {reportData.totalSales > 0
                                                ? ((reportData.grossProfit / reportData.totalSales) * 100).toFixed(1)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {!reportData && !loading && (
                        <div className="text-center py-12 bg-white rounded-xl border shadow-sm text-gray-500">
                            {/* @ts-ignore */}
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Select a period and click "Generate Report" to view totals.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
