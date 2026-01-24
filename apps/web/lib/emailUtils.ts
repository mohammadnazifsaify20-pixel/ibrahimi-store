import emailjs from '@emailjs/browser';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from './api';

export const getEmailConfig = async () => {
    try {
        const res = await api.get('/settings/email-config');
        if (res.data && res.data.serviceId) {
            return res.data;
        }
        // Fallback to hardcoded values if server config is missing
        return {
            serviceId: 'Ibrahimi_store',
            templateId: 'Ibrahimi',
            publicKey: 'Mwae85yz2W-qmKv9O'
        };
    } catch (error) {
        console.error('Failed to load email config, using default', error);
        return {
            serviceId: 'Ibrahimi_store',
            templateId: 'Ibrahimi',
            publicKey: 'Mwae85yz2W-qmKv9O'
        };
    }
};

export const generateInvoicePDF = async (elementId: string, invoiceNumber: string): Promise<Blob | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        // Temporarily force visibility for capture
        const originalStyle = element.getAttribute('style');

        // Use html2canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            // Optimization for text rendering
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById(elementId);
                if (el) {
                    el.style.display = 'block';
                    // Ensure visible
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Return blob
        return pdf.output('blob');
    } catch (error) {
        console.error('PDF Generation failed', error);
        return null;
    }
};

export const sendInvoiceEmail = async (
    invoice: any,
    pdfBlob: Blob,
    config: { serviceId: string, templateId: string, publicKey: string }
) => {
    if (!config.serviceId || !config.templateId || !config.publicKey) {
        throw new Error('EmailJS configuration missing');
    }

    // Convert Blob to Base64 for EmailJS attachment
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
            const result = reader.result as string;
            if (result) {
                const parts = result.split(',');
                if (parts.length > 1 && typeof parts[1] === 'string') {
                    resolve(parts[1]);
                } else {
                    reject(new Error('Invalid PDF data format'));
                }
            } else {
                reject(new Error('Failed to read PDF blob'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
    });

    const base64Data = (await base64Promise) as string;

    const templateParams = {
        to_name: invoice.customer?.name || 'Customer',
        to_email: invoice.customer?.email,
        email: invoice.customer?.email,
        recipient_email: invoice.customer?.email,
        user_email: invoice.customer?.email,
        reply_to: 'ibrahimistore@gmail.com',

        invoice_number: invoice.invoiceNumber,
        date: new Date(invoice.date).toLocaleDateString(),
        total_amount: invoice.totalLocal ? invoice.totalLocal : (Number(invoice.total) * (invoice.exchangeRate || 70)).toFixed(0),
        paid_amount: invoice.paidAmount ? (Number(invoice.paidAmount) * (invoice.exchangeRate || 70)).toFixed(0) : '0',
        outstanding_amount: ((Number(invoice.total) - Number(invoice.paidAmount || 0)) * (invoice.exchangeRate || 70)).toFixed(0),
        items_list: invoice.items.map((i: any) => `${i.product?.name || 'Item'} x${i.quantity}`).join('\n'),

        // This is for the PDF attachment
        content: base64Data,
        invoice_pdf_name: `Invoice_${invoice.invoiceNumber}.pdf`
    };

    console.log('Sending email with PDF attachment...');

    return emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
    );
};

export const sendStatementEmail = async (
    customer: any,
    pdfBlob: Blob,
    config: { serviceId: string, templateId: string, publicKey: string },
    statementData: { totalDue: string, transactionCount: number }
) => {
    if (!config.serviceId || !config.templateId || !config.publicKey) {
        throw new Error('EmailJS configuration missing');
    }

    // 1. Send Email (No download)
    const templateParams = {
        to_name: customer.name,
        to_email: customer.email,
        // Redundant fields
        email: customer.email,
        recipient_email: customer.email,
        user_email: customer.email,

        subject: `Statement of Account - ${customer.name}`,
        statement_date: new Date().toLocaleDateString(),
        total_due: statementData.totalDue,
        transaction_count: statementData.transactionCount,
        message: 'Please find your statement of account details below.'
    };

    console.log('Sending statement with params:', templateParams);

    return emailjs.send(
        config.serviceId, // It might be safer to use the same Service ID if the statement template is in the same service
        config.templateId,
        templateParams,
        config.publicKey
    );
};
