const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('customers:list', async (event, { token, search } = {}) => {
    try {
      const db = await getDatabase();
      let query = 'SELECT * FROM customers';
      let params = [];
      
      if (search) {
        query += ' WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
        const searchPattern = `%${search}%`;
        params = [searchPattern, searchPattern, searchPattern];
      }
      
      query += ' ORDER BY name';
      
      const customers = params.length > 0 
        ? db.prepare(query).all(...params)
        : db.prepare(query).all();
        
      return { success: true, data: customers };
    } catch (error) {
      console.error('Get customers error:', error);
      return { success: false, error: 'Failed to fetch customers' };
    }
  });

  ipcMain.handle('customers:getById', async (event, { token, id }) => {
    try {
      const db = await getDatabase();
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      return { success: true, data: customer };
    } catch (error) {
      console.error('Get customer error:', error);
      return { success: false, error: 'Failed to fetch customer' };
    }
  });

  ipcMain.handle('customers:create', async (event, { token, customer }) => {
    try {
      const db = await getDatabase();
      
      const result = db.prepare(`
        INSERT INTO customers (name, phone, email, address, outstanding_balance)
        VALUES (?, ?, ?, ?, 0)
      `).run(
        customer.name,
        customer.phone,
        customer.email || null,
        customer.address || null
      );
      
      return { success: true, data: { id: result.lastInsertRowid, ...customer } };
    } catch (error) {
      console.error('Create customer error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:update', async (event, { token, id, customer }) => {
    try {
      const db = await getDatabase();
      
      db.prepare(`
        UPDATE customers SET name = ?, phone = ?, email = ?, address = ?
        WHERE id = ?
      `).run(
        customer.name, customer.phone, customer.email || null, customer.address || null, id
      );
      
      return { success: true, data: { id, ...customer } };
    } catch (error) {
      console.error('Update customer error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
