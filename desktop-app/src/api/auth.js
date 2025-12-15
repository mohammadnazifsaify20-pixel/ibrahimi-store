const { getDatabase } = require('../database/wrapper');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ibrahimi-store-desktop-secret-key-2024';

function register(ipcMain) {
  ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
      console.log('🔐 Login attempt for:', email);
      const db = await getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!user) {
        console.log('❌ User not found');
        return { success: false, error: 'Invalid credentials' };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('❌ Password mismatch');
        return { success: false, error: 'Invalid credentials' };
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      
      console.log('✅ Login successful for:', email);
      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:register', async (event, { email, password, name, role }) => {
    try {
      const db = await getDatabase();
      
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = db.prepare(`
        INSERT INTO users (email, password, name, role, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(email, hashedPassword, name, role);

      return { success: true, data: { id: result.lastInsertRowid, email, name, role } };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:changePassword', async (event, { token, newPassword }) => {
    try {
      const db = await getDatabase();
      
      // Decode token to get user ID
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
