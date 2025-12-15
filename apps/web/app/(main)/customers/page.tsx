'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { Plus, Search, User, CreditCard, Package, RotateCcw } from 'lucide-react';
import AddCustomerModal from '../../../components/AddCustomerModal';
import PasswordConfirmModal from '../../../components/PasswordConfirmModal';
import clsx from 'clsx';

interface Customer {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    outstandingBalance: string | number;
    creditLimit: string | number;
    displayId?: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers', { params: { status: activeTab } });
            setCustomers(res.data);
            setSelectedIds(new Set()); // Reset selection
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [activeTab]);

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingCustomer(null);
    };

    const handleDeleteClick = (customer: Customer) => {
        // Toggle Active Status (Archive/Restore)
        // We reuse the delete flow but change the endpoint if archiving? 
        // Or should we keep hard delete for admin?
        // User requested "Archive List". So single action should be Archive.
        // Let's implement toggle status directly instead of modal for single item.
        // Wait, bulk delete is hard delete. 
        // Let's change the trash icon to Archive icon for active, and Restore for archived.
        // And keep hard delete for Bulk? Or disable hard delete?
        // "if i want to send a customer to the archive so i need an archive list too"
        // I will change the single action to Archive/Restore.
        toggleStatus(customer);
    };

    const toggleStatus = async (customer: Customer) => {
        const action = activeTab === 'active' ? 'archive' : 'restore';
        if (!confirm(`Are you sure you want to ${action} ${customer.name}?`)) return;

        try {
            await api.put(`/customers/${customer.id}/toggle-status`);
            fetchCustomers();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.size === 0) return;
        setIsDeleteModalOpen(true);
        // We use the same modal, but logic will detect bulk mode if customerToDelete is null but selectedIds > 0
    };

    const handleConfirmDelete = async (password: string) => {
        setIsDeleting(true);
        try {
            if (customerToDelete) {
                // Single Delete
                await api.delete(`/customers/${customerToDelete.id}`, {
                    data: { password }
                });
                setCustomerToDelete(null);
            } else if (selectedIds.size > 0) {
                // Bulk Delete
                const res = await api.post('/customers/bulk-delete', {
                    ids: Array.from(selectedIds),
                    password
                });
                alert(res.data.message); // Show summary
                setSelectedIds(new Set());
            }

            setIsDeleteModalOpen(false);
            fetchCustomers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete customer(s)');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Management</h1>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'active'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'archived'
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Archived
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 items-start">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDeleteClick}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-bold"
                        >
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsAddModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        {/* @ts-ignore */}
                        <Plus size={20} />
                        Add Customer
                    </button>
                </div>
            </div>

            <AddCustomerModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchCustomers}
                // @ts-ignore
                customerToEdit={editingCustomer}
            />

            <PasswordConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setCustomerToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title={customerToDelete ? "Delete Customer" : `Delete ${selectedIds.size} Customers`}
                message={customerToDelete
                    ? `Are you sure you want to delete ${customerToDelete?.name}? This action cannot be undone.`
                    : `Are you sure you want to delete ${selectedIds.size} customers? Customers with sales history will be skipped.`}
                confirmText={customerToDelete ? "Delete Customer" : "Delete Selected"}
                isLoading={isDeleting}
            />

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <div className="relative max-w-md">
                        {/* @ts-ignore */}
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search customers by name or email..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Outstanding Credit</th>
                                <th className="px-6 py-4">Credit Limit</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading customers...</td></tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No customers found.</td></tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(customer.id)}
                                                onChange={() => handleSelectOne(customer.id)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {customer.name[0]?.toUpperCase()}
                                                </div>
                                                {customer.name}
                                                {/* @ts-ignore */}
                                                {customer.displayId && (
                                                    <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
                                                        {/* @ts-ignore */}
                                                        {customer.displayId}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{customer.email || '-'}</span>
                                                <span className="text-xs text-gray-400">{customer.phone}</span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 font-medium ${Number(customer.outstandingBalance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ؋{Math.floor(Number(customer.outstandingBalance) * 70).toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            ؋{(Number(customer.creditLimit) * 70).toFixed(0)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={`/customers/${customer.id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"
                                            >
                                                History
                                            </a>
                                            <button onClick={() => handleEdit(customer)} className="text-gray-400 hover:text-gray-600 text-sm font-medium mr-4">Edit</button>
                                            <button
                                                onClick={() => handleDeleteClick(customer)}
                                                className={clsx(
                                                    "p-2 hover:bg-gray-100 rounded-lg transition",
                                                    activeTab === 'active' ? "text-red-500" : "text-green-600"
                                                )}
                                                title={activeTab === 'active' ? "Archive Customer" : "Restore Customer"}
                                            >
                                                {/* @ts-ignore */}
                                                {activeTab === 'active' ? <Package size={18} /> : <RotateCcw size={18} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
