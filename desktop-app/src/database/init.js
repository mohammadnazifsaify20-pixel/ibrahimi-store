const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const bcrypt = require('bcryptjs');

let db;

function getDatabase() {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'ibrahimi-store.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('encoding = "UTF-8"');
  }
  return db;
}

async function initDatabase() {
  const db = getDatabase();

  // Create Users table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customers_display_id ON customers(display_id);
  `);

  // Insert default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hashedPassword = await bcrypt.hash('Samir1379', 10);
    db.prepare(`
      INSERT INTO users (email, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@mns.com', hashedPassword, 'Admin', 'ADMIN');
    
    console.log('✅ Default admin user created');
  }

  // Insert default settings if not exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const defaultAdminPassword = await bcrypt.hash('admin123', 10);
    db.prepare(`
      INSERT INTO settings (id, exchange_rate, tax_rate, company_name, admin_password)
      VALUES (1, 70.0, 0, 'Ibrahimi & Brothers Motor Parts L.L.C', ?)
    `).run(defaultAdminPassword);
    
    console.log('✅ Default settings created');
  }

  console.log('✅ Database initialized successfully');
}

module.exports = {
  getDatabase,
  initDatabase
};
