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
        <div className="min-h-screen bg-white text-black p-4 flex items-start justify-center">
            {/* ID Card Container */}
            <div
                className="border-2 border-black rounded-xl p-4 w-[85.6mm] h-[53.98mm] relative overflow-hidden flex flex-col justify-between"
                style={{ breakInside: 'avoid' }}
            >
                {/* Header */}
                <div className="text-center border-b-2 border-black pb-1 mb-1">
                    <h1 className="text-[9px] font-black uppercase tracking-wider leading-tight">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h1>
                    <h2 className="text-[10px] font-bold font-arabic leading-tight my-0.5">(شرکت پرزه جات ابراهیمی و برادران)</h2>
                    <p className="text-[8px] font-bold bg-black text-white inline-block px-2 rounded-full mt-0.5">VIP CUSTOMER CARD</p>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center items-center py-2">
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
                            <p className="font-mono font-black text-lg">{customer.displayId || customer.id}</p>
                        </div>
                    </div>
                </div>

                {/* Footer / Barcode Placeholder */}
                <div className="text-center text-[8px] pt-1 border-t border-black mt-1">
                    Please present this card for identification
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .min-h-screen, .min-h-screen * {
                        visibility: visible;
                    }
                    .min-h-screen {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}
