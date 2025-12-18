'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Plus, Search, X } from 'lucide-react';
import api from '../../../lib/api';

interface Debt {
    id: number;
    customer: {
        id: number;
        name: string;
        displayId?: string;
        phone?: string;
    };
    invoice: {
        id: number;
        invoiceNumber: string;
        date: string;
    };
    originalAmount: number;
    originalAmountAFN: number;
    paidAmount: number;
    paidAmountAFN: number;
    remainingBalance: number;
    remainingBalanceAFN: number;
    dueDate: string;
    status: 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'SETTLED';
    notes?: string;
    createdAt: string;
    debtPayments: DebtPayment[];
}

interface DebtPayment {
    id: number;
    amount: number;
    amountAFN: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    paymentDate: string;
}

interface Summary {
    totalOutstanding: number;
    totalOutstandingAFN: number;
    totalDebtors: number;
    activeCount: number;
    dueSoonCount: number;
    overdueCount: number;
    totalDebts: number;
}

export default function DebtorsPage() {
    const [exchangeRate, setExchangeRate] = useState(70); // Default exchange rate
    const [debts, setDebts] = useState<Debt[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showLendingModal, setShowLendingModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Payment form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_PAY' | 'BANK_TRANSFER'>('CASH');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    
    // Lending form
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [lendAmount, setLendAmount] = useState('');
    const [lendDueDate, setLendDueDate] = useState('');
    const [lendNotes, setLendNotes] = useState('');
    const [lendLoading, setLendLoading] = useState(false);
    const [lendError, setLendError] = useState('');

    useEffect(() => {
        fetchData();
        fetchCustomers();
    }, [filter]);
    
    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [debtsRes, summaryRes] = await Promise.all([
                api.get('/debts', { params: filter !== 'all' ? { status: filter.toUpperCase() } : {} }),
                api.get('/debts/summary')
            ]);
            
            // Filter out settled debts unless specifically requested
            const filteredDebts = filter === 'settled' 
                ? debtsRes.data 
                : debtsRes.data.filter((d: Debt) => d.status !== 'SETTLED');
            
            setDebts(filteredDebts);
            setSummary(summaryRes.data);
        } catch (error: any) {
            console.error('Failed to fetch debts:', error);
            setError(error.response?.data?.message || 'Failed to load debts data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'DUE_SOON':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'OVERDUE':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'SETTLED':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle size={16} />;
            case 'DUE_SOON':
                return <Clock size={16} />;
            case 'OVERDUE':
                return <AlertTriangle size={16} />;
            case 'SETTLED':
                return <CheckCircle size={16} />;
            default:
                return <AlertCircle size={16} />;
        }
    };

    const getDaysUntilDue = (dueDate: string) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handlePayment = async () => {
        if (!selectedDebt || !paymentAmount) return;
        
        const amount = Number(paymentAmount);
        if (amount <= 0 || amount > selectedDebt.remainingBalance) {
            setPaymentError('Invalid payment amount');
            return;
        }

        setPaymentLoading(true);
        setPaymentError('');

        try {
            await api.post(`/debts/${selectedDebt.id}/payments`, {
                amount,
                paymentMethod,
                notes: paymentNotes
            });

            // Refresh data
            await fetchData();
            
            // Close modal and reset
            setShowPaymentModal(false);
            setSelectedDebt(null);
            setPaymentAmount('');
            setPaymentNotes('');
            setPaymentError('');
        } catch (error: any) {
            setPaymentError(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setPaymentLoading(false);
        }
    };
    
    const handleLending = async () => {
        if (!selectedCustomer || !lendAmount || !lendDueDate) {
            setLendError('Please fill in all required fields');
            return;
        }
        
        const amountAFN = Number(lendAmount);
        if (amountAFN <= 0) {
            setLendError('Invalid amount');
            return;
        }
        
        setLendLoading(true);
        setLendError('');
        
        try {
            const currentExchangeRate = exchangeRate || 70;
            const amountUSD = amountAFN / currentExchangeRate;
            
            await api.post('/debts/lend', {
                customerId: selectedCustomer.id,
                amount: amountUSD,
                amountAFN,
                dueDate: new Date(lendDueDate).toISOString(),
                notes: lendNotes || 'Cash Lending',
                exchangeRate: currentExchangeRate
            });
            
            // Refresh data
            await fetchData();
            
            // Close modal and reset
            setShowLendingModal(false);
            setSelectedCustomer(null);
            setCustomerSearch('');
            setLendAmount('');
            setLendDueDate('');
            setLendNotes('');
        } catch (error: any) {
            setLendError(error.response?.data?.message || 'Failed to create lending entry');
        } finally {
            setLendLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading debts...</div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                    <AlertCircle className="mx-auto text-red-500" size={48} />
                    <div className="text-red-600 font-medium">{error}</div>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    
    const filteredCustomers = customers.filter(c => 
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
        c.displayId?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Debt Management</h1>
                    <p className="text-gray-600 mt-1">Track and manage customer credit accounts</p>
                </div>
                <button
                    onClick={() => setShowLendingModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    <Plus size={20} />
                    Lend Money
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Outstanding</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    ؋{summary.totalOutstandingAFN.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    ${summary.totalOutstanding.toFixed(2)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Overdue</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{summary.overdueCount}</p>
                                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Due Soon</p>
                                <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.dueSoonCount}</p>
                                <p className="text-xs text-gray-500 mt-1">Within 24 hours</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <Clock className="text-yellow-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Debtors</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalDebtors}</p>
                                <p className="text-xs text-gray-500 mt-1">{summary.totalDebts} active debts</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="text-green-600" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1">
                {[
                    { key: 'all', label: 'All Active' },
                    { key: 'overdue', label: 'Overdue' },
                    { key: 'due_soon', label: 'Due Soon' },
                    { key: 'active', label: 'Active' },
                    { key: 'settled', label: 'Settled' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                            filter === key
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Debts Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {debts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No debts found</p>
                        <p className="text-sm mt-1">No debts match the current filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Customer</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Invoice</th>
                                    <th className="text-right p-4 font-semibold text-gray-700 text-sm">Original</th>
                                    <th className="text-right p-4 font-semibold text-gray-700 text-sm">Paid</th>
                                    <th className="text-right p-4 font-semibold text-gray-700 text-sm">Balance</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Due Date</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {debts.map((debt) => {
                                    const daysUntilDue = getDaysUntilDue(debt.dueDate);
                                    return (
                                        <tr key={debt.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{debt.customer.name}</p>
                                                    {debt.customer.displayId && (
                                                        <p className="text-xs text-gray-500 font-mono">{debt.customer.displayId}</p>
                                                    )}
                                                    {debt.customer.phone && (
                                                        <p className="text-xs text-gray-500">{debt.customer.phone}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-mono text-gray-900">{debt.invoice.invoiceNumber}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(debt.invoice.date).toLocaleDateString()}
                                                </p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-medium text-gray-900">؋{debt.originalAmountAFN.toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${debt.originalAmount.toFixed(2)}</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-medium text-green-600">؋{debt.paidAmountAFN.toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${debt.paidAmount.toFixed(2)}</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-bold text-gray-900">؋{debt.remainingBalanceAFN.toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${debt.remainingBalance.toFixed(2)}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-900">
                                                    {new Date(debt.dueDate).toLocaleDateString()}
                                                </p>
                                                <p className={`text-xs font-medium ${
                                                    daysUntilDue < 0 
                                                        ? 'text-red-600' 
                                                        : daysUntilDue <= 1 
                                                        ? 'text-yellow-600' 
                                                        : 'text-gray-500'
                                                }`}>
                                                    {daysUntilDue < 0 
                                                        ? `${Math.abs(daysUntilDue)} days overdue` 
                                                        : daysUntilDue === 0 
                                                        ? 'Due today' 
                                                        : `${daysUntilDue} days left`}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(debt.status)}`}>
                                                    {getStatusIcon(debt.status)}
                                                    {debt.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {debt.status !== 'SETTLED' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDebt(debt);
                                                            setShowPaymentModal(true);
                                                            setPaymentAmount(debt.remainingBalance.toFixed(2));
                                                        }}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                    >
                                                        Record Payment
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedDebt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">Record Payment</h3>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedDebt(null);
                                    setPaymentError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {paymentError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {paymentError}
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-600">Customer</p>
                            <p className="text-lg font-bold text-gray-900">{selectedDebt.customer.name}</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Remaining Balance:</span>
                                <span className="font-bold text-gray-900">
                                    ؋{selectedDebt.remainingBalanceAFN.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">USD:</span>
                                <span className="text-gray-700">${selectedDebt.remainingBalance.toFixed(2)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Amount (USD) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                max={selectedDebt.remainingBalance}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="MOBILE_PAY">Mobile Pay</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                            <textarea
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows={2}
                                placeholder="Payment notes..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedDebt(null);
                                    setPaymentError('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={paymentLoading || !paymentAmount}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {paymentLoading ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Lending Modal */}
            {showLendingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Lend Money to Customer</h3>
                        
                        {lendError && (
                            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                {lendError}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer <span className="text-red-500">*</span>
                                </label>
                                
                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between w-full px-4 py-2 border rounded-lg bg-blue-50 border-blue-200">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-blue-900">{selectedCustomer.name}</span>
                                            {selectedCustomer.displayId && <span className="text-xs font-mono text-blue-600">{selectedCustomer.displayId}</span>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setCustomerSearch('');
                                            }}
                                            className="text-blue-500 hover:text-blue-700 p-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                placeholder="Search customer..."
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        
                                        {customerSearch && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {filteredCustomers.length === 0 ? (
                                                    <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                                                ) : (
                                                    filteredCustomers.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(c);
                                                                setCustomerSearch('');
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                                                        >
                                                            <div className="font-bold text-gray-900">{c.name}</div>
                                                            {c.displayId && <div className="text-xs text-gray-500 font-mono">{c.displayId}</div>}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (AFN) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500">؋</span>
                                    <input
                                        type="number"
                                        value={lendAmount}
                                        onChange={(e) => setLendAmount(e.target.value)}
                                        className="w-full pl-7 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={lendDueDate}
                                    onChange={(e) => setLendDueDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    value={lendNotes}
                                    onChange={(e) => setLendNotes(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Purpose of lending..."
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowLendingModal(false);
                                        setSelectedCustomer(null);
                                        setCustomerSearch('');
                                        setLendAmount('');
                                        setLendDueDate('');
                                        setLendNotes('');
                                        setLendError('');
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLending}
                                    disabled={lendLoading || !selectedCustomer || !lendAmount || !lendDueDate}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {lendLoading ? 'Processing...' : 'Create Lending'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
