const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const bcrypt = require('bcryptjs');

let db;
let SQL;

async function getDatabase() {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'ibrahimi-store.db');
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    // Set UTF-8 encoding for proper Persian/Farsi/Dari character support
    db.run('PRAGMA encoding = "UTF-8"');
    
    // Save database changes to file periodically
    setInterval(() => {
      saveDatabase(dbPath);
    }, 5000); // Save every 5 seconds
  }
  return db;
}

function saveDatabase(dbPath) {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Graceful shutdown
process.on('exit', () => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ibrahimi-store.db');
  saveDatabase(dbPath);
});

async function initDatabase() {
  const database = await getDatabase();

  // Create Users table
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'CASHIER' CHECK(role IN ('ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Products table
  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      compatibility TEXT,
      cost_price REAL NOT NULL,
      sale_price REAL NOT NULL,
      sale_price_afn REAL,
      quantity_on_hand INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 5,
      location TEXT,
      barcode TEXT UNIQUE,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Customers table
  database.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_id TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      outstanding_balance_afn REAL DEFAULT 0,
      payment_terms TEXT,
      is_vip INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Invoices (Sales) table
  database.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      user_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      total_afn REAL NOT NULL,
      exchange_rate REAL NOT NULL,
      payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
      payment_method TEXT,
      amount_paid REAL DEFAULT 0,
      amount_paid_afn REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create Invoice Items table
  database.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_price_afn REAL,
      total REAL NOT NULL,
      total_afn REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Create Payments table
  database.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      amount_afn REAL NOT NULL,
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  // Create Expenses table
  database.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create Audit Logs table
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      user_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create Settings table
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      exchange_rate REAL DEFAULT 70.0,
      tax_rate REAL DEFAULT 0,
      company_name TEXT DEFAULT 'Ibrahimi Store',
      company_address TEXT,
      company_phone TEXT,
      admin_password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_customers_display_id ON customers(display_id)`);

  // Insert default admin user if no users exist
  try {
    const userCountResult = database.exec('SELECT COUNT(*) as count FROM users');
    const userCount = userCountResult.length > 0 ? userCountResult[0].values[0][0] : 0;
    
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('Samir1379', 10);
      const stmt = database.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
      stmt.run(['admin@mns.com', hashedPassword, 'Admin', 'ADMIN']);
      stmt.free();
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.log('Admin user may already exist');
  }

  // Insert default settings if not exists
  try {
    const settingsCountResult = database.exec('SELECT COUNT(*) as count FROM settings');
    const settingsCount = settingsCountResult.length > 0 ? settingsCountResult[0].values[0][0] : 0;
    
    if (settingsCount === 0) {
      const defaultAdminPassword = await bcrypt.hash('admin123', 10);
      const stmt = database.prepare('INSERT INTO settings (id, exchange_rate, tax_rate, company_name, admin_password) VALUES (?, ?, ?, ?, ?)');
      stmt.run([1, 70.0, 0, 'Ibrahimi & Brothers Motor Parts L.L.C', defaultAdminPassword]);
      stmt.free();
      console.log('✅ Default settings created');
    }
  } catch (error) {
    console.log('Settings may already exist');
  }

  // Save database after initialization
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ibrahimi-store.db');
  saveDatabase(dbPath);

  console.log('✅ Database initialized successfully');
}

module.exports = {
  getDatabase,
  initDatabase,
  saveDatabase
};
