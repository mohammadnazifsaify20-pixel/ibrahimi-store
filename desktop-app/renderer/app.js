// ============= GLOBAL STATE =============
let currentUser = null;
let authToken = null;
let cart = [];
let allProducts = [];
let allCustomers = [];
let allSales = [];
let allExpenses = [];
let currentSettings = null;

// ============= INITIALIZATION =============
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    authToken = token;
    currentUser = JSON.parse(user);
    
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-role').value = currentUser.role?.toUpperCase() || 'USER';
    
    await loadInitialData();
    
    // Set up debounced search handlers
    document.getElementById('pos-search')?.addEventListener('input', debounce(filterPOSProducts, 300));
    document.getElementById('inventory-search')?.addEventListener('input', debounce(filterInventory, 300));
});

async function loadInitialData() {
    // Load essential data first
    await loadProducts();
    await loadCustomers();
    await loadSettings();
    await loadDashboard();
}

// ============= NAVIGATION =============
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    
    document.getElementById(`page-${page}`).style.display = 'block';
    document.getElementById(`nav-${page}`).classList.add('active');
    
    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'pos':
            renderPOSProducts();
            break;
        case 'inventory':
            renderInventory();
            break;
        case 'sales':
            loadSales();
            break;
        case 'customers':
            renderCustomers();
            break;
        case 'expenses':
            loadExpenses();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ============= DASHBOARD =============
