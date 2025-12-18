'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingCart, User, FileText, LogOut, Menu, X, ArrowLeft, Home, ClipboardList, Settings, History, DollarSign, Banknote, CreditCard } from 'lucide-react';
import clsx from 'clsx';
import ExchangeRateModal from '../../components/ExchangeRateModal';
import { useSettingsStore } from '../../lib/settingsStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, token, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        setIsClient(true);
        fetchExchangeRate();

        // Poll for rate updates every minute
        const interval = setInterval(() => {
            fetchExchangeRate();
        }, 60000);

        if (!localStorage.getItem('token')) {
            router.push('/login');
        }

        // Auto-Logout Logic (35 Minutes Inactivity)
        let logoutTimer: NodeJS.Timeout;

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            logoutTimer = setTimeout(() => {
                console.log('Session timeout due to inactivity');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
            }, 35 * 60 * 1000); // 35 minutes
        };

        // Events to detect activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize timer
        resetTimer();

        return () => {
            clearInterval(interval);
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [router]);

    if (!isClient) return null; // Avoid hydration mismatch

    if (!user && !token) return null;

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Inventory', href: '/inventory', icon: Package },
        { name: 'POS', href: '/pos', icon: ShoppingCart },
        { name: 'Sales', href: '/dashboard/sales', icon: ClipboardList },
        { name: 'Customers', href: '/customers', icon: User },
        { name: 'Debts', href: '/debts', icon: CreditCard },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Expenses', href: '/expenses', icon: Banknote },
        { name: 'Audit Logs', href: '/admin/logs', icon: History },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 md:relative md:translate-x-0 print:hidden",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center px-6 border-b">
                    <img src="/logo.png" alt="IBRAHIMI & BROS Logo" className="h-12 w-auto" />
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                {/* @ts-ignore */}
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t bg-white">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            logout();
                            localStorage.removeItem('token');
                            router.push('/login');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        {/* @ts-ignore */}
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Background Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0">
                    <img src="/logo.png" alt="" className="w-1/2 h-auto" style={{ filter: 'blur(2px)' }} />
                </div>
                {/* Mobile Header */}
                <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 relative print:hidden">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 md:hidden">
                            {/* @ts-ignore */}
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Home"
                            >
                                {/* @ts-ignore */}
                                <Home size={20} />
                                <span className="hidden sm:inline font-medium">Home</span>
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Go Back"
                            >
                                {/* @ts-ignore */}
                                <ArrowLeft size={20} />
                                <span className="hidden sm:inline font-medium">Back</span>
                            </button>
                            <button
                                onClick={() => setIsExchangeModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                title="Exchange Rate"
                            >
                                {/* @ts-ignore */}
                                <DollarSign size={20} />
                                <span className="hidden sm:inline font-bold">Rate: {exchangeRate}</span>
                            </button>
                        </div>
                    </div>

                    {/* Centered Title */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 text-center w-full max-w-[50%] hidden md:block">
                        <h1 className="text-lg font-bold text-gray-900 truncate">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h1>
                    </div>

                    <span className="text-sm font-bold md:hidden truncate max-w-[150px]">IBRAHIMI STORE</span>
                    
                    {/* Logo on top right */}
                    <div className="flex items-center">
                        <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 md:p-10 lg:p-12 relative z-10">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>

            <ExchangeRateModal isOpen={isExchangeModalOpen} onClose={() => setIsExchangeModalOpen(false)} />
        </div>
    );
}
