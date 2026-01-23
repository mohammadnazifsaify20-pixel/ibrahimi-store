import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Lock, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

interface ReturnItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoice: any;
}

export default function ReturnItemsModal({ isOpen, onClose, onSuccess, invoice }: ReturnItemsModalProps) {
    const [adminPassword, setAdminPassword] = useState('');
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuantityChange = (itemId: number, qty: string, max: number) => {
        const value = parseInt(qty);
        if (isNaN(value) || value < 0) {
            const newQtys = { ...returnQuantities };
            delete newQtys[itemId];
            setReturnQuantities(newQtys);
            return;
        }
        if (value > max) return; // Prevent exceeding
        setReturnQuantities({ ...returnQuantities, [itemId]: value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const itemsToReturn = Object.entries(returnQuantities)
                .map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity }))
                .filter(i => i.quantity > 0);

            if (itemsToReturn.length === 0) {
                setError('Please select at least one item to return.');
                setLoading(false);
                return;
            }

            await api.post(`/sales/${invoice.id}/return`, {
                items: itemsToReturn,
                adminPassword
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to process return');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Refund Preview
    const refundTotal = invoice.items.reduce((acc: number, item: any) => {
        const qty = returnQuantities[item.id] || 0;
        return acc + (Number(item.unitPrice) * qty);
    }, 0);

    const refundTotalAFN = refundTotal * (invoice.exchangeRate || 70);

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
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 mb-4">
                                Return Items
                            </Dialog.Title>

                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                                    Select items to return to stock. Refund will be calculated automatically.
                                </div>

                                <div className="max-h-60 overflow-y-auto border rounded-lg">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 font-bold text-gray-700">
                                            <tr>
                                                <th className="p-3">Item</th>
                                                <th className="p-3">Sold</th>
                                                <th className="p-3 w-24">Return</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {invoice.items.map((item: any) => {
                                                const returnable = item.quantity - (item.returnedQuantity || 0);
                                                if (returnable <= 0) return null;

                                                return (
                                                    <tr key={item.id}>
                                                        <td className="p-3">
                                                            <div className="font-medium">{item.product.name}</div>
                                                            <div className="text-xs text-gray-500">{item.product.sku}</div>
                                                        </td>
                                                        <td className="p-3">{returnable}</td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={returnable}
                                                                className="w-full border rounded px-2 py-1"
                                                                placeholder="0"
                                                                value={returnQuantities[item.id] || ''}
                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value, returnable)}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>Refund Amount:</span>
                                    <span className="text-red-600">؋{Math.floor(refundTotalAFN).toLocaleString()}</span>
                                </div>

                                <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                                    <label className="block text-sm font-bold text-red-900 mb-1">
                                        Admin Key Required
                                    </label>
                                    <div className="relative">
                                        {/* @ts-ignore */}
                                        <Lock className="absolute left-3 top-2.5 text-red-400" size={16} />
                                        <input
                                            type="password"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                            placeholder="Enter Admin Password"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

                                <div className="flex gap-3 justify-end mt-4">
                                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || refundTotal <= 0 || !adminPassword}
                                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Confirm Return'}
                                    </button>
                                </div>
                            </div>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
