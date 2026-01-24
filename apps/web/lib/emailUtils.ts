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

    // Convert Blob to Base64 since EmailJS doesn't support Blob attachments directly in client-side SDK usually
    // Wait, EmailJS browser SDK sends data. 
    // Actually, sending attachments via client-side EmailJS is tricky without backend.
    // However, we can send *LINKS* or we can just send the text receipt.
    // The previous implementation used a backend or just simple text.
    // If the user wants the PDF attached, EmailJS purely client-side has limits (40KB limit or paid tier).

    // Alternative: We download the PDF for the user and send a notification email.
    // Or we try to send it if it's small.

    // For now, let's stick to the previous Desktop logic:
    // It downloaded the PDF locally and sent the email with text details.
    // We can't auto-attach a file from the browser file system to an email without user selection in standard mail clients,
    // but EmailJS might allow base64.

    // Let's implement downloading the PDF + Sending the Email with Receipt Details.

    // 1. Send Email directly without downloading
    // Note: Client-side EmailJS has limits on attachments. 
    // We will send the data params. If you need the PDF attached, you need a backend proxy or paid EmailJS tier with specific config.
    // For now, we removed the download as requested.

    const templateParams = {
        to_name: invoice.customer?.name || 'Customer',
        to_email: invoice.customer?.email,
        invoice_number: invoice.invoiceNumber,
        date: new Date(invoice.date).toLocaleDateString(),
        total_amount: invoice.totalLocal ? invoice.totalLocal : (Number(invoice.total) * (invoice.exchangeRate || 70)).toFixed(0),
        paid_amount: invoice.paidAmount ? (Number(invoice.paidAmount) * (invoice.exchangeRate || 70)).toFixed(0) : '0',
        outstanding_amount: ((Number(invoice.total) - Number(invoice.paidAmount || 0)) * (invoice.exchangeRate || 70)).toFixed(0),
        items_list: invoice.items.map((i: any) => `${i.product?.name || 'Item'} x${i.quantity}`).join('\n')
    };

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
        subject: `Statement of Account - ${customer.name}`,
        statement_date: new Date().toLocaleDateString(),
        total_due: statementData.totalDue,
        transaction_count: statementData.transactionCount,
        message: 'Please find your statement of account details below.'
    };

    return emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
    );
};
