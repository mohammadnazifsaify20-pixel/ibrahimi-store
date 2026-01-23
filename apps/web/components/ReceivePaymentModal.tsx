import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, DollarSign } from 'lucide-react';
import api from '../lib/api';
import { useSettingsStore } from '../lib/settingsStore';

interface ReceivePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: {
        id: number;
        name: string;
        outstandingBalance: number;
        outstandingBalanceAFN?: number | null; // Added field
    } | null;
}

export default function ReceivePaymentModal({ isOpen, onClose, onSuccess, customer }: ReceivePaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        if (isOpen) {
            fetchExchangeRate();
            setAmount('');
            setError('');
        }
    }, [isOpen]);

    const rate = Number(exchangeRate) || 70;

    const handleSubmit = async () => {
        if (!customer || !amount || Number(amount) === 0) return;

        setLoading(true);
        setError('');

        try {
            // We assume input is always AFN as per UI label
            const afnAmount = Number(amount);
            const usdAmount = afnAmount / rate;

            // Send both values to ensure accurate ledger updates
            await api.post(`/customers/${customer.id}/payment`, {
                amount: usdAmount,     // Update USD ledger (approx)
                amountAFN: afnAmount, // Update AFN ledger (exact)
                method: 'CASH',
                exchangeRate: rate
            });

            setAmount('');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    if (!customer) return null;

    // Use stored AFN debt if available (System v2), else calculate (System v1)
    const currentBalanceAFN = customer.outstandingBalanceAFN
        ? Number(customer.outstandingBalanceAFN)
        : Number(customer.outstandingBalance) * rate;

    const payingAmountAFG = Number(amount) || 0;
    const newBalanceAFG = currentBalanceAFN - payingAmountAFG;

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
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                                        Receive Payment (AFG)
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Customer</span>
                                        <span className="font-bold text-gray-900">{customer.name}</span>
                                    </div>

                                    <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-red-700 font-medium">Outstanding Balance</span>
                                            <span className="text-xs text-red-500">
                                                {customer.outstandingBalanceAFN ? '(Fixed Price)' : `(Est. @ ${rate})`}
                                            </span>
                                        </div>
                                        <span className="font-bold text-lg text-red-700">؋{Math.floor(currentBalanceAFN).toLocaleString()}</span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Payment Amount (AFG)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500 font-bold">؋</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="block w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-lg"
                                                placeholder="0"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Enter positive for payment, negative for refund.</p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-600">New Balance Preview</span>
                                            <span className={`font-bold ${newBalanceAFG > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ؋{Math.floor(newBalanceAFG).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !amount}
                                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition disabled:opacity-50 shadow-lg shadow-green-200"
                                    >
                                        {loading ? 'Processing...' : 'Confirm Payment'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
