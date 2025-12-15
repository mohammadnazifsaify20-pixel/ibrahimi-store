// Electron API Adapter for Next.js Frontend
// This replaces the axios API calls with Electron IPC calls

class ElectronAPIAdapter {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
  }

  // Auth
  async login(email, password) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.login({ email, password });
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async register(userData) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.register(userData);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Products
  async getProducts() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getProducts();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async getProduct(id) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getProduct(id);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async createProduct(product) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.createProduct(product);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async updateProduct(id, product) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.updateProduct(id, product);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async deleteProduct(id) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.deleteProduct(id);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async searchProducts(query) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.searchProducts(query);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Customers
  async getCustomers() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getCustomers();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async getCustomer(id) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getCustomer(id);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async createCustomer(customer) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.createCustomer(customer);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async updateCustomer(id, customer) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.updateCustomer(id, customer);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async deleteCustomer(id) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.deleteCustomer(id);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Sales
  async getSales() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getSales();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async getSale(id) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getSale(id);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async createSale(sale) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.createSale(sale);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async deleteSale(id, password) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.deleteSale(id, password);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async receivePayment(data) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.receivePayment(data);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Expenses
  async getExpenses() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getExpenses();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async createExpense(expense) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.createExpense(expense);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async deleteExpense(id, password) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.deleteExpense(id, password);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Reports
  async getDashboardStats() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getDashboardStats();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async getSalesReport(params) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getSalesReport(params);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async getAuditLogs() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getAuditLogs();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  // Settings
  async getSettings() {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.getSettings();
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }

  async updateSettings(settings) {
    if (!this.isElectron) throw new Error('Electron API not available');
    const result = await window.electronAPI.updateSettings(settings);
    if (!result.success) throw new Error(result.message);
    return { data: result.data };
  }
}

// Export singleton instance
if (typeof window !== 'undefined') {
  window.ElectronAPI = new ElectronAPIAdapter();
}

export default ElectronAPIAdapter;
