// Admin Panel JavaScript
const API_BASE = window.location.origin + '/api';
let authToken = localStorage.getItem('adminToken');
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showLoginPage();
    }

    setupEventListeners();
    setupProductButton();
});

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Menu navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateToPage(page);
        });
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Change password
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);

    // Order status filter
    document.getElementById('orderStatusFilter')?.addEventListener('change', loadOrders);

    // Account filters are handled inline with onchange in HTML
}

// Setup Product Button với event listener
function setupProductButton() {
    const btn = document.getElementById('btnAddProduct');
    if (btn) {
        // Xóa event listener cũ nếu có
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Thêm event listener mới
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔥 Button clicked!');
            
            // Gọi function thêm sản phẩm
            showAddProductForm();
        });
        console.log('✅ Product button setup complete');
    } else {
        console.log('⚠️ Button not found');
    }
}

// Global variables for product form
let productFormVariants = [];

// Close Product Modal - SIMPLE VERSION
window.closeProductModal = function() {
    console.log('🔴 CLOSE MODAL CALLED');
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    productFormVariants = [];
    console.log('✅ MODAL CLOSED');
    return false;
};

// Show Add Product Form
function showAddProductForm() {
    productFormVariants = []; // Reset
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (!modalBody) {
        showNotification('Lỗi: Không tìm thấy modal', 'error');
        return;
    }
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 2rem; color: #333;">🛍️ Thêm Sản Phẩm Mới</h2>
        
        <form id="productFormMain">
            <div class="form-group">
                <label>Tên sản phẩm *</label>
                <input type="text" id="productName" class="form-input" required>
            </div>

            <div class="form-group">
                <label>Danh mục *</label>
                <input type="text" id="productCategory" class="form-input" placeholder="VD: Streaming, Music, Design..." required>
            </div>

            <div class="form-group">
                <label>Mô tả</label>
                <textarea id="productDescription" class="form-textarea" rows="3"></textarea>
            </div>

            <div class="form-group">
                <label>Icon/Emoji</label>
                <input type="text" id="productIcon" class="form-input" placeholder="🎬" style="font-size: 1.5rem;">
            </div>

            <div class="form-group">
                <label>Tính năng (mỗi dòng 1 tính năng)</label>
                <textarea id="productFeatures" class="form-textarea" rows="4" placeholder="Tính năng 1&#10;Tính năng 2&#10;Tính năng 3"></textarea>
            </div>

            <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e2e8f0;">

            <h3 style="margin-bottom: 1rem; color: #333;">Các Gói/Options</h3>
            <div id="variantsListMain" style="margin-bottom: 1rem;"></div>
            
            <button type="button" class="btn btn-secondary" id="btnAddVariant" style="margin-bottom: 2rem;">
                <i class="fas fa-plus"></i> Thêm gói
            </button>

            <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e2e8f0;">

            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-primary" style="flex: 1;">
                    <i class="fas fa-save"></i> Lưu sản phẩm
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.closeProductModal(); return false;">
                    <i class="fas fa-times"></i> Hủy
                </button>
            </div>
        </form>
    `;
    
    // Show modal - SIMPLE
    modal.style.display = 'flex';
    modal.classList.add('show');
    console.log('✅ Modal displayed');
    
    // Thêm 1 gói mặc định
    window.addProductVariant();
    
    // Setup buttons và form (sau khi DOM render)
    setTimeout(() => {
        // Form submit
        const form = document.getElementById('productFormMain');
        if (form) {
            form.onsubmit = function(e) {
                e.preventDefault();
                saveProductMain(e);
            };
        }
        
        // Add variant button
        const btnAddVariant = document.getElementById('btnAddVariant');
        if (btnAddVariant) {
            btnAddVariant.onclick = function(e) {
                e.preventDefault();
                window.addProductVariant();
            };
        }
    }, 100);
}

// Add variant (Make global)
window.addProductVariant = function() {
    console.log('➕ Adding variant...');
    productFormVariants.push({
        name: '',
        duration_value: 1,
        duration_unit: 'month',
        price: 0
    });
    renderProductVariants();
}

// Make it global
window.addProductVariant = addProductVariant;

// Render variants
function renderProductVariants() {
    const container = document.getElementById('variantsListMain');
    
    if (!container) return;
    
    if (productFormVariants.length === 0) {
        container.innerHTML = '<p style="color:#666; padding: 1rem; background: #f7fafc; border-radius: 8px;">Chưa có gói. Click "Thêm gói" để tạo.</p>';
        return;
    }

    container.innerHTML = productFormVariants.map((v, i) => `
        <div style="background: #f7fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <strong style="color: #333;">Gói ${i + 1}</strong>
                <button type="button" class="btn btn-danger btn-remove-variant" data-index="${i}" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem;">Tên gói *</label>
                    <input type="text" class="form-input variant-name" data-index="${i}" value="${v.name}" placeholder="VD: Gói 1 tháng" required>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem;">Giá (VNĐ) *</label>
                    <input type="number" class="form-input variant-price" data-index="${i}" value="${v.price}" placeholder="50000" required>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem;">Thời gian *</label>
                    <input type="number" class="form-input variant-duration" data-index="${i}" value="${v.duration_value}" min="1" required>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.875rem;">Đơn vị *</label>
                    <select class="form-input variant-unit" data-index="${i}">
                        <option value="day" ${v.duration_unit === 'day' ? 'selected' : ''}>Ngày</option>
                        <option value="month" ${v.duration_unit === 'month' ? 'selected' : ''}>Tháng</option>
                        <option value="year" ${v.duration_unit === 'year' ? 'selected' : ''}>Năm</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
    
    // Setup event listeners for all inputs
    document.querySelectorAll('.variant-name').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            productFormVariants[index].name = this.value;
        });
    });
    
    document.querySelectorAll('.variant-price').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            productFormVariants[index].price = parseInt(this.value);
        });
    });
    
    document.querySelectorAll('.variant-duration').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            productFormVariants[index].duration_value = parseInt(this.value);
        });
    });
    
    document.querySelectorAll('.variant-unit').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            productFormVariants[index].duration_unit = this.value;
        });
    });
    
    document.querySelectorAll('.btn-remove-variant').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm('Xóa gói này?')) {
                productFormVariants.splice(index, 1);
                renderProductVariants();
            }
        });
    });
}

