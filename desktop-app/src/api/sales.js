const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('sales:list', async (event, { token, startDate, endDate } = {}) => {
    try {
      const db = await getDatabase();
      const sales = db.prepare(`
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY i.created_at DESC
      `).all();
      
      return { success: true, data: sales };
    } catch (error) {
      console.error('Get sales error:', error);
      return { success: false, error: 'Failed to fetch sales' };
    }
  });

  ipcMain.handle('sales:getById', async (event, { token, id }) => {
    try {
      const db = await getDatabase();
      
      const invoice = db.prepare(`
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `).get(id);
      
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      const items = db.prepare(`
        SELECT ii.*, p.name as product_name
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `).all(id);

      return { success: true, data: { ...invoice, items } };
    } catch (error) {
      console.error('Get sale error:', error);
      return { success: false, error: 'Failed to fetch sale' };
    }
  });

  ipcMain.handle('sales:create', async (event, { token, sale }) => {
    try {
      const db = await getDatabase();
      
      // Get settings for exchange rate
      const settings = db.prepare('SELECT exchange_rate FROM settings WHERE id = 1').get();
      const exchangeRate = settings.exchange_rate;
      
      const subtotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal;
      const totalAFN = subtotal; // Already in AFN
      const amountPaid = sale.amountPaid || 0;
      const paymentStatus = amountPaid >= total ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

      const lastInvoice = db.prepare('SELECT MAX(id) as maxId FROM invoices').get();
      const invoiceNumber = 'INV-' + String((lastInvoice.maxId || 0) + 1).padStart(6, '0');

      // Get user ID from token (default to 1 for now)
      const userId = 1;

      const invoiceResult = db.prepare(`
        INSERT INTO invoices (
          invoice_number, customer_id, user_id,
          subtotal, tax, discount, total, total_afn, exchange_rate,
          payment_status, payment_method, amount_paid, amount_paid_afn,
          created_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        invoiceNumber, sale.customerId || null, userId,
        subtotal, total, totalAFN, exchangeRate,
        paymentStatus, sale.paymentMethod || 'cash', amountPaid, amountPaid
      );

      const invoiceId = invoiceResult.lastInsertRowid;

      for (const item of sale.items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        
        db.prepare(`
          INSERT INTO invoice_items (
            invoice_id, product_id, sku, product_name,
            quantity, unit_price, unit_price_afn, total, total_afn
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoiceId, item.productId, product.sku, product.name,
          item.quantity, item.price, item.price, 
          item.price * item.quantity, item.price * item.quantity
        );

        db.prepare('UPDATE products SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?')
          .run(item.quantity, item.productId);
      }

      if (sale.customerId) {
        const outstanding = total - amountPaid;
        db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?')
          .run(outstanding, sale.customerId);
      }

      return { success: true, data: { id: invoiceId, invoiceNumber, total, amountPaid, paymentStatus } };
    } catch (error) {
      console.error('Create sale error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:addPayment', async (event, { token, invoiceId, amount, method }) => {
    try {
      const db = await getDatabase();
      
      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      const newAmountPaid = invoice.amount_paid + amount;
      const newStatus = newAmountPaid >= invoice.total ? 'PAID' : 'PARTIAL';

      db.prepare(`
        UPDATE invoices 
        SET amount_paid = ?, amount_paid_afn = ?, payment_status = ?
        WHERE id = ?
      `).run(newAmountPaid, newAmountPaid, newStatus, invoiceId);

      if (invoice.customer_id) {
        db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?')
          .run(amount, invoice.customer_id);
      }

      return { success: true };
    } catch (error) {
      console.error('Add payment error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
