const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('settings:get', async (event, { token } = {}) => {
    try {
      const db = await getDatabase();
      const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
      
      return {
        success: true,
        data: {
          exchangeRate: settings.exchange_rate,
          taxRate: settings.tax_rate,
          companyName: settings.company_name
        }
      };
    } catch (error) {
      console.error('Get settings error:', error);
      return { success: false, error: 'Failed to fetch settings' };
    }
  });

  ipcMain.handle('settings:update', async (event, { token, settings }) => {
    try {
      const db = await getDatabase();
      
      let query = 'UPDATE settings SET exchange_rate = ?, tax_rate = ?, company_name = ?';
      const params = [settings.exchangeRate, settings.taxRate, settings.companyName];

      if (settings.adminPassword) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(settings.adminPassword, 10);
        query += ', admin_password = ?';
        params.push(hashedPassword);
      }

      query += ' WHERE id = 1';
      db.prepare(query).run(...params);
      
      return { success: true };
    } catch (error) {
      console.error('Update settings error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
