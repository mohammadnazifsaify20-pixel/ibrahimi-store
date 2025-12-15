import { create } from 'zustand';
import api from './api';

interface SettingsState {
    exchangeRate: number;
    isLoading: boolean;
    fetchExchangeRate: () => Promise<void>;
    updateExchangeRate: (rate: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    exchangeRate: 70, // Default fallback
    isLoading: false,

    fetchExchangeRate: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get('/settings/exchange-rate');
            set({ exchangeRate: res.data.rate });
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error);
            // Keep default if fail
        } finally {
            set({ isLoading: false });
        }
    },

    updateExchangeRate: async (rate: number) => {
        set({ isLoading: true });
        try {
            const res = await api.post('/settings/exchange-rate', { rate });
            set({ exchangeRate: res.data.rate });
        } catch (error) {
            console.error('Failed to update exchange rate:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));
