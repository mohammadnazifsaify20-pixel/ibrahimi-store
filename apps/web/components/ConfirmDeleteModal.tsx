'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
    title?: string;
    message?: string;
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title = 'Confirm Deletion', message = 'Are you sure you want to delete this item?' }: ConfirmDeleteModalProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await onConfirm(password);
            setPassword('');
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to verify password');
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
                                <div className="flex items-center gap-3 mb-4 text-red-600">
                                    {/* @ts-ignore */}
                                    <AlertTriangle size={24} />
                                    <Dialog.Title as="h3" className="text-lg font-bold leading-6">
                                        {title}
                                    </Dialog.Title>
                                </div>

                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {message}
                                    </p>
                                    <p className="text-sm font-bold text-gray-700 mt-2">
                                        Please enter your password to confirm.
                                    </p>
                                </div>

                                {error && (
                                    <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="mt-4">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full border rounded-md p-2 focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="Admin Password"
                                        autoFocus
                                    />

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || !password}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {loading ? 'Verifying...' : 'Confirm Delete'}
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
