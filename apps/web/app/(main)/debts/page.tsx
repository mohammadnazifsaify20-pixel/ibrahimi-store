'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Plus, Search, X } from 'lucide-react';
import api from '../../../lib/api';
import { useSettingsStore } from '../../../lib/settingsStore';

// Version: 2024-12-18-v5 - Cache bypass timestamp: 20241218-235959
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
    const { exchangeRate = 70, fetchExchangeRate } = useSettingsStore();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showLendingModal, setShowLendingModal] = useState(false);
    const [showDueSoonAlert, setShowDueSoonAlert] = useState(false);
    const [dueSoonDebts, setDueSoonDebts] = useState<Debt[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    // Payment form
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_PAY' | 'BANK_TRANSFER'>('CASH');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    
    // Due date update state
    const [showDueDateModal, setShowDueDateModal] = useState(false);
    const [newDueDate, setNewDueDate] = useState('');
    const [dueDateLoading, setDueDateLoading] = useState(false);
    const [dueDateError, setDueDateError] = useState('');
    
    // Lending form
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [lendAmount, setLendAmount] = useState('');
    const [lendDueDate, setLendDueDate] = useState('');
    const [lendNotes, setLendNotes] = useState('');
    const [lendLoading, setLendLoading] = useState(false);
    const [lendError, setLendError] = useState('');
    
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
            
            // Check for due soon debts and show alert
            const dueSoon = debtsRes.data.filter((d: Debt) => d.status === 'DUE_SOON');
            if (dueSoon.length > 0) {
                setDueSoonDebts(dueSoon);
                setShowDueSoonAlert(true);
            }
        } catch (error: any) {
            console.error('Failed to fetch debts:', error);
            setError(error.response?.data?.message || 'Failed to load debts data');
        } finally {
            setLoading(false);
        }
    };

    const printDebtAgreement = (debt: Debt) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const agreementHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Debt Agreement - ${debt.customer.name}</title>
                <style>
                    @page { size: A4; margin: 1cm; }
                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
                    .header h1 { margin: 0; font-size: 24px; color: #1a1a1a; }
                    .header h2 { margin: 5px 0; font-size: 20px; color: #333; }
                    .section { margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; margin: 10px 0; }
                    .label { font-weight: bold; color: #333; }
                    .value { color: #000; }
                    .bilingual { display: flex; justify-content: space-between; margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
                    .english { flex: 1; padding-right: 20px; border-right: 2px solid #ddd; }
                    .dari { flex: 1; padding-left: 20px; text-align: right; direction: rtl; }
                    .amount-box { text-align: center; padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 5px; margin: 20px 0; }
                    .amount-box .amount { font-size: 32px; font-weight: bold; color: #d9534f; }
                    .terms { margin: 20px 0; padding: 15px; background: #f0f0f0; border-left: 4px solid #0066cc; }
                    .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
                    .signature-box { width: 45%; }
                    .signature-line { border-top: 2px solid #000; margin-top: 60px; padding-top: 5px; text-align: center; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>IBRAHIMI STORE</h1>
                    <h2>Debt Agreement / قرضه نامه</h2>
                </div>

                <div class="section">
                    <div class="row">
                        <div><span class="label">Agreement No:</span> <span class="value">${debt.invoice.invoiceNumber}</span></div>
                        <div><span class="label">تاریخ:</span> <span class="value">${new Date(debt.createdAt).toLocaleDateString('fa-AF')}</span></div>
                    </div>
                    <div class="row">
                        <div><span class="label">Date:</span> <span class="value">${new Date(debt.createdAt).toLocaleDateString()}</span></div>
                    </div>
                </div>

                <div class="bilingual">
                    <div class="english">
                        <h3>Borrower Information</h3>
                        <p><strong>Name:</strong> ${debt.customer.name}</p>
                        ${debt.customer.phone ? `<p><strong>Phone:</strong> ${debt.customer.phone}</p>` : ''}
                        ${debt.customer.displayId ? `<p><strong>ID:</strong> ${debt.customer.displayId}</p>` : ''}
                    </div>
                    <div class="dari">
                        <h3>معلومات قرض گیرنده</h3>
                        <p><strong>نام:</strong> ${debt.customer.name}</p>
                        ${debt.customer.phone ? `<p><strong>تلیفون:</strong> ${debt.customer.phone}</p>` : ''}
                        ${debt.customer.displayId ? `<p><strong>شناسنامه:</strong> ${debt.customer.displayId}</p>` : ''}
                    </div>
                </div>

                <div class="amount-box">
                    <div><strong>LOAN AMOUNT / مبلغ قرض</strong></div>
                    <div class="amount">؋ ${Math.floor(Number(debt.originalAmountAFN) || 0).toLocaleString()}</div>
                </div>

                <div class="bilingual terms">
                    <div class="english">
                        <h3>⚠️ TERMS AND CONDITIONS</h3>
                        <p><strong>1. DUE DATE:</strong> ${new Date(debt.dueDate).toLocaleDateString()}</p>
                        <p><strong>2. PAYMENT:</strong> The borrower agrees to repay the full amount on or before the due date.</p>
                        <p><strong>3. RESPONSIBILITY:</strong> ${debt.customer.name} is fully responsible for bringing the exact payment on the due date. <strong>NO DELAYS ACCEPTED.</strong></p>
                        <p><strong>4. CONSEQUENCES:</strong> Late payment may result in additional charges and restrictions.</p>
                        ${debt.notes ? `<p><strong>5. NOTES:</strong> ${debt.notes}</p>` : ''}
                    </div>
                    <div class="dari">
                        <h3>⚠️ شرایط و احکام</h3>
                        <p><strong>۱. تاریخ سررسید:</strong> ${new Date(debt.dueDate).toLocaleDateString('fa-AF')}</p>
                        <p><strong>۲. پرداخت:</strong> قرض گیرنده موافقه میکند که مبلغ کامل را در یا قبل از تاریخ سررسید پرداخت نماید.</p>
                        <p><strong>۳. مسئولیت:</strong> ${debt.customer.name} کاملاً مسئول است که مبلغ دقیق را در تاریخ سررسید بیاورد. <strong>هیچ تاخیر قابل قبول نیست.</strong></p>
                        <p><strong>۴. عواقب:</strong> دیر پرداخت ممکن منجر به اضافه چارج و محدودیت ها شود.</p>
                        ${debt.notes ? `<p><strong>۵. یادداشت:</strong> ${debt.notes}</p>` : ''}
                    </div>
                </div>

                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line">
                            <strong>Lender Signature / امضای قرض دهنده</strong><br>
                            <small>IBRAHIMI STORE</small>
                        </div>
                        <div style="text-align: center; margin-top: 10px;">
                            Date: ${new Date().toLocaleDateString()}
                        </div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">
                            <strong>Borrower Signature / امضای قرض گیرنده</strong><br>
                            <small>${debt.customer.name}</small>
                        </div>
                        <div style="text-align: center; margin-top: 10px;">
                            Date: ${new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p><strong>IMPORTANT NOTICE / اطلاعیه مهم:</strong></p>
                    <p>This is a legal agreement. The borrower must return the full amount on the exact due date.<br>
                    این یک قرارداد قانونی است. قرض گیرنده باید مبلغ کامل را در تاریخ سررسید دقیق برگرداند.</p>
                </div>

                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="padding: 10px 30px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print Agreement</button>
                    <button onclick="window.close()" style="padding: 10px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">Close</button>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(agreementHTML);
        printWindow.document.close();
    };

    useEffect(() => {
        fetchData();
    }, [filter]);
    
    useEffect(() => {
        fetchCustomers();
        fetchExchangeRate().catch(err => {
            console.error('Failed to fetch exchange rate, using default:', err);
        });
    }, []);
    

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'DUE_SOON':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'OVERDUE':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'SETTLED':
                return 'bg-blue-100 text-blue-800 border-blue-200';
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
        
        const amountAFN = Number(paymentAmount);
        if (amountAFN <= 0 || amountAFN > selectedDebt.remainingBalanceAFN) {
            setPaymentError('Invalid payment amount');
            return;
        }

        setPaymentLoading(true);
        setPaymentError('');

        try {
            // Calculate USD amount from AFN
            const amount = amountAFN / (exchangeRate || 70);
            
            await api.post(`/debts/${selectedDebt.id}/payments`, {
                amount,
                amountAFN,
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
    
    const handleUpdateDueDate = async () => {
        if (!selectedDebt || !newDueDate) {
            setDueDateError('Please select a new due date');
            return;
        }

        setDueDateLoading(true);
        setDueDateError('');

        try {
            await api.patch(`/debts/${selectedDebt.id}`, {
                dueDate: new Date(newDueDate).toISOString()
            });

            // Refresh data
            await fetchData();
            
            // Close modal and reset
            setShowDueDateModal(false);
            setSelectedDebt(null);
            setNewDueDate('');
            setDueDateError('');
        } catch (error: any) {
            setDueDateError(error.response?.data?.message || 'Failed to update due date');
        } finally {
            setDueDateLoading(false);
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
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowPaymentModal(true);
                            setSelectedDebt(null);
                            setSelectedCustomer(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                        <DollarSign size={20} />
                        Receive Payment
                    </button>
                    <button
                        onClick={() => setShowLendingModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus size={20} />
                        Lend Money
                    </button>
                </div>
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
                    { key: 'settled', label: 'Paid' }
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
                                                <p className="font-medium text-gray-900">؋{(Number(debt.originalAmountAFN) || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${(Number(debt.originalAmount) || 0).toFixed(2)}</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-medium text-green-600">؋{(Number(debt.paidAmountAFN) || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${(Number(debt.paidAmount) || 0).toFixed(2)}</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-bold text-gray-900">؋{(Number(debt.remainingBalanceAFN) || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">${(Number(debt.remainingBalance) || 0).toFixed(2)}</p>
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
                                                    {debt.status === 'SETTLED' ? 'PAID' : debt.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {debt.status !== 'SETTLED' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedDebt(debt);
                                                                    const currentDate = debt.dueDate 
                                                                        ? new Date(debt.dueDate).toISOString().split('T')[0]
                                                                        : new Date().toISOString().split('T')[0];
                                                                    setNewDueDate(currentDate || '');
                                                                    setShowDueDateModal(true);
                                                                }}
                                                                className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                                                            >
                                                                Update Date
                                                            </button>
                                                            <button
                                                                onClick={() => printDebtAgreement(debt)}
                                                                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                                                title="Print Debt Agreement"
                                                            >
                                                                📄 Agreement
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">Receive Payment</h3>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedDebt(null);
                                    setSelectedCustomer(null);
                                    setCustomerSearch('');
                                    setPaymentError('');
                                    setPaymentAmount('');
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

                        {!selectedCustomer ? (
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Customer
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        placeholder="Search by name or ID..."
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                
                                {customerSearch && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                                        ) : (
                                            filteredCustomers.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setCustomerSearch('');
                                                        // Check if customer has unpaid debts
                                                        const customerDebts = debts?.filter(d => 
                                                            d.customer.id === c.id && d.status !== 'SETTLED'
                                                        ) || [];
                                                        if (customerDebts.length === 1 && customerDebts[0]) {
                                                            setSelectedDebt(customerDebts[0]);
                                                            setPaymentAmount(Math.floor(Number(customerDebts[0].remainingBalanceAFN) || 0).toString());
                                                        }
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                                                >
                                                    <div className="font-bold text-gray-900">{c.name}</div>
                                                    {c.displayId && <div className="text-xs text-gray-500 font-mono">{c.displayId}</div>}
                                                    {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : !selectedDebt ? (
                            <div>
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-4">
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
                                        {selectedCustomer.displayId && <p className="text-xs font-mono text-gray-600">{selectedCustomer.displayId}</p>}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setCustomerSearch('');
                                        }}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Debt to Pay
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {debts?.filter(d => d.customer.id === selectedCustomer.id && d.status !== 'SETTLED').length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
                                            <p>No unpaid debts for this customer</p>
                                        </div>
                                    ) : (
                                        debts
                                            ?.filter(d => d.customer.id === selectedCustomer.id && d.status !== 'SETTLED')
                                            .map(debt => (
                                                <button
                                                    key={debt.id}
                                                    onClick={() => {
                                                        setSelectedDebt(debt);
                                                        setPaymentAmount(Math.floor(Number(debt.remainingBalanceAFN) || 0).toString());
                                                    }}
                                                    className="w-full text-left p-3 border-2 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                >
                                                    <p className="text-sm font-mono text-gray-600">{debt.invoice.invoiceNumber}</p>
                                                    <p className="text-xs text-gray-500">Due: {new Date(debt.dueDate).toLocaleDateString()}</p>
                                                    <p className="text-lg font-bold text-red-600 mt-1">
                                                        ؋{(Number(debt.remainingBalanceAFN) || 0).toLocaleString()}
                                                    </p>
                                                </button>
                                            ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-600">Customer</p>
                                        <p className="text-xl font-bold text-gray-900">{selectedDebt.customer.name}</p>
                                        <p className="text-sm text-gray-600 font-mono mt-1">{selectedDebt.invoice.invoiceNumber}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedDebt(null);
                                            setPaymentAmount('');
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        ← Back
                                    </button>
                                </div>

                                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Total Remaining Balance:</span>
                                        <span className="text-3xl font-bold text-red-600">
                                            ؋{selectedDebt.remainingBalanceAFN.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        USD: ${selectedDebt.remainingBalance.toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Amount (AFN) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-500 font-bold text-lg">؋</span>
                                        <input
                                            type="number"
                                            step="1"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            max={selectedDebt.remainingBalanceAFN}
                                            className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">
                                        USD Equivalent: ${(Number(paymentAmount) / (exchangeRate || 70)).toFixed(2)}
                                    </p>
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
                                            setPaymentAmount('');
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentLoading || !paymentAmount}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {paymentLoading ? 'Processing...' : '✓ Receive Payment'}
                                    </button>
                                </div>
                            </>
                        )}
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

            {/* Update Due Date Modal */}
            {showDueDateModal && selectedDebt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">Update Due Date</h3>
                            <button
                                onClick={() => {
                                    setShowDueDateModal(false);
                                    setSelectedDebt(null);
                                    setNewDueDate('');
                                    setDueDateError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {dueDateError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {dueDateError}
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-600 mb-2">Customer: <span className="font-medium text-gray-900">{selectedDebt.customer.name}</span></p>
                            <p className="text-sm text-gray-600 mb-4">Balance: <span className="font-bold text-red-600">؋{(Number(selectedDebt.remainingBalanceAFN) || 0).toLocaleString()}</span></p>
                            
                            <p className="text-sm text-gray-600 mb-2">Current Due Date: <span className="font-medium text-gray-900">{new Date(selectedDebt.dueDate).toLocaleDateString()}</span></p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Due Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowDueDateModal(false);
                                    setSelectedDebt(null);
                                    setNewDueDate('');
                                    setDueDateError('');
                                }}
                                disabled={dueDateLoading}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateDueDate}
                                disabled={dueDateLoading || !newDueDate}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {dueDateLoading ? 'Updating...' : 'Update Date'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Due Soon Alert Modal - Dari */}
            {showDueSoonAlert && dueSoonDebts.length > 0 && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="text-yellow-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">⚠️ هشدار! تاریخ سررسید نزدیک است</h3>
                                    <p className="text-sm text-gray-600">Due Date Alert - Payment Required Soon</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDueSoonAlert(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                            <p className="text-center text-lg font-bold text-yellow-900 mb-2" style={{ direction: 'rtl' }}>
                                🔔 مشتریان ذیل باید امروز یا فردا پرداخت نمایند
                            </p>
                            <p className="text-center text-sm text-yellow-800">
                                The following customers must pay today or tomorrow
                            </p>
                        </div>

                        <div className="max-h-96 overflow-y-auto space-y-3">
                            {dueSoonDebts.map((debt) => (
                                <div key={debt.id} className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1" style={{ direction: 'rtl', textAlign: 'right' }}>
                                            <p className="text-lg font-bold text-gray-900 mb-1">
                                                📌 مشتری: {debt.customer.name}
                                            </p>
                                            <p className="text-xl font-bold text-red-600 mb-2">
                                                💰 مبلغ: ؋{Math.floor(Number(debt.remainingBalanceAFN) || 0).toLocaleString()}
                                            </p>
                                            <p className="text-sm text-gray-700 mb-1">
                                                📅 تاریخ سررسید: {new Date(debt.dueDate).toLocaleDateString('fa-AF')}
                                            </p>
                                            <div className="mt-3 p-3 bg-white rounded border-r-4 border-red-500">
                                                <p className="text-sm font-bold text-red-900">
                                                    ⚠️ پیام مهم: {debt.customer.name} باید در تاریخ سررسید پرداخت نماید. حتماً پول را دریافت نمایید!
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Customer {debt.customer.name} needs to pay on due date. Make sure you receive the payment!
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                                <Clock className="text-red-600" size={32} />
                                            </div>
                                            <p className="text-xs font-bold text-red-600">
                                                {getDaysUntilDue(debt.dueDate) === 0 ? 'امروز' : 'فردا'}
                                            </p>
                                        </div>
                                    </div>
                                    {debt.customer.phone && (
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <p className="text-sm text-gray-600">
                                                📞 تماس: <a href={`tel:${debt.customer.phone}`} className="font-bold text-blue-600 hover:underline">{debt.customer.phone}</a>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={() => setShowDueSoonAlert(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                بستن / Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowDueSoonAlert(false);
                                    setFilter('due_soon');
                                }}
                                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-bold hover:bg-yellow-700 transition-colors"
                            >
                                نمایش همه / View All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
