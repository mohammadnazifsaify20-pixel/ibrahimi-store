const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth - grouped format
  auth: {
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    register: (email, password, name, role) => ipcRenderer.invoke('auth:register', { email, password, name, role }),
    changePassword: (token, newPassword) => ipcRenderer.invoke('auth:changePassword', { token, newPassword }),
  },
  
  // Products - grouped format
  products: {
    list: (token, search) => ipcRenderer.invoke('products:list', { token, search }),
    create: (token, product) => ipcRenderer.invoke('products:create', { token, product }),
    update: (token, id, product) => ipcRenderer.invoke('products:update', { token, id, product }),
    delete: (token, id) => ipcRenderer.invoke('products:delete', { token, id }),
  },
  
  // Customers - grouped format
  customers: {
    list: (token, search) => ipcRenderer.invoke('customers:list', { token, search }),
    getById: (token, id) => ipcRenderer.invoke('customers:getById', { token, id }),
    create: (token, customer) => ipcRenderer.invoke('customers:create', { token, customer }),
    update: (token, id, customer) => ipcRenderer.invoke('customers:update', { token, id, customer }),
  },
  
  // Sales - grouped format
  sales: {
    list: (token, startDate, endDate) => ipcRenderer.invoke('sales:list', { token, startDate, endDate }),
    getById: (token, id) => ipcRenderer.invoke('sales:getById', { token, id }),
    create: (token, sale) => ipcRenderer.invoke('sales:create', { token, sale }),
    addPayment: (token, invoiceId, amount, method) => ipcRenderer.invoke('sales:addPayment', { token, invoiceId, amount, method }),
  },
  
  // Expenses - grouped format
  expenses: {
    list: (token, startDate, endDate) => ipcRenderer.invoke('expenses:list', { token, startDate, endDate }),
    create: (token, expense) => ipcRenderer.invoke('expenses:create', { token, expense }),
    delete: (token, id, adminPassword) => ipcRenderer.invoke('expenses:delete', { token, id, adminPassword }),
  },
  
  // Reports - grouped format
  reports: {
    dashboard: (token) => ipcRenderer.invoke('reports:dashboard', { token }),
    sales: (token, startDate, endDate) => ipcRenderer.invoke('reports:sales', { token, startDate, endDate }),
  },
  
  // Settings - grouped format
  settings: {
    get: (token) => ipcRenderer.invoke('settings:get', { token }),
    update: (token, settings) => ipcRenderer.invoke('settings:update', { token, settings }),
  },
});

console.log('✅ Preload script completed - electronAPI is now available');
