'use client';

import { useEffect, useState } from 'react';
import api from '../../../../../lib/api';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Printer, RotateCcw, Mail } from 'lucide-react';
import ReturnItemsModal from '../../../../../components/ReturnItemsModal';
import { getEmailConfig, generateInvoicePDF, sendInvoiceEmail } from '../../../../../lib/emailUtils';

interface InvoiceItem {
    id: number;
    product: { name: string; sku: string };
    quantity: number;
    returnedQuantity: number;
    unitPrice: number;
    total: number;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    customer: { name: string; phone?: string; address?: string; displayId?: string } | null;
    user: { name: string };
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paidAmount: number;
    outstandingAmount: number;
    status: string;
    exchangeRate: number;
    totalLocal?: number;
}


export default function InvoicePage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [emailProcessing, setEmailProcessing] = useState(false);

    useEffect(() => {
        if (id) fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/sales/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmailInvoice = async () => {
        if (!invoice) return;

        // Load config
        const config = await getEmailConfig();
        if (!config || !config.serviceId) {
            alert('Email settings not configured. Please go to Settings > Email Config.');
            return;
        }

        if (!invoice.customer?.displayId && !invoice.customer?.name.includes('@')) {
            // weak check for email existence, better to check field if schema had it in this view
            // But based on interface, customer is { name: string; phone?: string... }
            // Let's prompt if we can't find email.
        }

        // Always prompt to confirm or edit the email
        const currentEmail = (invoice.customer as any)?.email || '';
        const customerEmail = prompt('Confirm or Enter Email Address:', currentEmail);

        if (!customerEmail) return; // User cancelled or entered empty string

        if (!confirm(`Send invoice to ${customerEmail}?`)) return;

        setEmailProcessing(true);
        try {
            // We use the existing #invoice-content div
            const pdfBlob = await generateInvoicePDF('invoice-content', invoice.invoiceNumber); // Use visible content

            if (pdfBlob) {
                // Create a temporary object with email for sending
                const invoiceWithEmail = { ...invoice, customer: { ...invoice.customer, email: customerEmail } };
                await sendInvoiceEmail(invoiceWithEmail, pdfBlob, config);
                alert('Email sent successfully!');
            } else {
                alert('Failed to generate PDF');
            }
        } catch (error) {
            console.error('Failed to email', error);
            alert('Failed to send email');
        } finally {
            setEmailProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading invoice...</div>;
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

    // Calculate amounts in AFN
    const exchangeRate = Number(invoice.exchangeRate || 70);
    const subtotalAFN = Number(invoice.subtotal) * exchangeRate;
    const taxAFN = Number(invoice.tax) * exchangeRate;
    const discountAFN = Number(invoice.discount) * exchangeRate;
    const totalAFN = invoice.totalLocal ? Number(invoice.totalLocal) : (Number(invoice.total) * exchangeRate);
    const paidAFN = Number(invoice.paidAmount) * exchangeRate;
    const outstandingAFN = Number(invoice.outstandingAmount) * exchangeRate;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
                <button
                    onClick={() => setIsReturnModalOpen(true)}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-bold"
                >
                    {/* @ts-ignore */}
                    <RotateCcw size={20} />
                    Return Items
                </button>
                <button
                    onClick={handleEmailInvoice}
                    disabled={emailProcessing}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold"
                >
                    {emailProcessing ? 'Sending...' : (
                        <>
                            {/* @ts-ignore */}
                            <Mail size={20} />
                            Email Invoice
                        </>
                    )}
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {/* @ts-ignore */}
                    <Printer size={20} />
                    Print Invoice
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border print:shadow-none print:border-none print:p-0" id="invoice-content">
                <table className="w-full">
                    <thead className="table-header-group">
                        <tr>
                            <td colSpan={4}>
                                {/* Header - Repeats on every page */}
                                <div className="flex justify-between items-start border-b pb-2 mb-2 pt-1">
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900 uppercase">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h2>
                                        <h3 className="text-sm font-bold text-gray-800 font-arabic mt-0">(شرکت پرزه جات ابراهیمی و برادران)</h3>
                                        <p className="text-gray-500 text-[10px] font-bold">Khawaja Bahaawuddin - Bandar Takhar | تماس: 0706175560</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-2">
                                            <span className="bg-gray-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest pb-1.5 pt-1">Customer Receipt / رسید مشتری</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                                        <p className="text-gray-500 mt-1">Date / تاریخ: {format(new Date(invoice.date), 'PPP')}</p>
                                        <p className="text-gray-500">Status / وضعیت: <span className="font-bold uppercase text-gray-900">{invoice.status}</span></p>
                                    </div>
                                </div>

                                {/* Customer & Bill To */}
                                <div className="grid grid-cols-2 gap-2 mb-2 text-left">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Bill To / صورت حساب برای</h4>
                                        <p className="font-bold text-gray-900 leading-tight text-sm">{invoice.customer?.name || 'Walk-in Customer'}</p>
                                        {/* @ts-ignore */}
                                        {invoice.customer?.displayId && <p className="text-gray-600 font-mono text-[9px]">ID: {invoice.customer.displayId}</p>}
                                        {invoice.customer?.phone && <p className="text-gray-600 text-[10px] text-left">Phone: {invoice.customer.phone}</p>}
                                        {(invoice.customer as any)?.email && <p className="text-gray-600 text-[10px] text-left">Email: {(invoice.customer as any).email}</p>}
                                        {invoice.customer?.address && <p className="text-gray-600 text-[10px] text-left line-clamp-1">Address: {invoice.customer.address}</p>}
                                    </div>
                                    <div className="text-right">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Served By / فروشنده</h4>
                                        <p className="font-medium text-gray-900 text-xs">{invoice.user.name}</p>
                                    </div>
                                </div>

                                {/* Inner Table Header for Items */}
                                <div className="border-b border-gray-200 font-bold text-xs uppercase grid grid-cols-12 gap-4 pb-1 mb-2 text-gray-600 text-left">
                                    <div className="col-span-4">Item / جنس</div>
                                    <div className="col-span-2 text-right">Qty / تعداد</div>
                                    <div className="col-span-3 text-right">Price (AFG) / قیمت</div>
                                    <div className="col-span-3 text-right">Total (AFG) / مجموع</div>
                                </div>
                            </td>
                        </tr>
                    </thead>
                    <tbody className="table-row-group">
                        {invoice.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0 page-break-inside-avoid">
                                <td colSpan={4}>
                                    <div className="grid grid-cols-12 gap-2 py-1 items-center">
                                        <div className="col-span-4">
                                            <p className="font-medium text-gray-900 text-left text-xs leading-tight">{item.product.name}</p>
                                            <p className="text-[9px] text-gray-500 text-left leading-tight italic">{item.product.sku}</p>
                                        </div>
                                        <div className="col-span-2 text-right text-gray-600 text-xs">
                                            {item.quantity}
                                        </div>
                                        <div className="col-span-3 text-right text-gray-600 text-xs font-mono">
                                            ؋{(Number(item.unitPrice) * Number(invoice.exchangeRate || 70)).toLocaleString()}
                                        </div>
                                        <div className="col-span-3 text-right font-bold text-gray-900 text-xs font-mono">
                                            ؋{(Number(item.total) * Number(invoice.exchangeRate || 70)).toLocaleString()}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer Section (Totals + Terms) - Keep together */}
                <div className="page-break-inside-avoid mt-4">
                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-gray-600 text-sm">
                                <span>Subtotal (AFG):</span>
                                <span className="font-medium">؋{Math.floor(subtotalAFN).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 text-xs border-b pb-1">
                                <span>Total Qty:</span>
                                <span className="font-medium">{invoice.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
                            </div>
                            {Number(invoice.tax) > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax / مالیه:</span>
                                    <span className="font-medium">؋{Math.floor(taxAFN).toLocaleString()}</span>
                                </div>
                            )}
                            {Number(invoice.discount) > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount / تخفیف:</span>
                                    <span className="font-medium">-؋{Math.floor(discountAFN).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-3">
                                <span>Total (AFG) / مجموع:</span>
                                <span>؋{Math.floor(totalAFN).toLocaleString()}</span>
                            </div>

                            {/* Return / Refund Info */}
                            {(() => {
                                const returnedVal = invoice.items.reduce((acc, item) => acc + ((item.returnedQuantity || 0) * Number(item.unitPrice)), 0);
                                const returnedValAFN = returnedVal * exchangeRate;

                                if (returnedVal > 0) {
                                    return (
                                        <>
                                            <div className="flex justify-between text-red-600 border-b pb-2">
                                                <span>Less Returns / برگشتی:</span>
                                                <span>-؋{Math.floor(returnedValAFN).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
                                                <span>Net Total (AFG) / مجموع خالص:</span>
                                                <span>؋{Math.floor((Number(invoice.total) - returnedVal) * exchangeRate).toLocaleString()}</span>
                                            </div>
                                        </>
                                    );
                                }
                                return null;
                            })()}

                            <div className="flex justify-between text-gray-600 pt-2 border-t mt-2">
                                <span>Paid Amount (AFG) / پرداخت شده:</span>
                                <span className="font-medium text-green-600">؋{Math.floor(paidAFN).toLocaleString()}</span>
                            </div>
                            {Number(invoice.outstandingAmount) > 0 && (
                                <div className="flex justify-between text-red-600 font-bold">
                                    <span>Balance Due (AFG) / باقیمانده:</span>
                                    <span>؋{Math.floor(outstandingAFN).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t space-y-2 text-center">
                        <p className="text-gray-700 font-bold">Thank you for your business! / از خریداری شما متشکریم</p>
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-4 print:border-yellow-300">
                            <p className="text-red-600 font-bold text-sm">
                                ⚠️ RETURN POLICY / قانون برگشت جنس ⚠️
                            </p>
                            <p className="text-gray-800 font-medium text-sm mt-2" style={{ direction: 'rtl' }}>
                                جنس فروخته شده بعد از بیست و چهار (24) ساعت برگردانده نمیشود
                            </p>
                            <p className="text-gray-700 text-xs mt-1">
                                Items sold cannot be returned after 24 hours
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ReturnItemsModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onSuccess={fetchInvoice}
                invoice={invoice}
            />
        </div>
    );
}