// updateProductVariant và removeProductVariant giờ được handle bằng event listeners trong renderProductVariants

// Save product
async function saveProductMain(e) {
    e.preventDefault();

    if (productFormVariants.length === 0) {
        showNotification('Vui lòng thêm ít nhất 1 gói!', 'error');
        return;
    }

    // Validate variants
    for (let v of productFormVariants) {
        if (!v.name || !v.price || !v.duration_value) {
            showNotification('Vui lòng điền đầy đủ thông tin các gói', 'error');
            return;
        }
    }

    const data = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        icon: document.getElementById('productIcon').value,
        features: document.getElementById('productFeatures').value.split('\n').filter(f => f.trim()),
        variants: productFormVariants,
        status: 'active'
    };

    try {
        showNotification('Đang lưu...', 'info');

        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('✅ Đã thêm sản phẩm thành công!', 'success');
            closeProductModal();
            loadProducts(); // Reload products list
        } else {
            showNotification('❌ Lỗi: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Không thể kết nối server', 'error');
        console.error(error);
    }
}

// Login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            currentUser = data.admin;
            showDashboard();
            loadDashboardStats();
        } else {
            showError(data.error || 'Đăng nhập thất bại');
        }
    } catch (error) {
        showError('Không thể kết nối đến server');
    }
}

// Verify Token
async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showDashboard();
            loadDashboardStats();
        } else {
            showLoginPage();
        }
    } catch (error) {
        showLoginPage();
    }
}

// Logout
function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    authToken = null;
    currentUser = null;
    showLoginPage();
}

// Show pages
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
    document.getElementById('adminUsername').textContent = currentUser?.username || 'Admin';
}

// Navigate
function navigateToPage(page) {
    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const pageTitle = {
        'dashboard': 'Dashboard',
        'orders': 'Quản lý đơn hàng',
        'products': 'Quản lý sản phẩm',
        'accounts': 'Quản lý kho tài khoản',
        'settings': 'Cài đặt'
    };

    document.getElementById('pageTitle').textContent = pageTitle[page] || 'Dashboard';
    document.getElementById(`${page}Content`).style.display = 'block';

    // Load data for page
    switch (page) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'products':
            loadProducts();
            setupProductButton(); // Setup button khi vào tab products
            break;
        case 'accounts':
            loadProductsForFilter();
            break;
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            document.getElementById('statTotalOrders').textContent = stats.totalOrders;
            document.getElementById('statPendingOrders').textContent = stats.pendingOrders;
            document.getElementById('statPaidOrders').textContent = stats.paidOrders;
            document.getElementById('statRevenue').textContent = formatPrice(stats.totalRevenue);
            document.getElementById('statProducts').textContent = stats.totalProducts;
            document.getElementById('statAccounts').textContent = stats.availableAccounts;
        }
    } catch (error) {
        console.error('Lỗi tải stats:', error);
    }
}

