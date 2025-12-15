'use client';

import { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import { Search, ShieldAlert, History } from 'lucide-react';

interface AuditLog {
    id: number;
    action: string;
    entity: string;
    entityId: string;
    details: string | null;
    timestamp: string;
    user: {
        name: string;
        email: string;
        role: string;
    } | null;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.user && log.user.name.toLowerCase().includes(search.toLowerCase())) ||
        log.entity.toLowerCase().includes(search.toLowerCase())
    );

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-700 bg-red-100';
        if (action.includes('CREATE')) return 'text-green-700 bg-green-100';
        if (action.includes('UPDATE')) return 'text-blue-700 bg-blue-100';
        return 'text-gray-700 bg-gray-100';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {/* @ts-ignore */}
                    <History size={28} />
                    Audit Logs
                </h1>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div className="relative max-w-md w-full">
                        {/* @ts-ignore */}
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Filter by action, user, or entity..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-gray-500">Showing last 100 actions</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading logs...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No logs found.</td></tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{log.user ? log.user.name : 'System'}</div>
                                            <div className="text-xs text-gray-500">{log.user ? log.user.role : 'AUTO'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {log.entity} <span className="text-gray-400">#{log.entityId}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs max-w-xs truncate" title={log.details || ''}>
                                            {log.details || '-'}
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
