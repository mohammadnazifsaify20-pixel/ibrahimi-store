'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../lib/store';
import api from '../../../lib/api';
import { Lock, User, Plus, Trash2, Key } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

    // Profile State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState('');

    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
    const [userMessage, setUserMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Initial Fetch for Users (if Admin)
    useEffect(() => {
        if (activeTab === 'users' && user?.role === 'ADMIN') {
            fetchUsers();
        }
    }, [activeTab, user]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage('New User Passwords do not match');
            return;
        }

        try {
            await api.put('/users/profile/password', { password: passwordData.newPassword });
            setPasswordMessage('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setPasswordMessage(error.response?.data?.message || 'Failed to update password');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUserMessage('');

        try {
            await api.post('/users', newUser);
            setIsAddUserModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'CASHIER' });
            fetchUsers();
            setUserMessage('User created successfully');
        } catch (error: any) {
            const msg = error.response?.data?.message;
            const errors = error.response?.data?.errors;
            if (errors) {
                setUserMessage(`Error: ${errors.map((e: any) => e.message).join(', ')}`);
            } else {
                setUserMessage(msg || 'Failed to create user');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleResetUserPassword = async (userId: number) => {
        const newPass = prompt('Enter new password for this user:');
        if (!newPass || newPass.length < 6) {
            if (newPass) alert('Password must be at least 6 characters');
            return;
        }

        try {
            await api.put(`/users/${userId}/password`, { password: newPass });
            alert('User password reset successfully');
        } catch (error: any) {
            alert('Failed to reset password');
        }
    };

    // Profile Update State
    const [profileData, setProfileData] = useState({ name: user?.name || '', email: user?.email || '' });
    const [profileMessage, setProfileMessage] = useState('');

    useEffect(() => {
        if (user) {
            setProfileData({ name: user.name, email: user.email });
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.put('/users/profile', profileData);
            setProfileMessage('Profile updated successfully');
            // Optimistically update store if needed, or force reload/re-fetch auth
            // For now, prompt relogin or just show success
        } catch (error: any) {
            setProfileMessage(error.response?.data?.message || 'Failed to update profile');
        }
    };

    // ... existing password change ...

    const handleEditUserClick = (u: any) => {
        setEditingUser(u);
        setIsEditUserModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setLoading(true);
        try {
            await api.put(`/users/${editingUser.id}`, {
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role
            });
            setUserMessage('User updated successfully');
            setIsEditUserModalOpen(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            setUserMessage(error.response?.data?.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    // ... existing handlers ...

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {/* @ts-ignore */}
                    <User className="inline-block mr-2" size={18} />
                    My Profile
                    {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                </button>
                {user?.role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'users' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {/* @ts-ignore */}
                        <Key className="inline-block mr-2" size={18} />
                        User Management
                        {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                    </button>
                )}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            {/* @ts-ignore */}
                            <User size={20} />
                            Profile Details
                        </h2>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            {profileMessage && (
                                <div className={`p-3 rounded text-sm ${profileMessage.includes('success') ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {profileMessage}
                                </div>
                            )}
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                                Update Information
                            </button>
                        </form>
                    </div>

                    {/* Password Change */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            {/* @ts-ignore */}
                            <Lock size={20} />
                            Change Password
                        </h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            {passwordMessage && (
                                <div className={`p-3 rounded text-sm ${passwordMessage.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {passwordMessage}
                                </div>
                            )}
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && user?.role === 'ADMIN' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">All Users</h2>
                        <button
                            onClick={() => setIsAddUserModalOpen(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition font-medium"
                        >
                            {/* @ts-ignore */}
                            <Plus size={18} />
                            Add User
                        </button>
                    </div>

                    {userMessage && <div className="bg-blue-50 text-blue-700 p-3 rounded">{userMessage}</div>}

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-3">
                                            <button
                                                onClick={() => handleResetUserPassword(u.id)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Reset Pass
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-red-500 hover:text-red-700"
                                                disabled={u.id === user.id}
                                                title={u.id === user.id ? "Cannot delete yourself" : "Delete User"}
                                            >
                                                {/* @ts-ignore */}
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add User Modal */}
                    {isAddUserModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                                <h3 className="text-xl font-bold mb-4">Add New User</h3>
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Initial Password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        minLength={6}
                                    />
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="CASHIER">CASHIER</option>
                                        <option value="MANAGER">MANAGER</option>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="WAREHOUSE">WAREHOUSE</option>
                                        <option value="ACCOUNTANT">ACCOUNTANT</option>
                                    </select>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddUserModalOpen(false)}
                                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {loading ? 'Creating...' : 'Create User'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