// Load Orders
async function loadOrders() {
    const status = document.getElementById('orderStatusFilter')?.value || '';
    const tbody = document.getElementById('ordersTableBody');

    try {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Đang tải...</td></tr>';

        const url = `${API_BASE}/orders${status ? '?status=' + status : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success && data.orders.length > 0) {
            tbody.innerHTML = data.orders.map(order => `
                <tr>
                    <td><strong>${order.order_code}</strong></td>
                    <td>${order.customer_name}</td>
                    <td>${order.customer_email}</td>
                    <td><strong>${formatPrice(order.total_amount)}</strong></td>
                    <td><span class="status-badge status-${order.payment_status}">${getStatusText(order.payment_status)}</span></td>
                    <td><span class="status-badge status-${order.delivery_status}">${getStatusText(order.delivery_status)}</span></td>
                    <td>${formatDate(order.created_at)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewOrder('${order.order_code}')" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có đơn hàng</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Lỗi tải dữ liệu</td></tr>';
    }
}

// View Order Detail
async function viewOrder(orderCode) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderCode}`);
        const data = await response.json();

        if (data.success) {
            const order = data.order;
            const modalBody = document.getElementById('orderModalBody');
            
            modalBody.innerHTML = `
                <h2>Chi tiết đơn hàng ${order.order_code}</h2>
                <div style="margin-top: 1.5rem;">
                    <h3>Thông tin khách hàng</h3>
                    <p><strong>Tên:</strong> ${order.customer_name}</p>
                    <p><strong>Email:</strong> ${order.customer_email}</p>
                    <p><strong>SĐT:</strong> ${order.customer_phone}</p>
                    
                    <h3 style="margin-top: 1rem;">Sản phẩm</h3>
                    <ul>
                        ${order.items.map(item => `<li>${item.name} - ${formatPrice(item.price)}</li>`).join('')}
                    </ul>
                    
                    <h3 style="margin-top: 1rem;">Thanh toán</h3>
                    <p><strong>Phương thức:</strong> ${order.payment_method}</p>
                    <p><strong>Tổng tiền:</strong> ${formatPrice(order.total_amount)}</p>
                    <p><strong>Trạng thái:</strong> <span class="status-badge status-${order.payment_status}">${getStatusText(order.payment_status)}</span></p>
                    
                    ${order.payment_status === 'pending' ? `
                        <button class="btn btn-success" onclick="markAsPaid(${order.id}, '${order.order_code}')" style="margin-top: 1rem;">
                            <i class="fas fa-check"></i> Đánh dấu đã thanh toán
                        </button>
                    ` : ''}
                </div>
            `;

            document.getElementById('orderModal').classList.add('show');
        }
    } catch (error) {
        showNotification('Lỗi tải thông tin đơn hàng', 'error');
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
}

// Mark order as paid
async function markAsPaid(orderId, orderCode) {
    if (!confirm('Xác nhận đơn hàng này đã thanh toán?')) return;

    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'paid',
                transaction_id: 'MANUAL_' + Date.now()
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Đã cập nhật trạng thái thanh toán', 'success');
            closeOrderModal();
            loadOrders();
            loadDashboardStats();
        } else {
            showNotification(data.error || 'Lỗi cập nhật', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối', 'error');
    }
}

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        const grid = document.getElementById('productsGrid');

        if (data.success && data.products.length > 0) {
            grid.innerHTML = data.products.map(product => `
                <div class="product-card-admin">
                    <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">${product.icon}</div>
                    <div class="product-category" style="color: var(--primary-color); font-size: 0.875rem; font-weight: 600;">${product.category}</div>
                    <h3>${product.name}</h3>
                    <p style="color: #666; font-size: 0.9rem;">${product.description}</p>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div style="font-size: 0.875rem; color: #666;">Kho: ${product.stock || 0} tài khoản</div>
                    <div class="product-actions">
                        <button class="btn btn-secondary" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="btn btn-danger" onclick="deleteProduct(${product.id}, '${product.name}')">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<p>Chưa có sản phẩm nào</p>';
        }
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
    }
}

