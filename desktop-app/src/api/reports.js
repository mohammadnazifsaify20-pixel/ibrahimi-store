const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('reports:dashboard', async (event, { token } = {}) => {
    try {
      const db = await getDatabase();
      
      const todaySales = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM invoices WHERE date(created_at) = date('now')
      `).get();

      const monthSales = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM invoices WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `).get();

      const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();
      const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
      const outstandingBalance = db.prepare('SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM customers').get();
      const recentSales = db.prepare(`
        SELECT i.*, c.name as customer_name 
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY i.created_at DESC LIMIT 5
      `).all();

      return {
        success: true,
        data: {
          todaySales: todaySales.total,
          monthSales: monthSales.total,
          totalProducts: totalProducts.count,
          totalCustomers: totalCustomers.count,
          outstandingBalance: outstandingBalance.total,
          recentSales
        }
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return { success: false, error: 'Failed to fetch dashboard stats' };
    }
  });

  ipcMain.handle('reports:sales', async (event, { token, startDate, endDate }) => {
    try {
      const db = await getDatabase();
      
      const salesData = db.prepare(`
        SELECT 
          COUNT(*) as invoiceCount,
          COALESCE(SUM(total), 0) as totalSales,
          COALESCE(SUM(total - subtotal), 0) as totalProfit
        FROM invoices i
        WHERE date(created_at) BETWEEN date(?) AND date(?)
      `).get(startDate, endDate);

      return { success: true, data: salesData };
    } catch (error) {
      console.error('Sales report error:', error);
      return { success: false, error: 'Failed to generate sales report' };
    }
  });
}

module.exports = { register };
