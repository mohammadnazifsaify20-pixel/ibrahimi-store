// Electron API wrapper that uses IPC instead of HTTP
declare global {
  interface Window {
    electronAPI?: any;
  }
}

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

// Token management
let authToken: string | null = null;

if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('token');
}

// API wrapper that works in both browser (HTTP) and Electron (IPC)
class ElectronAPI {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private handleAuthError() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
  }

  // Auth
  async login(email: string, password: string) {
    if (isElectron) {
      const result = await window.electronAPI.auth.login(email, password);
      if (result.success && result.data.token) {
        localStorage.setItem('token', result.data.token);
      }
      return result;
    }
    // Fallback to HTTP (for web version)
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return { success: response.ok, data };
  }

  async register(email: string, password: string, name: string, role: string) {
    if (isElectron) {
      return await window.electronAPI.auth.register(email, password, name, role);
    }
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    });
    return { success: response.ok, data: await response.json() };
  }

  // Products
  async getProducts(search?: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.products.list(token, search);
    }
    const url = search ? `http://localhost:5000/api/products?search=${search}` : 'http://localhost:5000/api/products';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async createProduct(product: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.products.create(token, product);
    }
    const response = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(product),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async updateProduct(id: number, product: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.products.update(token, id, product);
    }
    const response = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(product),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async deleteProduct(id: number) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.products.delete(token, id);
    }
    const response = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  // Customers
  async getCustomers(search?: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.customers.list(token, search);
    }
    const url = search ? `http://localhost:5000/api/customers?search=${search}` : 'http://localhost:5000/api/customers';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async createCustomer(customer: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.customers.create(token, customer);
    }
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(customer),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async updateCustomer(id: number, customer: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.customers.update(token, id, customer);
    }
    const response = await fetch(`http://localhost:5000/api/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(customer),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async getCustomerById(id: number) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.customers.getById(token, id);
    }
    const response = await fetch(`http://localhost:5000/api/customers/${id}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  // Sales
  async getSales(startDate?: string, endDate?: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.sales.list(token, startDate, endDate);
    }
    let url = 'http://localhost:5000/api/sales';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async createSale(sale: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.sales.create(token, sale);
    }
    const response = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(sale),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async getSaleById(id: number) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.sales.getById(token, id);
    }
    const response = await fetch(`http://localhost:5000/api/sales/${id}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async addPayment(invoiceId: number, amount: number, method: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.sales.addPayment(token, invoiceId, amount, method);
    }
    const response = await fetch(`http://localhost:5000/api/sales/${invoiceId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ amount, method }),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  // Expenses
  async getExpenses(startDate?: string, endDate?: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.expenses.list(token, startDate, endDate);
    }
    let url = 'http://localhost:5000/api/expenses';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async createExpense(expense: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.expenses.create(token, expense);
    }
    const response = await fetch('http://localhost:5000/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(expense),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async deleteExpense(id: number, adminPassword: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.expenses.delete(token, id, adminPassword);
    }
    const response = await fetch(`http://localhost:5000/api/expenses/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ adminPassword }),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  // Reports
  async getDashboardStats() {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.reports.dashboard(token);
    }
    const response = await fetch('http://localhost:5000/api/reports/dashboard', {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async getSalesReport(startDate: string, endDate: string) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.reports.sales(token, startDate, endDate);
    }
    const response = await fetch(`http://localhost:5000/api/reports/sales?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  // Settings
  async getSettings() {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.settings.get(token);
    }
    const response = await fetch('http://localhost:5000/api/settings', {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }

  async updateSettings(settings: any) {
    if (isElectron) {
      const token = this.getToken();
      return await window.electronAPI.settings.update(token, settings);
    }
    const response = await fetch('http://localhost:5000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(settings),
    });
    if (response.status === 401) this.handleAuthError();
    return { success: response.ok, data: await response.json() };
  }
}

export const electronAPI = new ElectronAPI();
export { isElectron };