// Load products for filter dropdown
async function loadProductsForFilter() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        const select = document.getElementById('accountProductFilter');

        if (data.success && data.products.length > 0) {
            select.innerHTML = '<option value="">Chọn sản phẩm</option>' +
                data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
    }
}

// Load account stock
async function loadAccountStock() {
    const productId = document.getElementById('accountProductFilter')?.value;
    const tbody = document.getElementById('accountsTableBody');

    if (!productId) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chọn sản phẩm để xem tài khoản</td></tr>';
        return;
    }

    try {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

        const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success && data.accounts.length > 0) {
            tbody.innerHTML = data.accounts.map(acc => `
                <tr>
                    <td>${acc.id}</td>
                    <td>Sản phẩm #${acc.product_id}</td>
                    <td>${acc.username}</td>
                    <td>${acc.password}</td>
                    <td><span class="status-badge status-${acc.status}">${getStatusText(acc.status)}</span></td>
                    <td>${formatDate(acc.created_at)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có tài khoản nào</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Lỗi tải dữ liệu</td></tr>';
    }
}

// Show add account modal
function showAddAccountModal() {
    const productId = document.getElementById('accountProductFilter')?.value;
    
    if (!productId) {
        showNotification('Vui lòng chọn sản phẩm trước', 'error');
        return;
    }

    const username = prompt('Nhập username:');
    if (!username) return;

    const password = prompt('Nhập password:');
    if (!password) return;

    addAccount(productId, username, password);
}

// Add account to stock
async function addAccount(productId, username, password) {
    try {
        const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Đã thêm tài khoản vào kho', 'success');
            loadAccountStock();
        } else {
            showNotification(data.error || 'Lỗi thêm tài khoản', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối', 'error');
    }
}

// Change password
async function handleChangePassword(e) {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showNotification('Mật khẩu xác nhận không khớp', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Đã đổi mật khẩu thành công', 'success');
            e.target.reset();
        } else {
            showNotification(data.error || 'Lỗi đổi mật khẩu', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối', 'error');
    }
}

// Helper Functions
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('vi-VN');
}

function getStatusText(status) {
    const texts = {
        'pending': 'Chờ xử lý',
        'paid': 'Đã thanh toán',
        'delivered': 'Đã giao',
        'available': 'Có sẵn',
        'sold': 'Đã bán'
    };
    return texts[status] || status;
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);
}

async function testTelegram() {
    try {
        showNotification('Đang test Telegram...', 'info');
        
        const response = await fetch(`${API_BASE}/test/telegram`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('✅ Đã gửi test message! Kiểm tra Telegram của bạn.', 'success');
        } else {
            showNotification('❌ Lỗi: ' + (data.error || 'Không gửi được'), 'error');
        }
    } catch (error) {
        showNotification('❌ Không thể kết nối Telegram', 'error');
        console.error('Test Telegram error:', error);
    }
}

async function testSepay() {
    try {
        showNotification('Đang test Sepay...', 'info');
        
        const response = await fetch(`${API_BASE}/test/sepay`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('✅ Sepay API hoạt động! ' + (data.message || ''), 'success');
        } else {
            showNotification('❌ Lỗi: ' + (data.error || 'Không kết nối được'), 'error');
        }
    } catch (error) {
        showNotification('❌ Không thể kết nối Sepay', 'error');
        console.error('Test Sepay error:', error);
    }
}

// Product management functions
function showAddProductModal() {
    if (typeof showAddProductModalNew === 'function') {
        showAddProductModalNew();
    } else {
        showNotification('Đang load form thêm sản phẩm...', 'info');
        // Fallback: reload page nếu script chưa load
        setTimeout(() => {
            if (typeof showAddProductModalNew !== 'function') {
                location.reload();
            } else {
                showAddProductModalNew();
            }
        }, 500);
    }
}

function editProduct(id) {
    if (typeof editProductNew === 'function') {
        editProductNew(id);
    } else {
        showNotification('Đang tải...', 'info');
        setTimeout(() => location.reload(), 500);
    }
}

function deleteProduct(id, name) {
    if (typeof deleteProductNew === 'function') {
        deleteProductNew(id, name);
    } else {
        showNotification('Đang tải...', 'info');
        setTimeout(() => location.reload(), 500);
    }
}

// Override loadProducts to use new version
const originalLoadProducts = loadProducts;
function loadProducts() {
    if (typeof loadProductsNew === 'function') {
        loadProductsNew();
    } else {
        originalLoadProducts();
    }
}

