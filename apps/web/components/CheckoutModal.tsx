'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Search, X, CreditCard, Banknote, User, AlertTriangle, Printer, Mail } from 'lucide-react';
import api from '../lib/api';
import { useCartStore } from '../lib/cartStore';
import { useSettingsStore } from '../lib/settingsStore';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
    // ... items, clearCart etc
    const { items, clearCart } = useCartStore();
    const { exchangeRate: globalRate } = useSettingsStore();

    // Default exchange rate
    const [exchangeRate, setExchangeRate] = useState(String(globalRate || 70));

    // Update local rate when global changes (optional, or just on mount/open)
    useEffect(() => {
        if (isOpen) setExchangeRate(String(globalRate || 70));
    }, [isOpen, globalRate]);

    const currentRateNum = Number(exchangeRate) || 70;

    const total = items.reduce((sum: number, item: any) => {
        const itemUSD = item.salePriceAFN ? (item.salePriceAFN / currentRateNum) : item.salePrice;
        return sum + (itemUSD * item.quantity);
    }, 0);

    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CASH');
    const [showDebtWarning, setShowDebtWarning] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(''); // NEW: Discount State

    // Receipt Flow State
    const [step, setStep] = useState<'payment' | 'success'>('payment');
    const [lastSaleId, setLastSaleId] = useState<number | null>(null);

    // Calculations
    const subtotalUSD = total;
    const discountAmountUSD = discountPercent ? (subtotalUSD * (Number(discountPercent) / 100)) : 0;
    const finalTotalUSD = subtotalUSD - discountAmountUSD;

    const [paidAmountAFG, setPaidAmountAFG] = useState('');

    // Adjusted Paid Amount Logic:
    // If user pays in AFG, we convert to USD to track against finalTotalUSD
    const paidAmountUSD = paidAmountAFG ? (Number(paidAmountAFG) / Number(exchangeRate)) : 0;

    const [customerId, setCustomerId] = useState<number | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [error, setError] = useState('');
    const [returnChange, setReturnChange] = useState(true);

    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerEmail, setNewCustomerEmail] = useState('');
    
    // Credit Sale Fields
    const [dueDate, setDueDate] = useState('');
    const [debtNotes, setDebtNotes] = useState('');

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await api.get('/customers');
                setCustomers(res.data);
            } catch (err) {
                console.error('Failed to fetch customers', err);
            }
        };
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (c.displayId && c.displayId.toLowerCase().includes(customerSearch.toLowerCase()))
    ).slice(0, 5);

    const handleSelectCustomer = (customer: any) => {
        setSelectedCustomer(customer);
        setCustomerId(customer.id);
        setCustomerSearch('');
        setShowCustomerDropdown(false);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName) return;
        setLoading(true);
        try {
            const res = await api.post('/customers', {
                name: newCustomerName,
                phone: newCustomerPhone,
                email: newCustomerEmail,
                address: 'New POS Customer',
            });
            setCustomers([...customers, res.data]);
            handleSelectCustomer(res.data);

            setIsAddingCustomer(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            setNewCustomerEmail('');
        } catch (error) {
            console.error('Failed to create customer', error);
            setError('Failed to create customer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setDiscountPercent(''); // Reset discount
            // Calculate total freshly to avoid dependency cycle
            const currentTotal = items.reduce((sum: number, item: any) => {
                const itemUSD = item.salePriceAFN ? (item.salePriceAFN / Number(exchangeRate)) : item.salePrice;
                return sum + (itemUSD * item.quantity);
            }, 0);
            setPaidAmountAFG((currentTotal * Number(exchangeRate)).toFixed(0));
            setReturnChange(true);
            setShowDebtWarning(false);
            setStep('payment');
            setLastSaleId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); // Only run when modal opens/closes

    // Update paid amount suggestion when discount changes
    useEffect(() => {
        if (isOpen) {
            setPaidAmountAFG((finalTotalUSD * Number(exchangeRate)).toFixed(0));
        }
    }, [discountPercent, finalTotalUSD, exchangeRate, isOpen]);

    // NEW: Interrogate before submit
    const handleSubmit = async () => {
        if (selectedCustomer && Number(selectedCustomer.outstandingBalance) > 0) {
            setShowDebtWarning(true);
            return;
        }
        await submitTransaction();
    };

    const submitTransaction = async () => {
        setLoading(true);
        setError('');

        try {
            const currentExchangeRate = Number(exchangeRate) || 70;
            const totalAFGReference = finalTotalUSD * currentExchangeRate;

            // Logic: Is user paying more than total?
            const paidAFG = Number(paidAmountAFG) || 0;

            // If Return Change is TRUE, and paid > total, we treat this as "Exact Payment" for the record
            // i.e., backend paidAmount should equal totalAmount (USD)
            // If Return Change is FALSE, we record the extra as Credit (paidAmount > totalAmount)

            let finalPaidAmountUSD = paidAFG / currentExchangeRate;

            if (returnChange && paidAFG > totalAFGReference) {
                finalPaidAmountUSD = finalTotalUSD; // Cap at total (Change returned cash)
            }
            
            // Check if this is a credit sale (partial payment)
            const outstanding = finalTotalUSD - finalPaidAmountUSD;
            const isCreditSale = outstanding > 0.05; // Tolerance for rounding
            
            // Validate due date for ANY credit sales (partial payment or CREDIT method)
            if (isCreditSale && !dueDate) {
                setError('Due date is required when there is outstanding balance');
                setLoading(false);
                return;
            }
            
            // Require customer selection for credit sales
            if (isCreditSale && !customerId) {
                setError('Please select a customer for credit sales');
                setLoading(false);
                return;
            }

            const saleData: any = {
                customerId: customerId,
                items: items.map((i: any) => ({
                    productId: i.id,
                    quantity: i.quantity,
                    unitPrice: i.salePriceAFN ? (Number(i.salePriceAFN) / currentExchangeRate) : Number(i.salePrice)
                })),
                tax: 0,
                discount: discountAmountUSD, // Send Calculated Amount
                paidAmount: finalPaidAmountUSD,
                paymentMethod,
                paymentReference: 'POS Sale',
                exchangeRate: currentExchangeRate,
            };
            
            // Add due date and notes for credit sales
            if (isCreditSale && dueDate) {
                saleData.dueDate = new Date(dueDate).toISOString();
                if (debtNotes) {
                    saleData.debtNotes = debtNotes;
                }
            }

            console.log('Sending Sale Data:', saleData); // Debug log

            const res = await api.post('/sales', saleData);
            setLastSaleId(res.data.id);
            clearCart();
            onSuccess(); // Refresh parent data

            // Reset credit sale fields
            setDueDate('');
            setDebtNotes('');

            // Show Success Options instead of closing
            setStep('success');
            // onClose(); // Removed auto-close
        } catch (err: any) {
            console.error('Transaction Error:', err);
            const msg = err.response?.data?.message;
            const errors = err.response?.data?.errors; // Zod errors

            if (errors) {
                const issues = errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
                setError(`Validation Failed: ${issues}`);
            } else {
                setError(msg || 'Transaction failed. Please check your connection and inputs.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                                        Complete Sale
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        {/* @ts-ignore */}
                                        <X size={24} />
                                    </button>
                                </div>

                                {error && step === 'payment' && (
                                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                {step === 'success' ? (
                                    <div className="text-center space-y-6">
                                        <div className="flex flex-col items-center justify-center text-green-600 space-y-2">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                                {/* @ts-ignore */}
                                                <Banknote size={32} />
                                            </div>
                                            <h3 className="text-2xl font-bold">Payment Successful!</h3>
                                            <p className="text-gray-600">How would you like the receipt?</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => {
                                                    // Print logic
                                                    window.open(`/dashboard/sales/${lastSaleId}`, '_blank');
                                                }}
                                                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
                                            >
                                                {/* @ts-ignore */}
                                                <Printer size={24} className="mb-2 text-blue-600" />
                                                <span className="font-bold text-gray-700">Print / View</span>
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setLoading(true);
                                                        await api.post(`/sales/${lastSaleId}/email`);
                                                        alert('Email sent successfully!');
                                                    } catch (err: any) {
                                                        alert('Failed to send email: ' + (err.response?.data?.message || 'Customer has no email'));
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                disabled={loading}
                                                className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                                            >
                                                {/* @ts-ignore */}
                                                <Mail size={24} className="mb-2 text-green-600" />
                                                <span className="font-bold text-gray-700">{loading ? 'Sending...' : 'Email'}</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                // BOTH logic
                                                try {
                                                    // Email first (async)
                                                    api.post(`/sales/${lastSaleId}/email`).catch(console.error);
                                                    // Then Print
                                                    window.open(`/dashboard/sales/${lastSaleId}`, '_blank');
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900"
                                        >
                                            Both (Email & Print)
                                        </button>

                                        <button
                                            onClick={onClose}
                                            className="text-gray-400 hover:text-gray-600 underline text-sm"
                                        >
                                            Skip & Close
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            {/* Totals Summary */}
                                            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                                <div className="flex justify-between text-gray-500 text-sm">
                                                    <span>Subtotal</span>
                                                    <span>؋{(subtotalUSD * Number(exchangeRate)).toFixed(0)}</span>
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <label className="text-gray-700 font-medium text-sm whitespace-nowrap">Discount (%)</label>
                                                    <div className="relative w-24">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={discountPercent}
                                                            onChange={(e) => setDiscountPercent(e.target.value)}
                                                            className="w-full pl-2 pr-6 py-1 text-right border rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1 text-gray-400 text-xs">%</span>
                                                    </div>
                                                </div>
                                                {discountAmountUSD > 0 && (
                                                    <div className="flex justify-between text-green-600 text-sm font-medium">
                                                        <span>Discount Amount</span>
                                                        <span>- ؋{(discountAmountUSD * Number(exchangeRate)).toFixed(0)}</span>
                                                    </div>
                                                )}

                                                <div className="border-t pt-2 flex justify-between items-center">
                                                    <span className="font-bold text-gray-900 text-lg">Total Payable</span>
                                                    <span className="font-bold text-gray-900 text-2xl">؋{(finalTotalUSD * Number(exchangeRate)).toFixed(0)}</span>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-blue-50 rounded-lg text-center">
                                                <p className="text-xs text-blue-500 uppercase">Change Due</p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    ؋{Math.max(0, Number(paidAmountAFG) - (finalTotalUSD * Number(exchangeRate))).toFixed(0)}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                            <div className="flex gap-2">
                                                {['CASH', 'CARD', 'CREDIT'].map((method) => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setPaymentMethod(method as any)}
                                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${paymentMethod === method
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Credit Sale Fields - Show when there's outstanding balance */}
                                        {(Number(paidAmountAFG) < (finalTotalUSD * Number(exchangeRate))) && (
                                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-3">
                                                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                                    {/* @ts-ignore */}
                                                    <AlertTriangle size={18} />
                                                    <span className="text-sm font-bold">Outstanding Balance - Due Date Required</span>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Due Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={dueDate}
                                                        onChange={(e) => setDueDate(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className="block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                                                        required
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={debtNotes}
                                                        onChange={(e) => setDebtNotes(e.target.value)}
                                                        placeholder="Payment terms, agreement details, etc..."
                                                        className="block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (AFG)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500">؋</span>
                                                <input
                                                    type="number"
                                                    value={paidAmountAFG}
                                                    onChange={(e) => setPaidAmountAFG(e.target.value)}
                                                    className="block w-full pl-7 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Balance Analysis */}
                                        {Number(paidAmountAFG) < (total * Number(exchangeRate)) ? (
                                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                                <p className="text-orange-800 font-bold text-sm">Outstanding (Credit): ؋{((total * Number(exchangeRate)) - Number(paidAmountAFG)).toFixed(0)}</p>
                                            </div>
                                        ) : Number(paidAmountAFG) > (total * Number(exchangeRate)) ? (
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <p className="text-blue-800 font-bold text-sm mb-2">Change Due: ؋{(Number(paidAmountAFG) - (total * Number(exchangeRate))).toFixed(0)}</p>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={returnChange}
                                                        onChange={(e) => setReturnChange(e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-blue-900">Return change to customer (Do not credit)</span>
                                                </label>
                                            </div>
                                        ) : null}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (USD to AFG)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-500">؋</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={exchangeRate}
                                                    onChange={(e) => setExchangeRate(e.target.value)}
                                                    className="block w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="z-10 relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>

                                            {!isAddingCustomer ? (
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        {/* @ts-ignore */}
                                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />

                                                        {selectedCustomer ? (
                                                            <div className="flex items-center justify-between w-full pl-10 pr-4 py-2 border rounded-lg bg-blue-50 border-blue-200">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-blue-900">{selectedCustomer.name}</span>
                                                                    {selectedCustomer.displayId && <span className="text-xs font-mono text-blue-600">{selectedCustomer.displayId}</span>}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedCustomer(null);
                                                                        setCustomerId(null);
                                                                        setCustomerSearch('');
                                                                    }}
                                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <input
                                                                    type="text"
                                                                    value={customerSearch}
                                                                    onChange={(e) => {
                                                                        setCustomerSearch(e.target.value);
                                                                        setShowCustomerDropdown(true);
                                                                    }}
                                                                    onFocus={() => setShowCustomerDropdown(true)}
                                                                    placeholder="Search Name or ID..."
                                                                    className="block w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                                />

                                                                {/* Dropdown Results */}
                                                                {showCustomerDropdown && customerSearch && (
                                                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                                        {filteredCustomers.length === 0 ? (
                                                                            <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                                                                        ) : (
                                                                            filteredCustomers.map(c => (
                                                                                <button
                                                                                    key={c.id}
                                                                                    onClick={() => handleSelectCustomer(c)}
                                                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-0 flex justify-between items-center"
                                                                                >
                                                                                    <div>
                                                                                        <div className="font-bold text-gray-900">{c.name}</div>
                                                                                        <div className="text-xs text-gray-500">{c.phone || 'No Phone'}</div>
                                                                                    </div>
                                                                                    {c.displayId && (
                                                                                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                                                            {c.displayId}
                                                                                        </span>
                                                                                    )}
                                                                                </button>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Overlay to close dropdown when clicking outside */}
                                                                {showCustomerDropdown && (
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={() => setShowCustomerDropdown(false)}
                                                                    />
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => setIsAddingCustomer(true)}
                                                        className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition"
                                                    >
                                                        New
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                                                    <p className="text-xs font-bold text-gray-500 uppercase">New Customer</p>
                                                    <input
                                                        type="text"
                                                        value={newCustomerName}
                                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                                        placeholder="Name *"
                                                        className="block w-full px-3 py-2 border rounded-md text-sm"
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newCustomerPhone}
                                                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                                                        placeholder="Phone"
                                                        className="block w-full px-3 py-2 border rounded-md text-sm"
                                                    />
                                                    <input
                                                        type="email"
                                                        value={newCustomerEmail}
                                                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                                                        placeholder="Email (Optional)"
                                                        className="block w-full px-3 py-2 border rounded-md text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleCreateCustomer}
                                                            disabled={!newCustomerName || loading}
                                                            className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            Save & Select
                                                        </button>
                                                        <button
                                                            onClick={() => setIsAddingCustomer(false)}
                                                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-bold hover:bg-gray-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Warning for existing debt */}
                                        {selectedCustomer && (Number(selectedCustomer.outstandingBalance) > 0 || Number(selectedCustomer.outstandingBalanceAFN) > 0) && !showDebtWarning && (
                                            <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                                                {/* @ts-ignore */}
                                                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                                                <div>
                                                    <h4 className="font-bold text-red-800">Has Outstanding Debt</h4>
                                                    <p className="text-sm text-red-700">
                                                        This customer owes <strong>؋{
                                                            selectedCustomer.outstandingBalanceAFN
                                                                ? Number(selectedCustomer.outstandingBalanceAFN).toLocaleString()
                                                                : Math.floor(Number(selectedCustomer.outstandingBalance) * Number(exchangeRate)).toLocaleString()
                                                        }</strong>.
                                                        Confirming this payment will proceed, but be aware of their credit status.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {showDebtWarning ? (
                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                                                    <h4 className="font-bold text-orange-900 text-lg mb-2">Warning: Customer Has Debt</h4>
                                                    <p className="text-orange-800 mb-4">
                                                        {selectedCustomer.name} already owes <strong>؋{
                                                            selectedCustomer.outstandingBalanceAFN
                                                                ? Number(selectedCustomer.outstandingBalanceAFN).toLocaleString()
                                                                : Math.floor(Number(selectedCustomer.outstandingBalance) * Number(exchangeRate)).toLocaleString()
                                                        }</strong>.
                                                        Are you sure you want to proceed with this new transaction?
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setShowDebtWarning(false)}
                                                            className="flex-1 bg-white border border-gray-300 py-3 rounded-lg font-bold hover:bg-gray-50 text-gray-700"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowDebtWarning(false);
                                                                submitTransaction(); // New function for actual submission
                                                            }}
                                                            className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700"
                                                        >
                                                            Yes, Proceed
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 shadow-lg shadow-green-200"
                                            >
                                                {loading ? 'Processing...' : `Confirm Payment (؋${paidAmountAFG})`}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
