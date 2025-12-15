'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import api from '../lib/api';

interface Customer {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    creditLimit: number;
    displayId?: string;
}

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customerToEdit?: Customer | null;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess, customerToEdit }: AddCustomerModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        creditLimit: '0'
    });
    const [error, setError] = useState('');

    // Load data when editing
    useState(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name,
                email: customerToEdit.email || '',
                phone: customerToEdit.phone || '',
                address: customerToEdit.address || '',
                creditLimit: String(customerToEdit.creditLimit) // Convert to string for input
            });
        }
    });

    // Update form when customerToEdit changes (e.g. opening modal)
    // We use a key or effect in parent usually, but let's add an effect here to be safe
    const [prevCustomer, setPrevCustomer] = useState<Customer | null | undefined>(null);
    if (customerToEdit !== prevCustomer) {
        setPrevCustomer(customerToEdit);
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name,
                email: customerToEdit.email || '',
                phone: customerToEdit.phone || '',
                address: customerToEdit.address || '',
                creditLimit: String(customerToEdit.creditLimit)
            });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '', creditLimit: '0' });
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                creditLimit: Number(formData.creditLimit)
            };

            if (customerToEdit) {
                await api.put(`/customers/${customerToEdit.id}`, payload);
            } else {
                await api.post('/customers', payload);
            }

            onSuccess();
            onClose();
            // Only reset if creating, but usually modal unmounts or we want to clear anyway
            if (!customerToEdit) {
                setFormData({ name: '', email: '', phone: '', address: '', creditLimit: '0' });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save customer');
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
                    <div className="fixed inset-0 bg-black/25" />
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
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        {customerToEdit ? 'Edit Customer' : 'Add New Customer'}
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        {/* @ts-ignore */}
                                        <X size={24} />
                                    </button>
                                </div>

                                {error && (
                                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {customerToEdit?.displayId && (
                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                            <span className="text-xs text-gray-500 uppercase font-bold">Customer ID</span>
                                            <div className="font-mono font-bold text-gray-700">{customerToEdit.displayId}</div>
                                            <div className="text-xs text-blue-600 mt-1">ID cannot be changed</div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name</label>
                                        <input name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone (Optional)</label>
                                        <input name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Address (Optional)</label>
                                        <input name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
                                        <input type="number" step="0.01" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                                            {loading ? 'Saving...' : (customerToEdit ? 'Update Customer' : 'Save Customer')}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
