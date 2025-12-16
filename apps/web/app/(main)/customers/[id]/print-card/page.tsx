'use client';

import { useEffect, useState } from 'react';
import api from '../../../../../lib/api';
import { useSettingsStore } from '../../../../../lib/settingsStore';

export default function PrintCustomerCardPage({ params }: { params: { id: string } }) {
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomer();
    }, [params.id]);

    const fetchCustomer = async () => {
        try {
            const res = await api.get(`/customers/${params.id}`);
            console.log('Customer data:', res.data);
            setCustomer(res.data);
            setTimeout(() => {
                window.print();
            }, 500);
        } catch (error) {
            console.error('Failed to fetch customer', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!customer) return <div>Customer not found</div>;

    return (
        <>
        <div className="min-h-screen bg-white text-black p-4 flex items-center justify-center" id="card-wrapper">
            {/* ID Card Container */}
            <div
                id="printable-card"
                className="border-2 border-black rounded-xl p-4 w-[85.6mm] h-[53.98mm] relative overflow-hidden flex flex-col justify-between bg-white print-card"
                style={{ breakInside: 'avoid' }}
            >
                {/* Background Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
                    <img src="/logo.png" alt="" className="h-full w-auto" style={{ filter: 'blur(1px)' }} />
                </div>
                {/* Header with Logo */}
                <div className="text-center border-b-2 border-black pb-1 mb-1 relative z-10">
                    <div className="flex justify-center mb-1">
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                    </div>
                    <h1 className="text-[9px] font-black uppercase tracking-wider leading-tight">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h1>
                    <h2 className="text-[10px] font-bold font-arabic leading-tight my-0.5">(شرکت پرزه جات ابراهیمی و برادران)</h2>
                    <p className="text-[8px] font-bold bg-black text-white inline-block px-2 rounded-full mt-0.5">VIP CUSTOMER CARD</p>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center items-center py-2 relative z-10">
                    <div className="text-center w-full">
                        <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Customer Name</p>
                        <h2 className="text-xl font-bold truncate px-2">{customer.name}</h2>
                    </div>

                    <div className="mt-3 flex justify-between w-full px-4 items-end">
                        <div className="text-left">
                            <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Phone</p>
                            <p className="font-mono font-bold text-sm">{customer.phone || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase text-gray-600 font-bold mb-0.5">Customer ID</p>
                            <p className="font-mono font-black text-lg">{customer.displayId || `EQ${String(customer.id).padStart(6, '0')}`}</p>
                        </div>
                    </div>
                </div>

                {/* Footer / Barcode Placeholder */}
                <div className="text-center text-[8px] pt-1 border-t border-black mt-1 relative z-10">
                    Please present this card for identification
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: 85.6mm 53.98mm;
                        margin: 0;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        overflow: hidden !important;
                    }
                    body > div:not(#card-wrapper) {
                        display: none !important;
                    }
                    #card-wrapper {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        min-height: 53.98mm !important;
                        max-height: 53.98mm !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    #printable-card {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        display: flex !important;
                    }
                    #printable-card * {
                        display: block !important;
                    }
                    #printable-card p,
                    #printable-card h1,
                    #printable-card h2,
                    #printable-card div {
                        color: black !important;
                        opacity: 1 !important;
                    }
                    #printable-card img {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
        </>
    );
}
