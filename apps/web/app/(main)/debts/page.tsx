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
    const [lastPayment, setLastPayment] = useState<any>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    
    // Due date update state
    const [showDueDateModal, setShowDueDateModal] = useState(false);
    const [newDueDate, setNewDueDate] = useState('');
    const [dueDateLoading, setDueDateLoading] = useState(false);
    const [dueDateError, setDueDateError] = useState('');
    
    // Delete debt state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    
    // History modal state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState<any>(null);
    const [customerHistory, setCustomerHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    
    // Invoices modal state
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [lendingInvoices, setLendingInvoices] = useState<any[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showInvoiceDeleteModal, setShowInvoiceDeleteModal] = useState(false);
    const [invoiceDeletePassword, setInvoiceDeletePassword] = useState('');
    const [invoiceDeleteLoading, setInvoiceDeleteLoading] = useState(false);
    const [invoiceDeleteError, setInvoiceDeleteError] = useState('');
    
    // Lending form
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [lendAmount, setLendAmount] = useState('');
    const [lendDueDate, setLendDueDate] = useState('');
    const [lendNotes, setLendNotes] = useState('');
    const [lendLoading, setLendLoading] = useState(false);
    const [lendError, setLendError] = useState('');
    
    // Shop balance management
    const [shopBalance, setShopBalance] = useState<number>(0);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [newBalance, setNewBalance] = useState('');
    const [balanceDescription, setBalanceDescription] = useState('');
    const [balanceError, setBalanceError] = useState('');
    const [balanceLoading, setBalanceLoading] = useState(false);
    
    // Customer deposits state
    const [deposits, setDeposits] = useState<any[]>([]);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showDepositsListModal, setShowDepositsListModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositNotes, setDepositNotes] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);
    const [depositError, setDepositError] = useState('');
    const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawNotes, setWithdrawNotes] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');
    const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
    const [depositConfirmPassword, setDepositConfirmPassword] = useState('');
    const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] = useState(false);
    const [withdrawConfirmPassword, setWithdrawConfirmPassword] = useState('');
    const [depositSearchQuery, setDepositSearchQuery] = useState('');
    const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false);
    
    const fetchShopBalance = async () => {
        try {
            const response = await api.get('/settings/shop-balance');
            setShopBalance(response.data.balance || 0);
        } catch (error) {
            // Balance not set yet or error, default to 0
            setShopBalance(0);
        }
    };
    
    const handleUpdateBalance = async () => {
        if (!adminPassword || !newBalance) {
            setBalanceError('Please enter admin password and balance amount');
            return;
        }
        
        const balanceAmount = Number(newBalance);
        if (balanceAmount < 0) {
            setBalanceError('Balance cannot be negative');
            return;
        }
        
        setBalanceLoading(true);
        setBalanceError('');
        
        try {
            await api.post('/settings/shop-balance', { balance: balanceAmount, password: adminPassword });
            setShopBalance(balanceAmount);
            setShowBalanceModal(false);
            setAdminPassword('');
            setNewBalance('');
            setBalanceError('');
            alert('Shop balance updated successfully!');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to update balance';
            setBalanceError(errorMessage);
            // Don't clear password field so user can retry
        } finally {
            setBalanceLoading(false);
        }
    };
    
    const fetchDeposits = async () => {
        try {
            const res = await api.get('/deposits');
            setDeposits(res.data);
        } catch (error) {
            console.error('Failed to fetch deposits:', error);
        }
    };
    
    const handleDepositClick = () => {
        if (!selectedCustomer || !depositAmount) {
            setDepositError('Please select customer and enter amount');
            return;
        }
        
        const amountAFN = Number(depositAmount);
        if (amountAFN <= 0) {
            setDepositError('Invalid amount');
            return;
        }
        
        // Show confirmation modal
        setShowDepositConfirmModal(true);
    };
    
    const handleCreateDeposit = async () => {
        if (!depositConfirmPassword) {
            setDepositError('Please enter your password');
            return;
        }
        
        setDepositLoading(true);
        setDepositError('');
        
        const amountAFN = Number(depositAmount);
        
        try {
            await api.post('/deposits', {
                customerId: selectedCustomer.id,
                amountAFN,
                notes: depositNotes || 'Customer deposit for safekeeping',
                password: depositConfirmPassword
            });
            
            // Print receipt
            printDepositReceipt({
                depositNumber: 'DEP-XXXX', // Will be generated by backend
                customerName: selectedCustomer.name,
                customerId: selectedCustomer.displayId,
                amount: amountAFN,
                depositDate: new Date(),
                notes: depositNotes
            });
            
            // Refresh data
            await Promise.all([fetchDeposits(), fetchShopBalance()]);
            
            // Close modals and reset
            setShowDepositConfirmModal(false);
            setShowDepositModal(false);
            setSelectedCustomer(null);
            setCustomerSearch('');
            setDepositAmount('');
            setDepositNotes('');
            setDepositConfirmPassword('');
        } catch (error: any) {
            setDepositError(error.response?.data?.message || 'Failed to create deposit');
        } finally {
            setDepositLoading(false);
        }
    };
    
    const handleWithdrawClick = () => {
        if (!selectedDeposit || !withdrawAmount) {
            setWithdrawError('Please enter withdrawal amount');
            return;
        }
        
        const amountAFN = Number(withdrawAmount);
        if (amountAFN <= 0) {
            setWithdrawError('Invalid amount');
            return;
        }
        
        if (amountAFN > Number(selectedDeposit.remainingAmountAFN)) {
            setWithdrawError(`Cannot withdraw more than remaining balance: ؋${Number(selectedDeposit.remainingAmountAFN).toLocaleString()}`);
            return;
        }
        
        // Show confirmation modal
        setShowWithdrawConfirmModal(true);
    };
    
    const handleWithdraw = async () => {
        if (!withdrawConfirmPassword) {
            setWithdrawError('Please enter your password');
            return;
        }
        
        setWithdrawLoading(true);
        setWithdrawError('');
        
        const amountAFN = Number(withdrawAmount);
        
        try {
            const result = await api.post(`/deposits/${selectedDeposit.id}/withdraw`, {
                amountAFN,
                notes: withdrawNotes,
                password: withdrawConfirmPassword
            });
            
            // Print withdrawal receipt
            const newTotalWithdrawn = Number(selectedDeposit.withdrawnAmountAFN) + amountAFN;
            const newRemainingBalance = Number(selectedDeposit.remainingAmountAFN) - amountAFN;
            const newStatus = newRemainingBalance === 0 ? 'WITHDRAWN' : 
                             newRemainingBalance < Number(selectedDeposit.originalAmountAFN) ? 'PARTIAL' : 'ACTIVE';
            
            printWithdrawalReceipt({
                depositNumber: selectedDeposit.depositNumber,
                customerName: selectedDeposit.customer.name,
                customerId: selectedDeposit.customer.displayId,
                withdrawnAmount: amountAFN,
                originalAmount: selectedDeposit.originalAmountAFN,
                totalWithdrawn: newTotalWithdrawn,
                remainingBalance: newRemainingBalance,
                status: newStatus,
                notes: withdrawNotes
            });
            
            // Refresh data
            await Promise.all([fetchDeposits(), fetchShopBalance()]);
            
            // Close modals and reset
            setShowWithdrawConfirmModal(false);
            setShowWithdrawModal(false);
            setSelectedDeposit(null);
            setWithdrawAmount('');
            setWithdrawNotes('');
            setWithdrawConfirmPassword('');
        } catch (error: any) {
            setWithdrawError(error.response?.data?.message || 'Failed to process withdrawal');
        } finally {
            setWithdrawLoading(false);
        }
    };
    
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
                        body { padding: 0; transform: scale(0.74); transform-origin: top left; width: 135%; }
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

                <div class="footer" style="background: #fff3cd; border: 2px solid #ff9800; padding: 15px; border-radius: 5px;">
                    <p style="color: #d84315; font-weight: bold; font-size: 14px; margin: 5px 0;">⚠️ IMPORTANT NOTICE / اطلاعیه مهم ⚠️</p>
                    <p style="color: #e65100; font-weight: bold; font-size: 13px; line-height: 1.8;">This is a legal agreement. The borrower must return the full amount on the exact due date.<br>
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
        fetchShopBalance();
        fetchDeposits();
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

    const printPaymentReceipt = (paymentData: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Payment Receipt</title>
                <style>
                    @page { size: 80mm 200mm; margin: 5mm; }
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 12px; }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .section { margin: 10px 0; }
                    .row { display: flex; justify-content: space-between; margin: 5px 0; }
                    .label { font-weight: bold; }
                    .amount { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0; padding: 10px; border: 2px solid #000; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>IBRAHIMI STORE</h1>
                    <p>PAYMENT RECEIPT / رسید پرداخت</p>
                    <p>Date / تاریخ: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Customer / مشتری:</span>
                        <span>${paymentData.customerName}</span>
                    </div>
                    ${paymentData.customerId ? `
                    <div class="row">
                        <span class="label">Customer ID / شناسنامه:</span>
                        <span>${paymentData.customerId}</span>
                    </div>
                    ` : ''}
                    <div class="row">
                        <span class="label">Invoice / فاکتور:</span>
                        <span>${paymentData.invoiceNumber}</span>
                    </div>
                </div>
                
                <div class="amount">
                    PAID / پرداخت شده: ؋${paymentData.paidAmount.toLocaleString()}
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Payment Method / روش پرداخت:</span>
                        <span>${paymentData.paymentMethod}</span>
                    </div>
                    <div class="row">
                        <span class="label">Original Debt / قرض اصلی:</span>
                        <span>؋${paymentData.originalAmount.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Total Paid / مجموع پرداخت:</span>
                        <span>؋${paymentData.totalPaid.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Remaining / باقیمانده:</span>
                        <span>؋${paymentData.remaining.toLocaleString()}</span>
                    </div>
                    ${paymentData.notes ? `
                    <div class="row">
                        <span class="label">Notes / یادداشت:</span>
                        <span>${paymentData.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>Thank you for your payment! / از پرداخت شما متشکریم</p>
                    <p>This is a computer generated receipt / این رسید کمپیوتری است</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const printDepositReceipt = (depositData: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Deposit Receipt | رسید امانت</title>
                <style>
                    @page { size: 80mm auto; margin: 5mm; }
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 11px; }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .bilingual { margin: 10px 0; padding: 8px; background: #f9f9f9; border-radius: 5px; }
                    .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
                    .row-dari { direction: rtl; text-align: right; }
                    .label { font-weight: bold; }
                    .amount { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; padding: 12px; border: 2px solid #000; background: #e8f5e9; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; }
                    .footer-dari { direction: rtl; font-size: 10px; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>IBRAHIMI STORE</h1>
                    <p>💰 DEPOSIT RECEIPT | رسید امانت 💰</p>
                    <p>Date | تاریخ: ${new Date(depositData.depositDate || new Date()).toLocaleDateString()}</p>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Deposit Number:</span>
                        <span>${depositData.depositNumber}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${depositData.depositNumber}</span>
                        <span class="label">:نمبر امانت</span>
                    </div>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Customer:</span>
                        <span>${depositData.customerName}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${depositData.customerName}</span>
                        <span class="label">:مشتری</span>
                    </div>
                    ${depositData.customerId ? `
                    <div class="row">
                        <span class="label">Customer ID:</span>
                        <span>${depositData.customerId}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${depositData.customerId}</span>
                        <span class="label">:شناسنامه</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="amount">
                    <div>DEPOSITED | امانت شده</div>
                    <div style="font-size: 24px; margin-top: 5px;">؋${depositData.amount.toLocaleString()}</div>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Status:</span>
                        <span>ACTIVE - Money held for safekeeping</span>
                    </div>
                    <div class="row row-dari">
                        <span>فعال - پول برای محافظت نگهداری شده</span>
                        <span class="label">:وضعیت</span>
                    </div>
                    ${depositData.notes ? `
                    <div class="row">
                        <span class="label">Notes:</span>
                        <span>${depositData.notes}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${depositData.notes}</span>
                        <span class="label">:یادداشت</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>Your money is safe with us!</p>
                    <p>Keep this receipt for withdrawal</p>
                    <p class="footer-dari">پول شما نزد ما محفوظ است!</p>
                    <p class="footer-dari">این رسید را برای برداشت نگهداری کنید</p>
                    <p>This is a computer generated receipt</p>
                    <p class="footer-dari">این رسید توسط کمپیوتر تولید شده است</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const printWithdrawalReceipt = (withdrawalData: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Withdrawal Receipt | رسید برداشت</title>
                <style>
                    @page { size: 80mm auto; margin: 5mm; }
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 11px; }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .bilingual { margin: 10px 0; padding: 8px; background: #f9f9f9; border-radius: 5px; }
                    .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
                    .row-dari { direction: rtl; text-align: right; }
                    .label { font-weight: bold; }
                    .amount { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; padding: 12px; border: 2px solid #000; background: #fff3cd; }
                    .summary { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; }
                    .footer-dari { direction: rtl; font-size: 10px; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>IBRAHIMI STORE</h1>
                    <p>💵 WITHDRAWAL RECEIPT | رسید برداشت 💵</p>
                    <p>Date | تاریخ: ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Deposit Number:</span>
                        <span>${withdrawalData.depositNumber}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${withdrawalData.depositNumber}</span>
                        <span class="label">:نمبر امانت</span>
                    </div>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Customer:</span>
                        <span>${withdrawalData.customerName}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${withdrawalData.customerName}</span>
                        <span class="label">:مشتری</span>
                    </div>
                    ${withdrawalData.customerId ? `
                    <div class="row">
                        <span class="label">Customer ID:</span>
                        <span>${withdrawalData.customerId}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${withdrawalData.customerId}</span>
                        <span class="label">:شناسنامه</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="amount">
                    <div>WITHDRAWN | برداشت شده</div>
                    <div style="font-size: 24px; margin-top: 5px;">؋${withdrawalData.withdrawnAmount.toLocaleString()}</div>
                </div>
                
                <div class="summary">
                    <div class="row">
                        <span class="label">Original Deposit | امانت اصلی:</span>
                        <span>؋${withdrawalData.originalAmount.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Total Withdrawn | مجموع برداشت:</span>
                        <span>؋${withdrawalData.totalWithdrawn.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Remaining | باقیمانده:</span>
                        <span style="color: #28a745; font-weight: bold;">؋${withdrawalData.remainingBalance.toLocaleString()}</span>
                    </div>
                </div>
                
                ${withdrawalData.notes ? `
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Notes:</span>
                        <span>${withdrawalData.notes}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${withdrawalData.notes}</span>
                        <span class="label">:یادداشت</span>
                    </div>
                </div>
                ` : ''}
                
                <div class="footer">
                    <p>Thank you!</p>
                    <p>Current Status | وضعیت فعلی: ${withdrawalData.status}</p>
                    <p class="footer-dari">تشکر!</p>
                    <p>This is a computer generated receipt</p>
                    <p class="footer-dari">این رسید توسط کمپیوتر تولید شده است</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const printAccountStatement = (customer: any, customerDeposits: any[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const totalDeposited = customerDeposits.reduce((sum, d) => sum + Number(d.originalAmountAFN), 0);
        const totalWithdrawn = customerDeposits.reduce((sum, d) => sum + Number(d.withdrawnAmountAFN), 0);
        const totalRemaining = customerDeposits.reduce((sum, d) => sum + Number(d.remainingAmountAFN), 0);
        
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Account Statement | صورت حساب</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 9px; line-height: 1.2; }
                    .header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .header h1 { margin: 0; font-size: 16px; }
                    .header p { margin: 1px 0; font-size: 8px; }
                    .bilingual { margin: 5px 0; padding: 4px; background: #f9f9f9; border-radius: 3px; }
                    .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 9px; }
                    .row-dari { direction: rtl; text-align: right; }
                    .label { font-weight: bold; }
                    .summary-box { background: #e3f2fd; padding: 6px; border-radius: 3px; margin: 5px 0; }
                    .deposit-item { border-bottom: 1px dashed #ccc; padding: 4px 0; margin: 3px 0; }
                    .status-badge { display: inline-block; padding: 1px 5px; border-radius: 2px; font-size: 7px; font-weight: bold; }
                    .status-active { background: #d4edda; color: #155724; }
                    .status-partial { background: #fff3cd; color: #856404; }
                    .status-withdrawn { background: #f8d7da; color: #721c24; }
                    .footer { text-align: center; margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; font-size: 7px; }
                    .footer-dari { direction: rtl; font-size: 7px; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>IBRAHIMI STORE</h1>
                    <p>📋 ACCOUNT STATEMENT | صورت حساب 📋</p>
                    <p>Date | تاریخ: ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="bilingual">
                    <div class="row">
                        <span class="label">Customer:</span>
                        <span>${customer.name}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${customer.name}</span>
                        <span class="label">:مشتری</span>
                    </div>
                    ${customer.displayId ? `
                    <div class="row">
                        <span class="label">Customer ID:</span>
                        <span>${customer.displayId}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${customer.displayId}</span>
                        <span class="label">:شناسنامه</span>
                    </div>
                    ` : ''}
                    ${customer.phone ? `
                    <div class="row">
                        <span class="label">Phone:</span>
                        <span>${customer.phone}</span>
                    </div>
                    <div class="row row-dari">
                        <span>${customer.phone}</span>
                        <span class="label">:تلفن</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="summary-box">
                    <div class="row">
                        <span class="label">Total Deposited | مجموع امانات:</span>
                        <span style="font-weight: bold;">؋${totalDeposited.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Total Withdrawn | مجموع برداشت:</span>
                        <span style="color: #dc3545;">؋${totalWithdrawn.toLocaleString()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Current Balance | موجودی فعلی:</span>
                        <span style="color: #28a745; font-weight: bold; font-size: 14px;">؋${totalRemaining.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="section" style="margin: 5px 0;">
                    <p style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 9px; margin: 3px 0;">Deposit Details | جزئیات امانات:</p>
                    ${customerDeposits.map(deposit => `
                        <div class="deposit-item">
                            <div class="row">
                                <span class="label">${deposit.depositNumber}</span>
                                <span class="status-badge status-${deposit.status.toLowerCase()}">${deposit.status}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Date | تاریخ: ${new Date(deposit.depositDate).toLocaleDateString()}</span>
                                <span>Original | اصلی: ؋${Number(deposit.originalAmountAFN).toLocaleString()}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Withdrawn | برداشت: ؋${Number(deposit.withdrawnAmountAFN).toLocaleString()}</span>
                                <span>Remaining | باقیمانده: ؋${Number(deposit.remainingAmountAFN).toLocaleString()}</span>
                            </div>
                            ${deposit.withdrawals && deposit.withdrawals.length > 0 ? `
                                <div style="margin-left: 5px; margin-top: 2px; font-size: 7px; color: #666;">
                                    <p style="margin: 1px 0;">Withdrawals | برداشت‌ها:</p>
                                    ${deposit.withdrawals.map((w: any) => `
                                        <p style="margin: 1px 0;">• ${new Date(w.withdrawalDate).toLocaleDateString()}: ؋${Number(w.amountAFN).toLocaleString()}</p>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="footer">
                    <p>IBRAHIMI STORE - Your Trusted Partner</p>
                    <p class="footer-dari">فروشگاه ابراهیمی - شریک قابل اعتماد شما</p>
                    <p>This is a computer generated statement</p>
                    <p class="footer-dari">این صورت حساب توسط کمپیوتر تولید شده است</p>
                    <p>For any queries, please contact us</p>
                    <p class="footer-dari">برای هرگونه سوال، لطفاً با ما تماس بگیرید</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    };

    const printCompleteCustomerHistory = async (customer: any) => {
        try {
            // Fetch all customer data
            const [debtsRes, depositsRes] = await Promise.all([
                api.get(`/debts?customerId=${customer.id}`),
                api.get(`/deposits?customerId=${customer.id}`)
            ]);

            const customerDebts = debtsRes.data;
            const customerDeposits = depositsRes.data;

            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            // Calculate totals
            const totalBorrowed = customerDebts.reduce((sum: number, d: any) => sum + Number(d.originalAmountAFN), 0);
            const totalPaid = customerDebts.reduce((sum: number, d: any) => sum + Number(d.paidAmountAFN), 0);
            const totalDebtRemaining = customerDebts.reduce((sum: number, d: any) => sum + Number(d.remainingBalanceAFN), 0);
            
            const totalDeposited = customerDeposits.reduce((sum: number, d: any) => sum + Number(d.originalAmountAFN), 0);
            const totalWithdrawn = customerDeposits.reduce((sum: number, d: any) => sum + Number(d.withdrawnAmountAFN), 0);
            const totalDepositRemaining = customerDeposits.reduce((sum: number, d: any) => sum + Number(d.remainingAmountAFN), 0);

            const receiptHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Complete Customer History | تاریخچه کامل مشتری</title>
                    <style>
                        @page { size: A4; margin: 10mm; }
                        body { font-family: Arial, sans-serif; padding: 10px; font-size: 9px; line-height: 1.2; }
                        .header { text-align: center; margin-bottom: 8px; border-bottom: 3px solid #000; padding-bottom: 5px; }
                        .header h1 { margin: 0; font-size: 18px; font-weight: bold; }
                        .header p { margin: 1px 0; font-size: 9px; }
                        .bilingual { margin: 4px 0; padding: 4px; background: #f9f9f9; border-radius: 3px; }
                        .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 9px; }
                        .row-dari { direction: rtl; text-align: right; }
                        .label { font-weight: bold; }
                        .section-header { background: #333; color: white; padding: 4px 8px; margin: 6px 0 3px 0; font-weight: bold; font-size: 10px; border-radius: 3px; }
                        .summary-box { padding: 5px; border-radius: 3px; margin: 4px 0; border: 1px solid #ddd; }
                        .debt-box { background: #fff3cd; }
                        .deposit-box { background: #d4edda; }
                        .item { border-bottom: 1px dashed #ccc; padding: 3px 0; margin: 2px 0; }
                        .status-badge { display: inline-block; padding: 1px 4px; border-radius: 2px; font-size: 7px; font-weight: bold; }
                        .status-active { background: #d4edda; color: #155724; }
                        .status-partial { background: #fff3cd; color: #856404; }
                        .status-paid { background: #d4edda; color: #155724; }
                        .status-withdrawn { background: #f8d7da; color: #721c24; }
                        .footer { text-align: center; margin-top: 8px; padding-top: 5px; border-top: 2px solid #000; font-size: 7px; }
                        .footer-dari { direction: rtl; font-size: 7px; }
                        .grand-total { background: #e3f2fd; padding: 6px; margin: 6px 0; border: 2px solid #2196f3; border-radius: 4px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>IBRAHIMI STORE</h1>
                        <p>📊 COMPLETE CUSTOMER HISTORY | تاریخچه کامل مشتری 📊</p>
                        <p>Date | تاریخ: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <div class="bilingual">
                        <div class="row">
                            <span class="label">Customer | مشتری:</span>
                            <span>${customer.name}</span>
                        </div>
                        ${customer.displayId ? `
                        <div class="row">
                            <span class="label">Customer ID | شناسنامه:</span>
                            <span>${customer.displayId}</span>
                        </div>
                        ` : ''}
                        ${customer.phone ? `
                        <div class="row">
                            <span class="label">Phone | تلفن:</span>
                            <span>${customer.phone}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="grand-total">
                        <div class="row" style="font-size: 11px;">
                            <span>Net Balance | موجودی خالص:</span>
                            <span style="color: ${(totalDepositRemaining - totalDebtRemaining) >= 0 ? '#28a745' : '#dc3545'}; font-size: 13px;">
                                ؋${(totalDepositRemaining - totalDebtRemaining).toLocaleString()}
                            </span>
                        </div>
                        <div class="row" style="font-size: 8px; color: #666;">
                            <span>(Deposits: ؋${totalDepositRemaining.toLocaleString()} - Debts: ؋${totalDebtRemaining.toLocaleString()})</span>
                        </div>
                    </div>

                    <!-- DEBTS SECTION -->
                    ${customerDebts.length > 0 ? `
                    <div class="section-header">💰 DEBTS / LENDING | قرض / امانت</div>
                    <div class="summary-box debt-box">
                        <div class="row">
                            <span class="label">Total Borrowed | مجموع قرض:</span>
                            <span>؋${totalBorrowed.toLocaleString()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Total Paid | مجموع پرداخت:</span>
                            <span style="color: #28a745;">؋${totalPaid.toLocaleString()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Remaining Debt | باقی مانده:</span>
                            <span style="color: #dc3545; font-weight: bold;">؋${totalDebtRemaining.toLocaleString()}</span>
                        </div>
                    </div>
                    ${customerDebts.map((debt: any) => `
                        <div class="item">
                            <div class="row">
                                <span class="label">${debt.debtNumber}</span>
                                <span class="status-badge status-${debt.status.toLowerCase()}">${debt.status}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Date: ${new Date(debt.lendingDate).toLocaleDateString()}</span>
                                <span>Original: ؋${Number(debt.originalAmountAFN).toLocaleString()}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Paid: ؋${Number(debt.paidAmountAFN).toLocaleString()}</span>
                                <span>Remaining: ؋${Number(debt.remainingBalanceAFN).toLocaleString()}</span>
                            </div>
                            ${debt.payments && debt.payments.length > 0 ? `
                                <div style="margin-left: 5px; margin-top: 2px; font-size: 7px; color: #666;">
                                    <p style="margin: 1px 0;">Payments:</p>
                                    ${debt.payments.map((p: any) => `
                                        <p style="margin: 1px 0;">• ${new Date(p.paymentDate).toLocaleDateString()}: ؋${Number(p.amountAFN).toLocaleString()}</p>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    ` : '<p style="text-align: center; color: #999; padding: 10px;">No debt history | بدون تاریخچه قرض</p>'}

                    <!-- DEPOSITS SECTION -->
                    ${customerDeposits.length > 0 ? `
                    <div class="section-header" style="margin-top: 10px;">🏦 DEPOSITS / SAFEKEEPING | امانات</div>
                    <div class="summary-box deposit-box">
                        <div class="row">
                            <span class="label">Total Deposited | مجموع امانات:</span>
                            <span>؋${totalDeposited.toLocaleString()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Total Withdrawn | مجموع برداشت:</span>
                            <span style="color: #dc3545;">؋${totalWithdrawn.toLocaleString()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Current Balance | موجودی فعلی:</span>
                            <span style="color: #28a745; font-weight: bold;">؋${totalDepositRemaining.toLocaleString()}</span>
                        </div>
                    </div>
                    ${customerDeposits.map((deposit: any) => `
                        <div class="item">
                            <div class="row">
                                <span class="label">${deposit.depositNumber}</span>
                                <span class="status-badge status-${deposit.status.toLowerCase()}">${deposit.status}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Date: ${new Date(deposit.depositDate).toLocaleDateString()}</span>
                                <span>Original: ؋${Number(deposit.originalAmountAFN).toLocaleString()}</span>
                            </div>
                            <div class="row" style="font-size: 8px;">
                                <span>Withdrawn: ؋${Number(deposit.withdrawnAmountAFN).toLocaleString()}</span>
                                <span>Remaining: ؋${Number(deposit.remainingAmountAFN).toLocaleString()}</span>
                            </div>
                            ${deposit.withdrawals && deposit.withdrawals.length > 0 ? `
                                <div style="margin-left: 5px; margin-top: 2px; font-size: 7px; color: #666;">
                                    <p style="margin: 1px 0;">Withdrawals:</p>
                                    ${deposit.withdrawals.map((w: any) => `
                                        <p style="margin: 1px 0;">• ${new Date(w.withdrawalDate).toLocaleDateString()}: ؋${Number(w.amountAFN).toLocaleString()}</p>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    ` : '<p style="text-align: center; color: #999; padding: 10px;">No deposit history | بدون تاریخچه امانات</p>'}

                    <div class="footer">
                        <p>IBRAHIMI STORE - Your Trusted Partner</p>
                        <p class="footer-dari">فروشگاه ابراهیمی - شریک قابل اعتماد شما</p>
                        <p>Complete Transaction History | تاریخچه کامل معاملات</p>
                        <p class="footer-dari">این گزارش توسط کمپیوتر تولید شده است</p>
                    </div>
                    
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
            
            printWindow.document.write(receiptHTML);
            printWindow.document.close();
        } catch (error) {
            console.error('Failed to print customer history:', error);
        }
    };

    const handlePayment = async () => {
        if (!selectedCustomer || !paymentAmount) {
            setPaymentError('Please select a customer and enter payment amount');
            return;
        }
        
        const amountAFN = Number(paymentAmount);
        if (amountAFN <= 0) {
            setPaymentError('Invalid payment amount');
            return;
        }

        // Backend will handle validation - allow any reasonable amount

        setPaymentLoading(true);
        setPaymentError('');

        try {
            // Work purely in AFN - no USD conversion needed
            if (selectedDebt) {
                // Payment for existing debt
                await api.post(`/debts/${selectedDebt.id}/payments`, {
                    amountAFN,
                    paymentMethod,
                    notes: paymentNotes
                });
                
                // Store payment data for receipt
                const paymentData = {
                    customerName: selectedCustomer.name,
                    customerId: selectedCustomer.displayId,
                    invoiceNumber: selectedDebt.invoice.invoiceNumber,
                    paidAmount: amountAFN,
                    paymentMethod: paymentMethod,
                    originalAmount: selectedDebt.originalAmountAFN,
                    totalPaid: Number(selectedDebt.paidAmountAFN) + amountAFN,
                    remaining: Number(selectedDebt.remainingBalanceAFN) - amountAFN,
                    notes: paymentNotes
                };
                setLastPayment(paymentData);
                setShowReceiptModal(true);
            } else {
                // General payment/deposit without debt
                setPaymentError('Customer has no outstanding debts to pay');
                setPaymentLoading(false);
                return;
            }

            // Refresh data
            await fetchData();
            
            // Close modal and reset
            setShowPaymentModal(false);
            setSelectedDebt(null);
            setSelectedCustomer(null);
            setCustomerSearch('');
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
    
    const handleDeleteDebt = async () => {
        if (!selectedDebt) {
            setDeleteError('No debt selected');
            return;
        }
        
        if (!deletePassword) {
            setDeleteError('Your login password is required');
            return;
        }
        
        setDeleteLoading(true);
        setDeleteError('');
        
        try {
            await api.delete(`/debts/${selectedDebt.id}`, {
                data: { adminPassword: deletePassword }
            });
            
            setShowDeleteModal(false);
            setDeletePassword('');
            setSelectedDebt(null);
            await Promise.all([fetchData(), fetchShopBalance()]);
            alert('Lending entry deleted successfully! Shop balance has been restored.');
        } catch (error: any) {
            console.error('Delete error:', error.response?.data);
            const errorMessage = error.response?.data?.message || 'Failed to delete';
            setDeleteError(errorMessage === 'Invalid password' 
                ? 'Invalid password - Make sure you\'re using your login password (same as when you login)' 
                : errorMessage);
        } finally {
            setDeleteLoading(false);
        }
    };
    
    const fetchCustomerHistory = async (customerId: number) => {
        setHistoryLoading(true);
        try {
            // Fetch all debts for this customer (both paid and unpaid)
            const response = await api.get(`/debts?customerId=${customerId}`);
            setCustomerHistory(response.data);
        } catch (error) {
            console.error('Failed to fetch customer history:', error);
            setCustomerHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };
    
    const handleShowHistory = (customer: any) => {
        setHistoryCustomer(customer);
        setShowHistoryModal(true);
        fetchCustomerHistory(customer.id);
    };
    
    const fetchLendingInvoices = async () => {
        setInvoicesLoading(true);
        try {
            // Fetch all invoices that start with LEND-
            const response = await api.get('/invoices');
            const allInvoices = response.data;
            const lendingOnly = allInvoices.filter((inv: any) => 
                inv.invoiceNumber?.startsWith('LEND-')
            );
            setLendingInvoices(lendingOnly);
        } catch (error) {
            console.error('Failed to fetch lending invoices:', error);
            setLendingInvoices([]);
        } finally {
            setInvoicesLoading(false);
        }
    };
    
    const handleShowInvoices = () => {
        setShowInvoicesModal(true);
        fetchLendingInvoices();
    };
    
    const handleDeleteInvoice = async () => {
        if (!selectedInvoice) {
            setInvoiceDeleteError('No invoice selected');
            return;
        }
        
        if (!invoiceDeletePassword) {
            setInvoiceDeleteError('Your login password is required');
            return;
        }
        
        setInvoiceDeleteLoading(true);
        setInvoiceDeleteError('');
        
        try {
            // Find the credit entry for this invoice
            const creditEntry = debts.find(d => d.invoice.invoiceNumber === selectedInvoice.invoiceNumber);
            
            if (creditEntry) {
                // Delete via debt endpoint which handles balance restoration
                await api.delete(`/debts/${creditEntry.id}`, {
                    data: { adminPassword: invoiceDeletePassword }
                });
            } else {
                // If no credit entry, just delete the invoice (shouldn't happen normally)
                await api.delete(`/invoices/${selectedInvoice.id}`);
            }
            
            setShowInvoiceDeleteModal(false);
            setInvoiceDeletePassword('');
            setSelectedInvoice(null);
            await fetchLendingInvoices();
            await fetchData();
            await fetchShopBalance();
            alert('Invoice deleted successfully! Shop balance has been restored.');
        } catch (error: any) {
            setInvoiceDeleteError(error.response?.data?.message || 'Failed to delete - Check your password');
        } finally {
            setInvoiceDeleteLoading(false);
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
        
        // Check if shop has enough balance
        if (amountAFN > shopBalance) {
            setLendError(`Insufficient shop balance. Available: ؋${shopBalance.toLocaleString()}`);
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
            
            // Deduct from shop balance
            const newShopBalance = shopBalance - amountAFN;
            await api.post('/settings/shop-balance', { balance: newShopBalance, skipPasswordCheck: true });
            setShopBalance(newShopBalance);
            
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
    
    // Filter debts based on search query
    const filteredDebts = debts.filter(debt => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            debt.customer.name?.toLowerCase().includes(query) ||
            debt.customer.displayId?.toLowerCase().includes(query) ||
            debt.customer.id.toString().includes(query) ||
            debt.invoice.invoiceNumber?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Debt Management</h1>
                    <p className="text-gray-600 mt-1">Track and manage customer credit accounts</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div 
                        onClick={() => setShowBalanceModal(true)}
                        className="bg-purple-100 border-2 border-purple-300 rounded-xl px-4 py-2 cursor-pointer hover:bg-purple-200 transition-colors"
                    >
                        <p className="text-xs text-purple-700 font-medium">Shop Balance</p>
                        <p className="text-xl font-bold text-purple-900">؋{shopBalance.toLocaleString()}</p>
                    </div>
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
                    <button
                        onClick={() => {
                            setShowDepositModal(true);
                            setSelectedCustomer(null);
                            setCustomerSearch('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                    >
                        💰 Customer Deposit
                    </button>
                    <button
                        onClick={() => setShowDepositsListModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                    >
                        📋 View Deposits
                    </button>
                    <button
                        onClick={handleShowInvoices}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                    >
                        📄 View Invoices
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

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by customer name, ID, or invoice number..."
                        className="w-full pl-11 pr-10 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                {searchQuery && (
                    <p className="text-sm text-gray-600 mt-2">
                        Found {filteredDebts.length} result{filteredDebts.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </p>
                )}
            </div>

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
                {filteredDebts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No debts found</p>
                        <p className="text-sm mt-1">{searchQuery ? `No results for "${searchQuery}"` : 'No debts match the current filter'}</p>
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
                                {filteredDebts.map((debt) => {
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
                                                    <button
                                                        onClick={() => handleShowHistory(debt.customer)}
                                                        className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                                        title="View Customer History"
                                                    >
                                                        📋 History
                                                    </button>
                                                    <button
                                                        onClick={() => printCompleteCustomerHistory(debt.customer)}
                                                        className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                                        title="Print Complete History"
                                                    >
                                                        🖨️ Print All
                                                    </button>
                                                    {debt.status !== 'SETTLED' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedCustomer(debt.customer);
                                                                    setSelectedDebt(debt);
                                                                    setPaymentAmount(Math.floor(Number(debt.remainingBalanceAFN) || 0).toString());
                                                                    setShowPaymentModal(true);
                                                                }}
                                                                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                            >
                                                                PAY
                                                            </button>
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
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedDebt(debt);
                                                                    setShowDeleteModal(true);
                                                                }}
                                                                className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                                title="Delete Lending Entry"
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedDebt(debt);
                                                                setShowDeleteModal(true);
                                                            }}
                                                            className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                            title="Delete Paid Lending Entry"
                                                        >
                                                            🗑️ Delete
                                                        </button>
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
                                    setPaymentNotes('');
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

                        <div className="space-y-4">
                            {/* Customer Search */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search by Name or ID <span className="text-red-500">*</span>
                                </label>
                                
                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
                                            {selectedCustomer.displayId && <p className="text-xs font-mono text-gray-600">{selectedCustomer.displayId}</p>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setCustomerSearch('');
                                                setSelectedDebt(null);
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <X size={18} />
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
                                                placeholder="Search by name or ID..."
                                                className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        
                                        {customerSearch && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border-2 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                                {filteredCustomers.length === 0 ? (
                                                    <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                                                ) : (
                                                    filteredCustomers.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(c);
                                                                setCustomerSearch('');
                                                                // Check if customer has one unpaid debt and auto-select it
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
                                    </>
                                )}
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Receiving Amount (AFN) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-500 font-bold text-lg">؋</span>
                                    <input
                                        type="number"
                                        step="1"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                                        placeholder="Enter amount"
                                        disabled={!selectedCustomer}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    USD: ${(Number(paymentAmount) / (exchangeRate || 70)).toFixed(2)}
                                </p>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Note
                                </label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Payment notes or details..."
                                    disabled={!selectedCustomer}
                                />
                            </div>

                            {/* Payment Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={newDueDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    disabled={!selectedCustomer}
                                />
                            </div>

                            {/* Confirm Button */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setSelectedDebt(null);
                                        setSelectedCustomer(null);
                                        setCustomerSearch('');
                                        setPaymentError('');
                                        setPaymentAmount('');
                                        setPaymentNotes('');
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePayment}
                                    disabled={paymentLoading || !selectedCustomer || !paymentAmount}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {paymentLoading ? 'Processing...' : '✓ Confirm Payment'}
                                </button>
                            </div>
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

            {/* Delete Debt Modal */}
            {showDeleteModal && selectedDebt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-red-900">\u26a0\ufe0f Delete Lending Entry</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedDebt(null);
                                    setDeletePassword('');
                                    setDeleteError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                \u2715
                            </button>
                        </div>

                        {deleteError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {deleteError}
                            </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-medium mb-2">\u26a0\ufe0f Warning: This action cannot be undone!</p>
                            <div className="space-y-1 text-sm text-yellow-700">
                                <p>\u2022 Customer: <strong>{selectedDebt.customer.name}</strong></p>
                                <p>\u2022 Amount: <strong>\u060b{Math.floor(Number(selectedDebt.remainingBalanceAFN) || 0).toLocaleString()}</strong></p>
                                <p>\u2022 Shop balance will be restored (+\u060b{Math.floor(Number(selectedDebt.originalAmountAFN) || 0).toLocaleString()})</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Your Login Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Enter your login password"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && deletePassword) {
                                        handleDeleteDebt();
                                    }
                                }}
                            />
                            <p className="text-xs text-gray-500 mt-1">Same password you use to login</p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedDebt(null);
                                    setDeletePassword('');
                                    setDeleteError('');
                                }}
                                disabled={deleteLoading}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteDebt}
                                disabled={deleteLoading || !deletePassword}
                                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleteLoading ? 'Deleting...' : '\ud83d\uddd1\ufe0f Delete Entry'}
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

            {/* Shop Balance Admin Modal */}
            {showBalanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">🔒 Update Shop Balance</h3>
                            <button
                                onClick={() => {
                                    setShowBalanceModal(false);
                                    setAdminPassword('');
                                    setNewBalance('');
                                    setBalanceDescription('');
                                    setBalanceError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {balanceError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {balanceError}
                            </div>
                        )}

                        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                            <p className="text-sm text-purple-700 font-medium">Current Balance</p>
                            <p className="text-3xl font-bold text-purple-900">؋{shopBalance.toLocaleString()}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Enter admin password (default: ibrahimi2024)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                💡 To change password, contact system administrator
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Balance (AFN) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500 font-bold text-lg">؋</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg font-bold"
                                    placeholder="Enter new balance"
                                />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                USD: ${(Number(newBalance) / (exchangeRate || 70)).toFixed(2)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={balanceDescription}
                                onChange={(e) => setBalanceDescription(e.target.value)}
                                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Why are you updating the balance?"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 font-medium mb-1">
                                ℹ️ <strong>Auto Balance Management:</strong>
                            </p>
                            <ul className="text-xs text-blue-700 space-y-1 ml-4">
                                <li>✓ Increases when you sell products (+)</li>
                                <li>✓ Decreases when you add expenses (-)</li>
                                <li>✓ Decreases when you lend money (-)</li>
                            </ul>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowBalanceModal(false);
                                    setAdminPassword('');
                                    setNewBalance('');
                                    setBalanceDescription('');
                                    setBalanceError('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateBalance}
                                disabled={balanceLoading || !adminPassword || !newBalance}
                                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                {balanceLoading ? 'Updating...' : '✓ Update Balance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Customer History Modal */}
            {showHistoryModal && historyCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    📋 Debt History
                                </h3>
                                <p className="text-gray-600 mt-1">
                                    {historyCustomer.name}
                                    {historyCustomer.displayId && (
                                        <span className="ml-2 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                            {historyCustomer.displayId}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowHistoryModal(false);
                                    setHistoryCustomer(null);
                                    setCustomerHistory([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {historyLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-gray-500">Loading history...</div>
                                </div>
                            ) : customerHistory.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p>No debt history found for this customer</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {customerHistory.map((debt) => (
                                        <div 
                                            key={debt.id}
                                            className={`border-2 rounded-lg p-4 ${
                                                debt.status === 'SETTLED' 
                                                    ? 'bg-green-50 border-green-200' 
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                                            {debt.invoice.invoiceNumber}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                                            debt.status === 'SETTLED' ? 'bg-green-100 text-green-700 border-green-300' :
                                                            debt.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border-red-300' :
                                                            debt.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                            'bg-blue-100 text-blue-700 border-blue-300'
                                                        }`}>
                                                            {debt.status === 'SETTLED' ? 'PAID' : debt.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Created: {new Date(debt.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Original Amount</p>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        ؋{debt.originalAmountAFN.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 mb-3">
                                                <div className="bg-gray-50 rounded p-3">
                                                    <p className="text-xs text-gray-600 mb-1">Paid</p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        ؋{debt.paidAmountAFN.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 rounded p-3">
                                                    <p className="text-xs text-gray-600 mb-1">Remaining</p>
                                                    <p className="text-lg font-bold text-orange-600">
                                                        ؋{debt.remainingBalanceAFN.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 rounded p-3">
                                                    <p className="text-xs text-gray-600 mb-1">Due Date</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {new Date(debt.dueDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {debt.debtPayments && debt.debtPayments.length > 0 && (
                                                <div className="mt-3 border-t pt-3">
                                                    <p className="text-xs font-medium text-gray-700 mb-2">
                                                        Payment History ({debt.debtPayments.length})
                                                    </p>
                                                    <div className="space-y-2">
                                                        {debt.debtPayments.map((payment: DebtPayment) => (
                                                            <div 
                                                                key={payment.id}
                                                                className="flex items-center justify-between text-sm bg-gray-50 rounded p-2"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-green-600 font-bold">✓</span>
                                                                    <span className="text-gray-600">
                                                                        {new Date(payment.paymentDate).toLocaleDateString()}
                                                                    </span>
                                                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                                                        {payment.paymentMethod}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-green-600">
                                                                        ؋{payment.amountAFN.toLocaleString()}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const paymentData = {
                                                                                customerName: debt.customer.name,
                                                                                customerId: debt.customer.displayId,
                                                                                invoiceNumber: debt.invoice.invoiceNumber,
                                                                                paidAmount: payment.amountAFN,
                                                                                paymentMethod: payment.paymentMethod,
                                                                                originalAmount: debt.originalAmountAFN,
                                                                                totalPaid: debt.paidAmountAFN,
                                                                                remaining: debt.remainingBalanceAFN,
                                                                                notes: payment.notes || ''
                                                                            };
                                                                            printPaymentReceipt(paymentData);
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                                                                        title="Print Receipt"
                                                                    >
                                                                        🖨️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {debt.notes && (
                                                <div className="mt-3 text-sm text-gray-600 italic border-t pt-2">
                                                    Note: {debt.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Debts</p>
                                    <p className="text-2xl font-bold text-gray-900">{customerHistory.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Outstanding</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        ؋{customerHistory
                                            .filter(d => d.status !== 'SETTLED')
                                            .reduce((sum, d) => sum + d.remainingBalanceAFN, 0)
                                            .toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        ؋{customerHistory
                                            .reduce((sum, d) => sum + Number(d.paidAmountAFN || 0), 0)
                                            .toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Lending Invoices Modal */}
            {showInvoicesModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    📄 Lending Invoices
                                </h3>
                                <p className="text-gray-600 mt-1">
                                    All invoices for money lending transactions
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowInvoicesModal(false);
                                    setLendingInvoices([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {invoicesLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-gray-500">Loading invoices...</div>
                                </div>
                            ) : lendingInvoices.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p>No lending invoices found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                                <th className="text-left p-4 font-semibold text-gray-700">Invoice #</th>
                                                <th className="text-left p-4 font-semibold text-gray-700">Customer</th>
                                                <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                                                <th className="text-right p-4 font-semibold text-gray-700">Total (AFN)</th>
                                                <th className="text-right p-4 font-semibold text-gray-700">Total (USD)</th>
                                                <th className="text-center p-4 font-semibold text-gray-700">Status</th>
                                                <th className="text-center p-4 font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {lendingInvoices.map((invoice) => {
                                                const debt = debts.find(d => d.invoice.invoiceNumber === invoice.invoiceNumber);
                                                const isPaid = debt?.status === 'SETTLED';
                                                
                                                return (
                                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                                        <td className="p-4">
                                                            <span className="font-mono text-sm bg-orange-100 px-2 py-1 rounded">
                                                                {invoice.invoiceNumber}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div>
                                                                <p className="font-medium text-gray-900">
                                                                    {invoice.customer?.name || 'Unknown'}
                                                                </p>
                                                                {invoice.customer?.displayId && (
                                                                    <p className="text-xs text-gray-500 font-mono">
                                                                        {invoice.customer.displayId}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-gray-600">
                                                            {new Date(invoice.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4 text-right font-bold text-gray-900">
                                                            ؋{invoice.totalAmountAFN?.toLocaleString() || '0'}
                                                        </td>
                                                        <td className="p-4 text-right font-medium text-gray-600">
                                                            ${invoice.totalAmount?.toFixed(2) || '0.00'}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {debt ? (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                                                    isPaid ? 'bg-green-100 text-green-700 border-green-300' :
                                                                    debt.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border-red-300' :
                                                                    debt.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                                    'bg-blue-100 text-blue-700 border-blue-300'
                                                                }`}>
                                                                    {isPaid ? 'PAID' : debt.status.replace('_', ' ')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2 justify-center">
                                                                <button
                                                                    onClick={() => {
                                                                        if (debt) {
                                                                            handleShowHistory(debt.customer);
                                                                        }
                                                                    }}
                                                                    disabled={!debt}
                                                                    className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    View Details
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInvoice(invoice);
                                                                        setShowInvoiceDeleteModal(true);
                                                                    }}
                                                                    className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
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

                        <div className="border-t p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Invoices</p>
                                    <p className="text-2xl font-bold text-gray-900">{lendingInvoices.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Amount (AFN)</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        ؋{lendingInvoices
                                            .reduce((sum, inv) => sum + (inv.totalAmountAFN || 0), 0)
                                            .toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Amount (USD)</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        ${lendingInvoices
                                            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
                                            .toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Invoice Delete Confirmation Modal */}
            {showInvoiceDeleteModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                ⚠️ Delete Invoice
                            </h3>
                        </div>

                        {invoiceDeleteError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {invoiceDeleteError}
                            </div>
                        )}

                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-medium mb-2">
                                You are about to delete:
                            </p>
                            <ul className="text-sm text-yellow-900 space-y-1">
                                <li>• Invoice: <span className="font-mono font-bold">{selectedInvoice.invoiceNumber}</span></li>
                                <li>• Customer: <span className="font-bold">{selectedInvoice.customer?.name}</span></li>
                                <li>• Amount: <span className="font-bold">؋{selectedInvoice.totalAmountAFN?.toLocaleString()}</span></li>
                                <li className="text-green-700 font-medium">✓ Shop balance will be restored</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Login Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={invoiceDeletePassword}
                                onChange={(e) => setInvoiceDeletePassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleDeleteInvoice()}
                                placeholder="Enter your login password"
                                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowInvoiceDeleteModal(false);
                                    setSelectedInvoice(null);
                                    setInvoiceDeletePassword('');
                                    setInvoiceDeleteError('');
                                }}
                                disabled={invoiceDeleteLoading}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteInvoice}
                                disabled={invoiceDeleteLoading || !invoiceDeletePassword}
                                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {invoiceDeleteLoading ? 'Deleting...' : '🗑️ Delete Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Payment Receipt Modal */}
            {showReceiptModal && lastPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Payment Received!
                            </h3>
                            <p className="text-gray-600">
                                ؋{lastPayment.paidAmount.toLocaleString()} has been recorded
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Customer:</span>
                                <span className="font-medium">{lastPayment.customerName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Invoice:</span>
                                <span className="font-mono text-xs">{lastPayment.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="font-medium">{lastPayment.paymentMethod}</span>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Remaining Balance:</span>
                                    <span className="font-bold text-orange-600">
                                        ؋{lastPayment.remaining.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowReceiptModal(false);
                                    setLastPayment(null);
                                }}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    printPaymentReceipt(lastPayment);
                                    setShowReceiptModal(false);
                                    setLastPayment(null);
                                }}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                🖨️ Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">💰 Customer Deposit</h3>
                            <button
                                onClick={() => {
                                    setShowDepositModal(false);
                                    setSelectedCustomer(null);
                                    setCustomerSearch('');
                                    setDepositAmount('');
                                    setDepositNotes('');
                                    setDepositError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {depositError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {depositError}
                            </div>
                        )}

                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                            <p className="text-sm text-indigo-700 font-medium">
                                💡 Customer Safekeeping
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">
                                Customers can deposit money for safekeeping. Shop balance will increase.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Customer <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    onFocus={() => setCustomerSearch('')}
                                    placeholder="Search customer by name or ID..."
                                    className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {customerSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                                        {customers
                                            .filter(c =>
                                                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                c.displayId?.toLowerCase().includes(customerSearch.toLowerCase())
                                            )
                                            .map(customer => (
                                                <div
                                                    key={customer.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setCustomerSearch(customer.name);
                                                    }}
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                >
                                                    <p className="font-medium">{customer.name}</p>
                                                    <p className="text-xs text-gray-500">ID: {customer.displayId || customer.id}</p>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {selectedCustomer && (
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                    ✓ Selected: <span className="font-medium">{selectedCustomer.name}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deposit Amount (AFN) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500 font-bold">؋</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="50000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={depositNotes}
                                onChange={(e) => setDepositNotes(e.target.value)}
                                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                rows={3}
                                placeholder="Any additional notes..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowDepositModal(false);
                                    setSelectedCustomer(null);
                                    setCustomerSearch('');
                                    setDepositAmount('');
                                    setDepositNotes('');
                                    setDepositError('');
                                }}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDepositClick}
                                disabled={depositLoading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                            >
                                {depositLoading ? 'Creating...' : '💰 Create Deposit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Deposits List Modal */}
            {showDepositsListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">📋 Customer Deposits</h3>
                                    <p className="text-sm text-gray-600 mt-1">Search and manage deposits</p>
                                </div>
                                <button
                                    onClick={() => setShowDepositsListModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Search Bar */}
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={depositSearchQuery}
                                    onChange={(e) => setDepositSearchQuery(e.target.value)}
                                    placeholder="🔍 Search by deposit number, customer name, or ID..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                {depositSearchQuery && (
                                    <button
                                        onClick={() => setDepositSearchQuery('')}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6">
                            {(() => {
                                const filteredDeposits = deposits.filter(deposit => {
                                    if (!depositSearchQuery) return true;
                                    const query = depositSearchQuery.toLowerCase();
                                    return (
                                        deposit.depositNumber.toLowerCase().includes(query) ||
                                        deposit.customer?.name?.toLowerCase().includes(query) ||
                                        deposit.customer?.displayId?.toLowerCase().includes(query) ||
                                        deposit.customer?.phone?.includes(query)
                                    );
                                });

                                return filteredDeposits.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-6xl mb-4">🔍</div>
                                        <p className="text-gray-500">
                                            {depositSearchQuery ? 'No deposits found matching your search' : 'No deposits yet'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4 text-sm text-gray-600">
                                            Showing {filteredDeposits.length} of {deposits.length} deposits
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b-2">
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deposit #</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Original</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Withdrawn</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remaining</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredDeposits.map((deposit) => (
                                                <tr key={deposit.id} className="border-b hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-semibold text-indigo-600">
                                                            {deposit.depositNumber}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium">{deposit.customer.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                ID: {deposit.customer.displayId || deposit.customer.id}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        ؋{Number(deposit.originalAmountAFN).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-red-600 font-medium">
                                                        {Number(deposit.withdrawnAmountAFN) > 0 
                                                            ? `؋${Number(deposit.withdrawnAmountAFN).toLocaleString()}`
                                                            : '-'
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-green-600">
                                                        ؋{Number(deposit.remainingAmountAFN).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            deposit.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                            deposit.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {deposit.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {new Date(deposit.depositDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            {deposit.status !== 'WITHDRAWN' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedDeposit(deposit);
                                                                        setShowWithdrawModal(true);
                                                                    }}
                                                                    className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                                                                >
                                                                    💵 Withdraw
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    const customerDeposits = deposits.filter(d => d.customer.id === deposit.customer.id);
                                                                    printAccountStatement(deposit.customer, customerDeposits);
                                                                }}
                                                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                                                title="Print Account Statement"
                                                            >
                                                                🖨️
                                                            </button>
                                                            <button
                                                                onClick={() => printCompleteCustomerHistory(deposit.customer)}
                                                                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                                                                title="Print Complete History"
                                                            >
                                                                📊
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && selectedDeposit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">💵 Withdraw from Deposit</h3>
                            <button
                                onClick={() => {
                                    setShowWithdrawModal(false);
                                    setSelectedDeposit(null);
                                    setWithdrawAmount('');
                                    setWithdrawNotes('');
                                    setWithdrawError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {withdrawError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {withdrawError}
                            </div>
                        )}

                        {(() => {
                            const customerDeposits = deposits.filter(d => d.customer.id === selectedDeposit.customer.id);
                            const totalAcrossAllDeposits = customerDeposits.reduce((sum, d) => sum + Number(d.remainingAmountAFN), 0);
                            
                            return (
                                <>
                                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-blue-700 font-medium">Total Balance (All Deposits):</span>
                                            <span className="text-2xl font-bold text-blue-900">
                                                ؋{totalAcrossAllDeposits.toLocaleString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => printAccountStatement(selectedDeposit.customer, customerDeposits)}
                                            className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            🖨️ Print Full Account Statement
                                        </button>
                                    </div>

                                    <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 space-y-2">
                                        <p className="text-xs text-teal-600 font-medium mb-2">This Deposit Details:</p>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-teal-700">Deposit Number:</span>
                                            <span className="font-mono font-semibold">{selectedDeposit.depositNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-teal-700">Customer:</span>
                                            <span className="font-medium">{selectedDeposit.customer.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-teal-700">This Deposit Balance:</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ؋{Number(selectedDeposit.remainingAmountAFN).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Withdrawal Amount (AFN) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500 font-bold">؋</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder={`Max: ${Number(selectedDeposit.remainingAmountAFN).toLocaleString()}`}
                                />
                            </div>
                            <button
                                onClick={() => setWithdrawAmount(selectedDeposit.remainingAmountAFN.toString())}
                                className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                                Withdraw Full Amount from This Deposit
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={withdrawNotes}
                                onChange={(e) => setWithdrawNotes(e.target.value)}
                                className="w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                rows={2}
                                placeholder="Withdrawal reason..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowWithdrawModal(false);
                                    setSelectedDeposit(null);
                                    setWithdrawAmount('');
                                    setWithdrawNotes('');
                                    setWithdrawError('');
                                }}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleWithdrawClick}
                                disabled={withdrawLoading}
                                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
                            >
                                {withdrawLoading ? 'Processing...' : '💵 Withdraw'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deposit Confirmation Modal */}
            {showDepositConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">🔐 Confirm Deposit | تایید امانت</h3>
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p className="text-gray-800 mb-2">
                                Are you sure <strong>{selectedCustomer?.name}</strong> wants to deposit <strong>؋{Number(depositAmount).toLocaleString()}</strong>?
                            </p>
                            <p className="text-gray-800 text-right" dir="rtl">
                                آیا مطمئن هستید که <strong>{selectedCustomer?.name}</strong> می‌خواهد <strong>؋{Number(depositAmount).toLocaleString()}</strong> امانت بگذارد؟
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Your Password | رمز عبور خود را وارد کنید
                            </label>
                            <input
                                type="password"
                                value={depositConfirmPassword}
                                onChange={(e) => setDepositConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Password..."
                                autoFocus
                            />
                        </div>

                        {depositError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                                <p className="text-red-700 text-sm">{depositError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDepositConfirmModal(false);
                                    setDepositConfirmPassword('');
                                    setDepositError('');
                                }}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel | لغو
                            </button>
                            <button
                                onClick={handleCreateDeposit}
                                disabled={!depositConfirmPassword || depositLoading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                            >
                                {depositLoading ? 'Processing...' : 'Confirm | تایید'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdrawal Confirmation Modal */}
            {showWithdrawConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">🔐 Confirm Withdrawal | تایید برداشت</h3>
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <p className="text-gray-800 mb-2">
                                Are you sure <strong>{selectedCustomer?.name}</strong> wants to withdraw <strong>؋{Number(withdrawAmount).toLocaleString()}</strong>?
                            </p>
                            <p className="text-gray-800 text-right" dir="rtl">
                                آیا مطمئن هستید که <strong>{selectedCustomer?.name}</strong> می‌خواهد <strong>؋{Number(withdrawAmount).toLocaleString()}</strong> برداشت کند؟
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Your Password | رمز عبور خود را وارد کنید
                            </label>
                            <input
                                type="password"
                                value={withdrawConfirmPassword}
                                onChange={(e) => setWithdrawConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="Password..."
                                autoFocus
                            />
                        </div>

                        {withdrawError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                                <p className="text-red-700 text-sm">{withdrawError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowWithdrawConfirmModal(false);
                                    setWithdrawConfirmPassword('');
                                    setWithdrawError('');
                                }}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel | لغو
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={!withdrawConfirmPassword || withdrawLoading}
                                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
                            >
                                {withdrawLoading ? 'Processing...' : 'Confirm | تایید'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
