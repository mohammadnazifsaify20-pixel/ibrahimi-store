'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import AddCustomerModal from '../../../../components/AddCustomerModal';
import ReceivePaymentModal from '../../../../components/ReceivePaymentModal';
import { ChevronLeft, Edit, Wallet, CreditCard, ShoppingBag, DollarSign } from 'lucide-react';
import { useSettingsStore } from '../../../../lib/settingsStore';

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [customer, setCustomer] = useState<any>(null);
    const [creditHistory, setCreditHistory] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewImageData, setPreviewImageData] = useState<string>('');
    const [pdfInstance, setPdfInstance] = useState<any>(null);
    const { exchangeRate, fetchExchangeRate } = useSettingsStore();

    useEffect(() => {
        fetchCustomer();
        fetchCreditHistory();
        fetchTransactions();
        fetchExchangeRate();
    }, [params.id]);

    const fetchCustomer = async () => {
        try {
            const res = await api.get(`/customers/${params.id}`);
            setCustomer(res.data);
        } catch (error) {
            console.error('Failed to fetch customer', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCreditHistory = async () => {
        try {
            const res = await api.get(`/debts`, { params: { customerId: params.id } });
            setCreditHistory(res.data);
        } catch (error) {
            console.error('Failed to fetch credit history', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await api.get(`/sales`, { params: { customerId: params.id } });
            setTransactions(res.data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        }
    };

    const generatePDFCard = async () => {
        setGeneratingPDF(true);
        try {
            // Dynamically import libraries to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            // Create temporary card element
            const cardHTML = `
                <div style="width: 323.15px; height: 204px; background: white; border: 2px solid black; border-radius: 16px; padding: 16px; position: relative; font-family: Arial, sans-serif;">
                    <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 8px;">
                        <h1 style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; line-height: 1.2;">IBRAHIMI AND BROTHERS MOTOR PARTS L.L.C</h1>
                        <h2 style="font-size: 12px; font-weight: bold; margin: 4px 0; line-height: 1.2;">(شرکت پرزه جات ابراهیمی و برادران)</h2>
                        <p style="font-size: 10px; font-weight: bold; background: black; color: white; display: inline-block; padding: 2px 8px; border-radius: 12px; margin: 4px 0;">VIP CUSTOMER CARD</p>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 8px 0;">
                        <div style="text-center; width: 100%;">
                            <p style="font-size: 12px; text-transform: uppercase; color: #666; font-weight: bold; margin: 0 0 4px 0;">Customer Name</p>
                            <h2 style="font-size: 24px; font-weight: bold; margin: 0; padding: 0 8px;">${customer.name}</h2>
                        </div>
                        <div style="margin-top: 16px; display: flex; justify-content: space-between; width: 100%; padding: 0 16px;">
                            <div style="text-align: left;">
                                <p style="font-size: 12px; text-transform: uppercase; color: #666; font-weight: bold; margin: 0 0 4px 0;">Store Contact</p>
                                <p style="font-family: 'Courier New', monospace; font-weight: bold; font-size: 14px; margin: 0;">+971 50 123 4567</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 12px; text-transform: uppercase; color: #666; font-weight: bold; margin: 0 0 4px 0;">Customer ID</p>
                                <p style="font-family: 'Courier New', monospace; font-weight: 900; font-size: 18px; margin: 0;">${customer.displayId || `EQ${String(customer.id).padStart(6, '0')}`}</p>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; font-size: 10px; padding-top: 8px; border-top: 1px solid black; margin-top: 8px;">
                        Please present this card for identification
                    </div>
                </div>
            `;

            // Create temporary container
            const container = document.createElement('div');
            container.innerHTML = cardHTML;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            // Generate canvas from HTML
            const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
                scale: 3,
                backgroundColor: '#ffffff'
            });

            // Remove temporary container
            document.body.removeChild(container);

            // Create PDF (85.6mm x 53.98mm = credit card size)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98]
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);

            // Store preview data and PDF instance
            setPreviewImageData(imgData);
            setPdfInstance(pdf);
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const downloadPDF = () => {
        if (pdfInstance) {
            pdfInstance.save(`${customer.name}-VIP-Card.pdf`);
            setShowPreviewModal(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!customer) return <div className="p-8 text-center">Customer not found</div>;

    const rate = Number(exchangeRate) || 70;

    // Display Logic for Debt: Use Fixed AFN if exists, else estimate
    const displayDebtAFN = customer.outstandingBalanceAFN
        ? Number(customer.outstandingBalanceAFN)
        : Number(customer.outstandingBalance || 0) * rate;

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <AddCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchCustomer}
                customerToEdit={customer}
            />

            <ReceivePaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={fetchCustomer}
                customer={customer}
            />

            <button onClick={() => router.back()} className="flex items-center text-gray-600 mb-6 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back to Customers
            </button>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
                        {/* @ts-ignore */}
                        {customer.displayId && (
                            <span className="bg-blue-100 text-blue-800 text-lg px-3 py-1 rounded-lg font-mono font-bold">
                                {/* @ts-ignore */}
                                {customer.displayId}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={generatePDFCard}
                            disabled={generatingPDF}
                            className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-black transition shadow-sm disabled:opacity-50"
                        >
                            {/* @ts-ignore */}
                            <CreditCard size={18} />
                            {generatingPDF ? 'Generating...' : 'Show VIP Card'}
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition border"
                        >
                            {/* @ts-ignore */}
                            <Edit size={16} />
                            Edit Details
                        </button>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm ml-3"
                        >
                            {/* @ts-ignore */}
                            <Wallet size={18} />
                            Receive Payment
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-600">
                    <div>
                        <span className="block text-sm text-gray-400">Email</span>
                        {customer.email || 'N/A'}
                    </div>
                    <div>
                        <span className="block text-sm text-gray-400">Phone</span>
                        {customer.phone || 'N/A'}
                    </div>
                    <div>
                        <span className="block text-sm text-gray-400">Current Debt</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`font-bold text-xl ${displayDebtAFN > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ؋{Math.round(displayDebtAFN).toLocaleString()}
                            </span>
                            {customer.outstandingBalanceAFN && <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">Fixed</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Credit History Section */}
            {creditHistory.length > 0 && (
                <>
                    <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">Credit/Debt History</h2>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Description</th>
                                    <th className="px-6 py-4 font-medium">Original (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Paid (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Remaining (AFG)</th>
                                    <th className="px-6 py-4 font-medium">Due Date</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {creditHistory.map((credit: any) => (
                                    <tr key={credit.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(credit.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 font-medium">
                                                {credit.notes || 'Credit Sale'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Invoice: {credit.invoice?.invoiceNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ؋{Math.round(Number(credit.originalAmountAFN)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-medium">
                                            ؋{Math.round(Number(credit.paidAmountAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            ؋{Math.round(Number(credit.remainingBalanceAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(credit.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${credit.status === 'SETTLED' ? 'bg-blue-100 text-blue-700' :
                                                credit.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                    credit.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                {credit.status === 'SETTLED' ? 'PAID' : credit.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* All Transactions Section - Combined Shopping & Debts */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8 flex items-center gap-2">
                <ShoppingBag size={24} />
                All Transaction History
            </h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Invoice/Ref</th>
                            <th className="px-6 py-4 font-medium">Total (AFG)</th>
                            <th className="px-6 py-4 font-medium">Paid (AFG)</th>
                            <th className="px-6 py-4 font-medium">Balance (AFG)</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.length === 0 && creditHistory.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No transactions found</td>
                            </tr>
                        ) : (
                            <>
                                {/* Shopping Transactions */}
                                {transactions.map((inv: any) => (
                                    <tr key={`sale-${inv.id}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(inv.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                <ShoppingBag size={16} />
                                                Shopping
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-blue-600 hover:text-blue-800 transition">
                                            <a href={`/dashboard/sales/${inv.id}`} className="hover:underline">
                                                {inv.invoiceNumber}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ؋{Math.round(Number(inv.totalLocal || inv.total * 70)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-medium">
                                            ؋{Math.round(Number(inv.paidAmount) * 70).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            ؋{Math.round(Number(inv.outstandingAmount) * 70).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {/* Debt Transactions */}
                                {creditHistory.map((credit: any) => (
                                    <tr key={`debt-${credit.id}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(credit.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                <DollarSign size={16} />
                                                Debt/Loan
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono">
                                            {credit.invoice?.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ؋{Math.round(Number(credit.originalAmountAFN)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-medium">
                                            ؋{Math.round(Number(credit.paidAmountAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            ؋{Math.round(Number(credit.remainingBalanceAFN || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${credit.status === 'SETTLED' ? 'bg-blue-100 text-blue-700' :
                                                credit.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                    credit.status === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                }`}>
                                                {credit.status === 'SETTLED' ? 'PAID' : credit.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* VIP Card Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">VIP Customer Card Preview</h3>
                                <p className="text-sm text-gray-600 mt-1">Review the card before downloading</p>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex justify-center bg-gray-100 p-8 rounded-lg">
                            <img
                                src={previewImageData}
                                alt="VIP Card Preview"
                                className="max-w-full h-auto shadow-2xl rounded-lg border-4 border-white"
                                style={{ maxHeight: '400px' }}
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>✓ Store Contact:</strong> +971 50 123 4567<br />
                                <strong>✓ Customer ID:</strong> {customer.displayId || `EQ${String(customer.id).padStart(6, '0')}`}<br />
                                <strong>✓ Card Size:</strong> Credit card size (85.6mm x 53.98mm)
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Close Preview
                            </button>
                            <button
                                onClick={downloadPDF}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <CreditCard size={20} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
