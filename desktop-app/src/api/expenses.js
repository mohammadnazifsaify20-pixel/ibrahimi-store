const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('expenses:list', async (event, { token, startDate, endDate } = {}) => {
    try {
      const db = await getDatabase();
      const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
      return { success: true, data: expenses };
    } catch (error) {
      console.error('Get expenses error:', error);
      return { success: false, error: 'Failed to fetch expenses' };
    }
  });

  ipcMain.handle('expenses:create', async (event, { token, expense }) => {
    try {
      const db = await getDatabase();
      
      const result = db.prepare(`
        INSERT INTO expenses (category, description, amount, date)
        VALUES (?, ?, ?, datetime('now'))
      `).run(expense.category, expense.description, expense.amount);
      
      return { success: true, data: { id: result.lastInsertRowid, ...expense } };
    } catch (error) {
      console.error('Create expense error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('expenses:delete', async (event, { token, id, adminPassword }) => {
    try {
      const db = await getDatabase();
      
      const settings = db.prepare('SELECT admin_password FROM settings WHERE id = 1').get();
      const bcrypt = require('bcryptjs');
      
      const isValid = await bcrypt.compare(adminPassword, settings.admin_password);
      if (!isValid) {
        return { success: false, error: 'Invalid admin password' };
      }
      
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Delete expense error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