async function loadDashboard() {
    try {
        const result = await window.electronAPI.reports.dashboard(authToken);
        
        if (result.success) {
            const { todaySales, monthSales, totalProducts, totalCustomers, outstandingBalance, recentSales } = result.data;
            
            document.getElementById('stat-today-sales').textContent = `؋${todaySales.toFixed(2)}`;
            document.getElementById('stat-month-sales').textContent = `؋${monthSales.toFixed(2)}`;
            document.getElementById('stat-products').textContent = totalProducts;
            document.getElementById('stat-outstanding').textContent = `؋${outstandingBalance.toFixed(2)}`;
            
            const recentList = document.getElementById('recent-sales-list');
            if (recentSales && recentSales.length > 0) {
                recentList.innerHTML = recentSales.map(sale => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                            <div class="font-medium">${sale.invoice_number}</div>
                            <div class="text-sm text-gray-600">${sale.customer_name || 'Walk-in'}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-green-600">؋${sale.total.toFixed(2)}</div>
                            <div class="text-xs text-gray-500">${formatDate(sale.created_at)}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                recentList.innerHTML = '<p class="text-gray-500 text-center">No recent sales</p>';
            }
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// ============= PRODUCTS / INVENTORY =============
async function loadProducts() {
    try {
        const result = await window.electronAPI.products.list(authToken);
        if (result.success) {
            allProducts = result.data;
            renderPOSProducts();
            renderInventory();
        }
    } catch (error) {
        console.error('Load products error:', error);
    }
}

function renderPOSProducts(searchTerm = '') {
    const grid = document.getElementById('pos-products-grid');
    const filtered = allProducts.filter(p => 
        p.is_active && 
        (searchTerm === '' || 
         p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="col-span-3 text-center text-gray-500">No products found</p>';
        return;
    }
    
    // Limit to first 50 products for better performance
    const limitedProducts = filtered.slice(0, 50);
    
    grid.innerHTML = limitedProducts.map(product => `
        <div onclick="addToCart(${product.id})" class="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg transition-all">
            <h4 class="font-bold text-lg mb-1">${product.name}</h4>
            <p class="text-sm text-gray-600 mb-2">${product.brand}</p>
            <div class="flex justify-between items-center">
                <span class="text-xl font-bold text-blue-600">؋${product.sale_price_afn.toFixed(2)}</span>
                <span class="text-sm ${product.quantity_on_hand < 10 ? 'text-red-600' : 'text-gray-600'}">
                    Stock: ${product.quantity_on_hand}
                </span>
            </div>
        </div>
    `).join('');
    
    if (filtered.length > 50) {
        grid.innerHTML += `<p class="col-span-3 text-center text-gray-500 text-sm">Showing 50 of ${filtered.length} products. Use search to narrow down.</p>`;
    }
}

function filterPOSProducts(e) {
    renderPOSProducts(e.target.value);
}

function renderInventory(searchTerm = '') {
    const tbody = document.getElementById('inventory-tbody');
    const filtered = allProducts.filter(p => 
        searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500">No products found</td></tr>';
        return;
    }
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    tempDiv.innerHTML = filtered.map(product => `
        <tr>
            <td>${product.sku}</td>
            <td>${product.name}</td>
            <td>${product.brand}</td>
            <td>${product.category}</td>
            <td>$${product.cost_price.toFixed(2)}</td>
            <td>$${product.sale_price.toFixed(2)} / ؋${product.sale_price_afn.toFixed(2)}</td>
            <td class="${product.quantity_on_hand < 10 ? 'text-red-600 font-bold' : ''}">${product.quantity_on_hand}</td>
            <td>
                <button onclick="editProduct(${product.id})" class="text-blue-600 hover:underline mr-2">Edit</button>
                <button onclick="deleteProduct(${product.id})" class="text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = tempDiv.innerHTML;
}

function filterInventory(e) {
    renderInventory(e.target.value);
}

function openAddProductModal() {
    document.getElementById('product-sku').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-brand').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-cost-price').value = '';
    document.getElementById('product-sale-price').value = '';
    document.getElementById('product-quantity').value = '';
    document.getElementById('product-location').value = '';
    openModal('modal-add-product');
}

async function saveProduct(e) {
    e.preventDefault();
    
    const product = {
        sku: document.getElementById('product-sku').value,
        name: document.getElementById('product-name').value,
        brand: document.getElementById('product-brand').value,
        category: document.getElementById('product-category').value,
        costPrice: parseFloat(document.getElementById('product-cost-price').value),
        salePrice: parseFloat(document.getElementById('product-sale-price').value),
        quantityOnHand: parseInt(document.getElementById('product-quantity').value),
        location: document.getElementById('product-location').value
    };
    
    const result = await window.electronAPI.products.create(authToken, product);
    
    if (result.success) {
        closeModal('modal-add-product');
        await loadProducts();
        alert('Product added successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

async function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('product-sku').value = product.sku;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-brand').value = product.brand;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-cost-price').value = product.cost_price;
    document.getElementById('product-sale-price').value = product.sale_price;
    document.getElementById('product-quantity').value = product.quantity_on_hand;
    document.getElementById('product-location').value = product.location;
    
    openModal('modal-add-product');
    
    const form = document.querySelector('#modal-add-product form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const updatedProduct = {
            sku: document.getElementById('product-sku').value,
            name: document.getElementById('product-name').value,
            brand: document.getElementById('product-brand').value,
            category: document.getElementById('product-category').value,
            costPrice: parseFloat(document.getElementById('product-cost-price').value),
            salePrice: parseFloat(document.getElementById('product-sale-price').value),
            quantityOnHand: parseInt(document.getElementById('product-quantity').value),
            location: document.getElementById('product-location').value
        };
        
        const result = await window.electronAPI.products.update(authToken, id, updatedProduct);
        
        if (result.success) {
            closeModal('modal-add-product');
            form.onsubmit = saveProduct;
            await loadProducts();
            alert('Product updated successfully!');
        } else {
            alert('Error: ' + result.error);
        }
    };
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const result = await window.electronAPI.products.delete(authToken, id);
    
    if (result.success) {
        await loadProducts();
        alert('Product deleted successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

// ============= CART & POS =============
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || product.quantity_on_hand <= 0) {
        alert('Product out of stock!');
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.quantity_on_hand) {
            existingItem.quantity++;
        } else {
            alert('Not enough stock!');
            return;
        }
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.sale_price_afn,
            quantity: 1,
            maxStock: product.quantity_on_hand
        });
    }
    
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    renderCart();
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(i => i.productId === productId);
    if (item) {
        const newQty = Math.max(1, Math.min(quantity, item.maxStock));
        item.quantity = newQty;
        renderCart();
    }
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm('Clear all items from cart?')) {
        cart = [];
        renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Cart is empty</p>';
        totalEl.textContent = '؋0';
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item bg-gray-50 p-3 rounded-lg">
            <div class="flex justify-between items-start mb-2">
                <div class="font-medium">${item.name}</div>
                <button onclick="removeFromCart(${item.productId})" class="text-red-600 hover:text-red-800">×</button>
            </div>
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <button onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})" class="bg-gray-300 px-2 py-1 rounded">-</button>
                    <span class="font-medium">${item.quantity}</span>
                    <button onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})" class="bg-gray-300 px-2 py-1 rounded">+</button>
                </div>
                <div class="font-bold text-green-600">؋${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        </div>
    `).join('');
    
    totalEl.textContent = `؋${total.toFixed(2)}`;
    document.getElementById('checkout-total').textContent = `؋${total.toFixed(2)}`;
}

async function openCheckoutModal() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    // Populate customer dropdown
    const select = document.getElementById('checkout-customer');
    select.innerHTML = '<option value="">Walk-in Customer</option>' +
        allCustomers.map(c => `<option value="${c.id}">${c.name} - ${c.phone}</option>`).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkout-amount').value = total.toFixed(2);
    
    openModal('modal-checkout');
}

async function processCheckout(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('checkout-customer').value;
    const paymentMethod = document.getElementById('checkout-payment-method').value;
    const amountPaid = parseFloat(document.getElementById('checkout-amount').value);
    
    const sale = {
        customerId: customerId || null,
        items: cart,
        paymentMethod,
        amountPaid
    };
    
    const result = await window.electronAPI.sales.create(authToken, sale);
    
    if (result.success) {
        alert(`Sale completed! Invoice: ${result.data.invoiceNumber}`);
        cart = [];
        renderCart();
        closeModal('modal-checkout');
        await loadProducts();
        await loadDashboard();
    } else {
        alert('Error: ' + result.error);
    }
}

// ============= SALES =============
async function loadSales() {
    try {
        const result = await window.electronAPI.sales.list(authToken);
        
        if (result.success) {
            allSales = result.data;
            renderSales();
        }
    } catch (error) {
        console.error('Load sales error:', error);
    }
}

function renderSales() {
    const tbody = document.getElementById('sales-tbody');
    
    if (allSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500">No sales found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allSales.map(sale => {
        const statusClass = sale.payment_status === 'PAID' ? 'badge-success' : 
                           sale.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger';
        
        return `
            <tr>
                <td>${sale.invoice_number}</td>
                <td>${formatDate(sale.created_at)}</td>
                <td>${sale.customer_name || 'Walk-in'}</td>
                <td>؋${sale.total.toFixed(2)}</td>
                <td>؋${sale.amount_paid.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${sale.payment_status}</span></td>
                <td>
                    <button onclick="viewInvoice(${sale.id})" class="text-blue-600 hover:underline mr-2">View</button>
                    ${sale.payment_status !== 'PAID' ? 
                        `<button onclick="openPaymentModal(${sale.id})" class="text-green-600 hover:underline">Receive Payment</button>` 
                        : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function viewInvoice(id) {
    try {
        const result = await window.electronAPI.sales.getById(authToken, id);
        
        if (result.success) {
            const invoice = result.data;
            const content = document.getElementById('invoice-content');
            
            content.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-bold text-lg mb-2">Invoice Information</h4>
                            <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                            <p><strong>Date:</strong> ${formatDate(invoice.created_at)}</p>
                            <p><strong>Customer:</strong> ${invoice.customer_name || 'Walk-in'}</p>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg mb-2">Payment Information</h4>
                            <p><strong>Payment Method:</strong> ${invoice.payment_method || 'N/A'}</p>
                            <p><strong>Status:</strong> <span class="badge ${invoice.payment_status === 'PAID' ? 'badge-success' : invoice.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}">${invoice.payment_status}</span></p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-bold text-lg mb-2">Items</h4>
                        <table class="w-full">
                            <thead>
                                <tr>
                                    <th class="text-left">Product</th>
                                    <th class="text-right">Qty</th>
                                    <th class="text-right">Price</th>
                                    <th class="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoice.items.map(item => `
                                    <tr>
                                        <td>${item.product_name}</td>
                                        <td class="text-right">${item.quantity}</td>
                                        <td class="text-right">؋${item.unit_price_afn.toFixed(2)}</td>
                                        <td class="text-right">؋${item.total_afn.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="border-t pt-4">
                        <div class="flex justify-end space-y-2">
                            <div class="w-64">
                                <div class="flex justify-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>؋${invoice.subtotal.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between mb-2">
                                    <span>Tax:</span>
                                    <span>؋${invoice.tax.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total:</span>
                                    <span>؋${invoice.total.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between text-green-600">
                                    <span>Paid:</span>
                                    <span>؋${invoice.amount_paid.toFixed(2)}</span>
                                </div>
                                ${invoice.payment_status !== 'PAID' ? `
                                    <div class="flex justify-between text-red-600 font-bold">
                                        <span>Outstanding:</span>
                                        <span>؋${(invoice.total - invoice.amount_paid).toFixed(2)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            openModal('modal-invoice-detail');
        }
    } catch (error) {
        console.error('View invoice error:', error);
        alert('Error loading invoice');
    }
}

function printInvoice() {
    window.print();
}

async function openPaymentModal(invoiceId) {
    try {
        const result = await window.electronAPI.sales.getById(authToken, invoiceId);
        
        if (result.success) {
            const invoice = result.data;
            const outstanding = invoice.total - invoice.amount_paid;
            
            document.getElementById('payment-invoice-id').value = invoiceId;
            document.getElementById('payment-invoice-number').textContent = invoice.invoice_number;
            document.getElementById('payment-total').textContent = `؋${invoice.total.toFixed(2)}`;
            document.getElementById('payment-already-paid').textContent = `؋${invoice.amount_paid.toFixed(2)}`;
            document.getElementById('payment-outstanding').textContent = `؋${outstanding.toFixed(2)}`;
            document.getElementById('payment-amount').value = outstanding.toFixed(2);
            
            openModal('modal-receive-payment');
        }
    } catch (error) {
        console.error('Open payment modal error:', error);
    }
}

async function processPayment(e) {
    e.preventDefault();
    
    const invoiceId = parseInt(document.getElementById('payment-invoice-id').value);
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const method = document.getElementById('payment-method').value;
    
    const result = await window.electronAPI.sales.addPayment(authToken, invoiceId, amount, method);
    
    if (result.success) {
        alert('Payment received successfully!');
        closeModal('modal-receive-payment');
        await loadSales();
        await loadDashboard();
    } else {
        alert('Error: ' + result.error);
    }
}

// ============= CUSTOMERS =============
async function loadCustomers() {
    try {
        const result = await window.electronAPI.customers.list(authToken);
        
        if (result.success) {
            allCustomers = result.data;
            renderCustomers();
        }
    } catch (error) {
        console.error('Load customers error:', error);
    }
}

function renderCustomers() {
    const tbody = document.getElementById('customers-tbody');
    
    if (allCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allCustomers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.email || '-'}</td>
            <td class="${customer.outstanding_balance > 0 ? 'text-red-600 font-bold' : 'text-green-600'}">
                ؋${customer.outstanding_balance.toFixed(2)}
            </td>
            <td>
                <button onclick="editCustomer(${customer.id})" class="text-blue-600 hover:underline mr-2">Edit</button>
                <button onclick="viewCustomerDetails(${customer.id})" class="text-green-600 hover:underline">Details</button>
            </td>
        </tr>
    `).join('');
}

function openAddCustomerModal() {
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-email').value = '';
    document.getElementById('customer-address').value = '';
    openModal('modal-add-customer');
}

async function saveCustomer(e) {
    e.preventDefault();
    
    const customer = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        email: document.getElementById('customer-email').value,
        address: document.getElementById('customer-address').value
    };
    
    const result = await window.electronAPI.customers.create(authToken, customer);
    
    if (result.success) {
        closeModal('modal-add-customer');
        await loadCustomers();
        alert('Customer added successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

async function editCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    
    document.getElementById('customer-name').value = customer.name;
    document.getElementById('customer-phone').value = customer.phone;
    document.getElementById('customer-email').value = customer.email || '';
    document.getElementById('customer-address').value = customer.address || '';
    
    openModal('modal-add-customer');
    
    const form = document.querySelector('#modal-add-customer form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const updatedCustomer = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            address: document.getElementById('customer-address').value
        };
        
        const result = await window.electronAPI.customers.update(authToken, id, updatedCustomer);
        
        if (result.success) {
            closeModal('modal-add-customer');
            form.onsubmit = saveCustomer;
            await loadCustomers();
            alert('Customer updated successfully!');
        } else {
            alert('Error: ' + result.error);
        }
    };
}

async function viewCustomerDetails(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    
    alert(`Customer Details:\n\nName: ${customer.name}\nPhone: ${customer.phone}\nEmail: ${customer.email || 'N/A'}\nAddress: ${customer.address || 'N/A'}\nOutstanding Balance: ؋${customer.outstanding_balance.toFixed(2)}`);
}

// ============= EXPENSES =============
async function loadExpenses() {
    try {
        const result = await window.electronAPI.expenses.list(authToken);
        
        if (result.success) {
            allExpenses = result.data;
            renderExpenses();
        }
    } catch (error) {
        console.error('Load expenses error:', error);
    }
}

function renderExpenses() {
    const tbody = document.getElementById('expenses-tbody');
    
    if (allExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">No expenses found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allExpenses.map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td><span class="badge badge-secondary">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td>؋${expense.amount.toFixed(2)}</td>
            <td>
                <button onclick="deleteExpense(${expense.id})" class="text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openAddExpenseModal() {
    document.getElementById('expense-category').value = 'other';
    document.getElementById('expense-description').value = '';
    document.getElementById('expense-amount').value = '';
    openModal('modal-add-expense');
}

async function saveExpense(e) {
    e.preventDefault();
    
    const expense = {
        category: document.getElementById('expense-category').value,
        description: document.getElementById('expense-description').value,
        amount: parseFloat(document.getElementById('expense-amount').value)
    };
    
    const result = await window.electronAPI.expenses.create(authToken, expense);
    
    if (result.success) {
        closeModal('modal-add-expense');
        await loadExpenses();
        alert('Expense added successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

async function deleteExpense(id) {
    const adminPassword = prompt('Enter admin password to delete:');
    if (!adminPassword) return;
    
    const result = await window.electronAPI.expenses.delete(authToken, id, adminPassword);
    
    if (result.success) {
        await loadExpenses();
        alert('Expense deleted successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

// ============= REPORTS =============
async function generateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }
    
    try {
        const result = await window.electronAPI.reports.sales(authToken, startDate, endDate);
        
        if (result.success) {
            document.getElementById('report-total-sales').textContent = `؋${result.data.totalSales.toFixed(2)}`;
            document.getElementById('report-total-profit').textContent = `؋${result.data.totalProfit.toFixed(2)}`;
            document.getElementById('report-invoice-count').textContent = result.data.invoiceCount;
            document.getElementById('report-results').style.display = 'block';
        }
    } catch (error) {
        console.error('Generate report error:', error);
        alert('Error generating report');
    }
}

// ============= SETTINGS =============
async function loadSettings() {
    try {
        const result = await window.electronAPI.settings.get(authToken);
        
        if (result.success) {
            currentSettings = result.data;
            document.getElementById('settings-exchange-rate').value = currentSettings.exchange_rate;
            document.getElementById('settings-tax-rate').value = currentSettings.tax_rate;
            document.getElementById('settings-company-name').value = currentSettings.company_name;
        }
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

async function saveSettings(e) {
    e.preventDefault();
    
    const settings = {
        exchangeRate: parseFloat(document.getElementById('settings-exchange-rate').value),
        taxRate: parseFloat(document.getElementById('settings-tax-rate').value),
        companyName: document.getElementById('settings-company-name').value,
        adminPassword: document.getElementById('settings-admin-password').value || undefined
    };
    
    const result = await window.electronAPI.settings.update(authToken, settings);
    
    if (result.success) {
        await loadSettings();
        document.getElementById('settings-admin-password').value = '';
        alert('Settings saved successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

async function changePassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }
    
    const result = await window.electronAPI.auth.changePassword(authToken, newPassword);
    
    if (result.success) {
        closeModal('modal-change-password');
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        alert('Password changed successfully!');
    } else {
        alert('Error: ' + result.error);
    }
}

// ============= UTILITY FUNCTIONS =============
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


// Debounce function to improve performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}