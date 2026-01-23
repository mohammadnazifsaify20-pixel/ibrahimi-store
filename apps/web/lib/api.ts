import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't logout for shop-balance password validation failures
            const isShopBalanceEndpoint = error.config?.url?.includes('/shop-balance');

            if (!isShopBalanceEndpoint) {
                localStorage.removeItem('token');
                localStorage.removeItem('auth-storage');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
