'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AICommandModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState('');
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const toggleModal = () => setIsOpen(!isOpen);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;

        setLoading(true);
        setResponse(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/ai/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ command })
            });
            const data = await res.json();
            setResponse(data);
        } catch (error) {
            console.error(error);
            setResponse({ type: 'ERROR', message: 'Failed to process command' });
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!response?.payload) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/ai/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: response.action,
                    payload: response.payload
                })
            });
            const data = await res.json();
            setResponse(data); // Show success message
        } catch (error) {
            console.error(error);
            setResponse({ type: 'ERROR', message: 'Failed to execute command' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={toggleModal}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group"
                title="AI Command"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition bg-gray-800 text-white text-xs px-2 py-1 rounded">Ask AI</div>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative border border-gray-200 dark:border-gray-700">
                        <button onClick={toggleModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            ✕
                        </button>

                        <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                            AI Assistant
                        </h2>

                        <div className="mb-4 min-h-[100px] max-h-[300px] overflow-y-auto">
                            {!response && !loading && <p className="text-gray-500">How can I help you? Try "Find brake pads" or "Set stock for SKU-123 to 50"</p>}

                            {loading && (
                                <div className="flex items-center space-x-2 text-indigo-500">
                                    <span className="animate-spin">✦</span>
                                    <span>Thinking...</span>
                                </div>
                            )}

                            {response && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <p className="font-medium">{response.message}</p>
                                    </div>

                                    {response.type === 'SEARCH_RESULT' && response.data && (
                                        <div className="space-y-2">
                                            {response.data.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-gray-600 last:border-0">
                                                    <div>
                                                        <div className="font-bold">{item.name}</div>
                                                        <div className="text-xs text-gray-500">SKU: {item.sku} | Stock: {item.quantityOnHand}</div>
                                                    </div>
                                                    <div className="text-sm font-mono">${item.salePrice}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {response.type === 'CONFIRMATION_NEEDED' && (
                                        <div className="flex space-x-3 mt-2">
                                            <button
                                                onClick={handleExecute}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                                disabled={loading}
                                            >
                                                Confirm Update
                                            </button>
                                            <button
                                                onClick={() => setResponse(null)}
                                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="relative">
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="Type a command..."
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                disabled={loading}
                            >
                                ➝
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
