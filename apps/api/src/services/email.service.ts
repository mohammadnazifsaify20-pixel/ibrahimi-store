import nodemailer from 'nodemailer';
import { logAction } from './audit.service';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendInvoiceEmail = async (to: string, invoice: any) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Skipping email: SMTP credentials not provided.');
        return;
    }

    try {
        const mailOptions = {
            from: `"Ibrahimi Store" <${process.env.SMTP_USER}>`,
            to,
            subject: `Invoice #${invoice.invoiceNumber} from Ibrahimi Store`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Thank you for your purchase!</h2>
                    <p>Dear ${invoice.customer?.name || 'Customer'},</p>
                    <p>Here is the summary of your recent purchase:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left;">Invoice Number</th>
                            <td style="padding: 10px;">${invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <th style="padding: 10px; text-align: left;">Date</th>
                            <td style="padding: 10px;">${new Date(invoice.date).toLocaleDateString()}</td>
                        </tr>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left;">Total Amount</th>
                            <td style="padding: 10px; font-weight: bold;">؋${(Number(invoice.total) * 70).toFixed(0)}</td>
                        </tr>
                    </table>

                    <p style="margin-top: 20px;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard/sales/${invoice.id}" 
                           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                           View Full Invoice
                        </a>
                    </p>

                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                        If you have any questions, please contact us.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Invoice email sent:', info.messageId);

        // Log to Audit System
        // Assuming user 0 (System) since this is automated
        await logAction(0, 'EMAIL_SENT', 'Invoice', invoice.id, {
            recipient: to,
            messageId: info.messageId,
            status: 'Success'
        });

        return info;
    } catch (error: any) {
        console.error('Error sending invoice email:', error);

        await logAction(0, 'EMAIL_FAILED', 'Invoice', invoice.id, {
            recipient: to,
            error: error.message
        });
    }
};
