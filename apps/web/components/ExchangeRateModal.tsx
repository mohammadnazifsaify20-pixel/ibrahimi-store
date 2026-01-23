'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../lib/settingsStore';
import { X, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface ExchangeRateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExchangeRateModal({ isOpen, onClose }: ExchangeRateModalProps) {
    const { exchangeRate, updateExchangeRate, fetchExchangeRate, isLoading } = useSettingsStore();
    const [rate, setRate] = useState<string>(exchangeRate.toString());

    useEffect(() => {
        if (isOpen) {
            fetchExchangeRate();
        }
    }, [isOpen]);

    useEffect(() => {
        setRate(exchangeRate.toString());
    }, [exchangeRate]);

    const handleSave = async () => {
        const newRate = parseFloat(rate);
        if (isNaN(newRate) || newRate <= 0) {
            alert('Please enter a valid rate');
            return;
        }
        await updateExchangeRate(newRate);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-4">Set Exchange Rate</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            USD to AFG Rate
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="w-full pl-4 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">AFG</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Current: $1 = {exchangeRate} AFG
                        </p>
                    </div>

                    <button
                        onClick={async () => {
                            try {
                                const res = await api.post('/settings/fetch-live-rate');
                                setRate(res.data.rate.toString());
                            } catch (error) {
                                alert('Failed to fetch live rate');
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-100 transition border border-green-200"
                    >
                        {/* @ts-ignore */}
                        <RefreshCw size={18} />
                        Auto-Fetch (+1 Margin)
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {isLoading ? 'Updating...' : 'Update Rate'}
                    </button>
                </div>
            </div>
        </div>
    );
}
