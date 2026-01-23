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
                <div
                    id="printable-card"
                    className="border-[3px] border-black rounded-[20px] p-4 w-[85.6mm] h-[53.98mm] relative overflow-hidden flex flex-col items-center bg-white print-card"
                    style={{ breakInside: 'avoid' }}
                >
                    {/* Watermark in background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] z-0">
                        <img src="/logo.png" alt="" className="w-3/4 h-auto" />
                    </div>

                    {/* Top Section */}
                    <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="w-8 h-8 mb-1">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>

                        <h1 className="text-[9px] font-black uppercase text-center leading-tight tracking-wide text-black w-full">
                            IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C
                        </h1>
                        <h2 className="text-[9px] font-bold text-center leading-tight mt-0.5 text-black font-sans">
                            (شرکت پرزه جات ابراهیمی و برادران)
                        </h2>

                        <div className="bg-black text-white px-4 py-[2px] rounded-full mt-1 mb-1 shadow-sm">
                            <p className="text-[7px] font-bold uppercase tracking-wider">VIP CUSTOMER CARD</p>
                        </div>
                    </div>

                    {/* Separator Line */}
                    <div className="relative z-10 w-full h-[2px] bg-black my-0.5"></div>

                    {/* Content Section */}
                    <div className="relative z-10 w-full flex-1 flex flex-col justify-center items-center">
                        <p className="text-[9px] uppercase text-gray-500 font-bold mb-0.5">CUSTOMER NAME</p>
                        <h2 className="text-2xl font-black text-black leading-none text-center px-2 font-sans" dir="auto">
                            {customer.name}
                        </h2>
                    </div>

                    {/* Footer Section */}
                    <div className="relative z-10 w-full flex justify-between items-end mt-1">
                        <div className="text-left">
                            <p className="text-[8px] uppercase text-gray-500 font-bold leading-none mb-0.5">PHONE</p>
                            <p className="text-[10px] font-bold font-mono leading-none">{customer.phone || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] uppercase text-gray-500 font-bold leading-none mb-0.5">CUSTOMER ID</p>
                            <p className="text-[10px] font-bold font-mono leading-none">{customer.displayId || customer.id}</p>
                        </div>
                    </div>
                </div>

                <style jsx global>{`
                @media print {
                    @page {
                        size: 85.6mm 53.98mm; /* Standard ID-1 Credit Card Size */
                        margin: 0;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        visibility: visible !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #card-wrapper,
                    #card-wrapper * {
                        visibility: visible !important;
                    }
                    html, body {
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                    }
                    #card-wrapper {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        background: white !important;
                        z-index: 9999;
                    }
                    #printable-card {
                        width: 85.6mm !important;
                        height: 53.98mm !important;
                        border: none !important; /* Remove border for actual print if edge-to-edge, or keep if needed */
                        margin: 0 !important;
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
