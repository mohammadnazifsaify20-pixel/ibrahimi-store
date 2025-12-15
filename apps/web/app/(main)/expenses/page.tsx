'use client';

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import AddExpenseModal from '../../../components/AddExpenseModal';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    date: string;
    user: {
        name: string;
    }
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        endDate: new Date().toISOString().split('T')[0] // Today
    });

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses', {
                params: {
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                }
            });
            setExpenses(res.data);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [dateRange]);

    const handleSecureDelete = async (password: string) => {
        if (!deleteId) return;
        // API call with password in body
        // Note: DELETE requests with body can be tricky in some proxies/browsers but Axios supports it.
        // We pass { data: { password } } config to axios.delete
        await api.delete(`/expenses/${deleteId}`, {
            data: { password }
        });
        fetchExpenses();
        setDeleteId(null);
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-500">Track your business expenses</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                >
                    {/* @ts-ignore */}
                    <Plus size={20} />
                    Add Expense
                </button>
            </div>

            {/* Filters & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-gray-500 text-sm font-medium">From:</span>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="border rounded-lg p-2 text-sm w-full md:w-auto"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-gray-500 text-sm font-medium">To:</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="border rounded-lg p-2 text-sm w-full md:w-auto"
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-center">
                    <span className="text-gray-500 text-sm font-medium">Total Expenses (Selected Period)</span>
                    <span className="text-2xl font-bold text-red-600">؋{totalExpenses.toLocaleString()}</span>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading expenses...</td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No expenses found for this period.</td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {format(new Date(expense.date), 'yyyy-MM-dd')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                            {expense.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {expense.user?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-gray-900">
                                            ؋{Number(expense.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setDeleteId(expense.id)}
                                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                {/* @ts-ignore */}
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchExpenses}
            />

            <ConfirmDeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleSecureDelete}
                title="Delete Expense"
                message="This action cannot be undone. Please enter your password to confirm."
            />
        </div>
    );
}

