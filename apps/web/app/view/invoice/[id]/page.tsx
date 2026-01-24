'use client';

import { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { generateInvoicePDF } from '../../../../lib/emailUtils';

export default function PublicInvoicePage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (id) fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/public/invoice/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!invoice) return;
        setDownloading(true);
        try {
            // Wait for images to load if any
            await new Promise(resolve => setTimeout(resolve, 500));

            const pdfBlob = await generateInvoicePDF('invoice-content', invoice.invoiceNumber);
            if (pdfBlob) {
                const url = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to generate PDF');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your invoice...</p>
        </div>
    );

    if (!invoice) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl border text-center max-w-sm">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
                <p className="text-gray-500 mb-6">The link might be expired or the invoice ID is incorrect.</p>
                <div className="text-sm text-gray-400 font-arabic">فاکتور یافت نشد</div>
            </div>
        </div>
    );

    const exchangeRate = Number(invoice.exchangeRate || 70);
    const totalAFN = invoice.totalLocal ? Number(invoice.totalLocal) : (Number(invoice.total) * exchangeRate);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Public View Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-sm border gap-4">
                    <div className="text-center sm:text-left">
                        <h1 className="text-xl font-bold text-gray-900">Ibrahimi Store Official Invoice</h1>
                        <p className="text-sm text-gray-500 font-medium">#{invoice.invoiceNumber} | {format(new Date(invoice.date), 'PPP')}</p>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200 disabled:opacity-50 w-full sm:w-auto justify-center"
                    >
                        {/* @ts-ignore */}
                        <Download size={20} />
                        {downloading ? 'Preparing...' : 'Download PDF / دانلود فاکتور'}
                    </button>
                </div>

                {/* The Invoice Content Area */}
                <div className="bg-white p-6 md:p-12 rounded-2xl shadow-xl border" id="invoice-content">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-gray-50 pb-8 mb-8">
                        <div className="text-left mb-6 md:mb-0">
                            <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tight">IBRAHIMI STORE</h2>
                            <h3 className="text-xl font-bold text-gray-700 mt-1 font-arabic">شرکت پرزه جات ابراهیمی</h3>
                            <div className="mt-4 space-y-1 text-gray-500 font-medium">
                                <p className="text-sm">📍 Khawaja Bahaawuddin - Takhar, AFG</p>
                                <p className="text-sm">📞 Contact: 0706175560</p>
                            </div>
                        </div>
                        <div className="text-left md:text-right w-full md:w-auto">
                            <div className="inline-block px-4 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-black uppercase tracking-widest mb-3">
                                Official Receipt / رسید رسمی
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 leading-none">#{invoice.invoiceNumber}</h3>
                            <p className="text-gray-400 mt-2 font-bold uppercase text-xs tracking-widest">Status: {invoice.status}</p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-10">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Customer Details / جزئیات مشتری</h4>
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                            <p className="text-xl font-black text-gray-900">{invoice.customer?.name || 'Walk-in Customer'}</p>
                            {invoice.customer?.phone && <p className="text-gray-500 font-bold mt-1">{invoice.customer.phone}</p>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left mb-8">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="py-4">Product Details / تفصیلات</th>
                                    <th className="py-4 text-center">Qty / تعداد</th>
                                    <th className="py-4 text-right">Price / قیمت</th>
                                    <th className="py-4 text-right">Total / مجموع</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {invoice.items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="py-5">
                                            <p className="font-black text-gray-900 text-sm">{item.product.name}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-1">{item.product.sku}</p>
                                        </td>
                                        <td className="py-5 text-center font-bold text-gray-600">{item.quantity}</td>
                                        <td className="py-5 text-right font-medium text-gray-600">؋{(Number(item.unitPrice) * exchangeRate).toLocaleString()}</td>
                                        <td className="py-5 text-right font-black text-gray-900">؋{(Number(item.total) * exchangeRate).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-end pt-6 border-t font-medium">
                        <div className="w-full max-w-sm space-y-4">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal / مجموع فرعی</span>
                                <span className="font-bold">؋{(Number(invoice.subtotal) * exchangeRate).toLocaleString()}</span>
                            </div>
                            {Number(invoice.discount) > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount / تخفیف</span>
                                    <span className="font-bold">-؋{(Number(invoice.discount) * exchangeRate).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-3xl font-black text-blue-900 pt-4 border-t-4 border-blue-900 border-double">
                                <span>Total Amount</span>
                                <span className="font-arabic text-left">؋{totalAFN.toLocaleString()}</span>
                            </div>
                            <div className="text-right text-xs text-blue-800 font-bold uppercase tracking-widest">
                                Currency: Afghani (AFN)
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-20 pt-10 border-t-2 border-dashed border-gray-100 text-center">
                        <p className="text-lg font-black text-gray-800 mb-2 italic">~ Thank you for your business! ~</p>
                        <p className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-4">Ibrahimi & Brothers Motor Parts L.L.C</p>
                        <div className="flex justify-center gap-6">
                            <div className="h-0.5 w-12 bg-gray-200 mt-2.5"></div>
                            <p className="text-[10px] text-gray-300 font-bold tracking-widest uppercase">Verified Digital Invoice</p>
                            <div className="h-0.5 w-12 bg-gray-200 mt-2.5"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
