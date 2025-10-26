// Admin Stock Management - Quản lý kho tài khoản

/**
 * Load danh sách sản phẩm vào filter
 */
async function loadProductsForFilter() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            // Fill vào filter
            const filter = document.getElementById('accountProductFilter');
            filter.innerHTML = '<option value="">Chọn sản phẩm</option>' +
                data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

            // Fill vào add form
            const addForm = document.getElementById('addAccountProduct');
            if (addForm) {
                addForm.innerHTML = '<option value="">Chọn sản phẩm</option>' +
                    data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/**
 * Load accounts theo product ID
 */
async function loadAccountsByProduct() {
    const productId = document.getElementById('accountProductFilter').value;
    const variantName = document.getElementById('accountVariantFilter').value;
    const status = document.getElementById('accountStatusFilter').value;

    if (!productId) {
        document.getElementById('accountsTableBody').innerHTML = `
            <tr><td colspan="8" class="text-center">Chọn sản phẩm để xem tài khoản</td></tr>
        `;
        document.getElementById('stockSummary').style.display = 'none';
        document.getElementById('accountVariantFilter').style.display = 'none';
        return;
    }

    try {
        // Load stock summary
        await loadStockSummary(productId);

        // Load accounts
        let url = `${API_BASE}/products/${productId}/accounts?`;
        if (variantName) url += `variantName=${encodeURIComponent(variantName)}&`;
        if (status) url += `status=${status}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        const tbody = document.getElementById('accountsTableBody');

        if (data.success && data.accounts.length > 0) {
            tbody.innerHTML = data.accounts.map((acc, index) => {
                const statusBadge = acc.status === 'available' 
                    ? '<span class="badge badge-success">Còn hàng</span>'
                    : '<span class="badge badge-secondary">Đã bán</span>';

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${acc.variantName}</td>
                        <td><code>${acc.username}</code></td>
                        <td><code>${acc.password}</code></td>
                        <td>${acc.additionalInfo || '-'}</td>
                        <td>${statusBadge}</td>
                        <td>${formatDate(acc.createdAt)}</td>
                        <td>
                            ${acc.status === 'available' ? `
                                <button class="btn-icon btn-danger" onclick="deleteAccount('${productId}', '${acc.id}')" title="Xóa">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `
                <tr><td colspan="8" class="text-center">Chưa có tài khoản nào trong kho</td></tr>
            `;
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        showNotification('Lỗi tải danh sách tài khoản', 'error');
    }
}

/**
 * Load stock summary
 */
async function loadStockSummary(productId) {
    try {
        const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (data.success) {
            const stockSummary = document.getElementById('stockSummary');
            const variantStockCards = document.getElementById('variantStockCards');
            const variantFilter = document.getElementById('accountVariantFilter');

            if (Object.keys(data.stock).length > 0) {
                stockSummary.style.display = 'block';
                variantFilter.style.display = 'inline-block';

                // Render stock cards
                variantStockCards.innerHTML = Object.entries(data.stock).map(([variantName, count]) => `
                    <div class="stat-card-mini">
                        <div class="stat-icon-mini" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="stat-info-mini">
                            <h4>${count}</h4>
                            <p>${variantName}</p>
                        </div>
                    </div>
                `).join('');

                // Fill variant filter
                variantFilter.innerHTML = '<option value="">Tất cả gói</option>' +
                    Object.keys(data.stock).map(v => `<option value="${v}">${v}</option>`).join('');
            } else {
                stockSummary.style.display = 'none';
                variantFilter.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading stock summary:', error);
    }
}

/**
 * Show add account modal
 */
function showAddAccountModal() {
    document.getElementById('addAccountModal').style.display = 'block';
    document.getElementById('addAccountModal').classList.add('active');
    loadProductsForAddModal();
}

/**
 * Close add account modal
 */
function closeAddAccountModal() {
    document.getElementById('addAccountModal').style.display = 'none';
    document.getElementById('addAccountModal').classList.remove('active');
    document.getElementById('addAccountForm').reset();
    document.getElementById('variantSelectGroup').style.display = 'none';
}

/**
 * Load products for add modal
 */
async function loadProductsForAddModal() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            const select = document.getElementById('addAccountProduct');
            select.innerHTML = '<option value="">Chọn sản phẩm</option>' +
                data.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/**
 * Load variants when product selected
 */
async function loadVariantsForAdd() {
    const productId = document.getElementById('addAccountProduct').value;
    const variantGroup = document.getElementById('variantSelectGroup');
    const variantSelect = document.getElementById('addAccountVariant');

    if (!productId) {
        variantGroup.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        const data = await response.json();

        if (data.success && data.product.variants.length > 0) {
            variantGroup.style.display = 'block';
            variantSelect.innerHTML = '<option value="">Chọn gói</option>' +
                data.product.variants.map(v => `<option value="${v.name}">${v.name} - ${formatPrice(v.price)}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading variants:', error);
    }
}

/**
 * Submit add accounts
 */
async function submitAddAccounts(e) {
    e.preventDefault();

    const productId = document.getElementById('addAccountProduct').value;
    const variantName = document.getElementById('addAccountVariant').value;
    const accountListText = document.getElementById('addAccountList').value.trim();

    if (!productId || !variantName || !accountListText) {
        showNotification('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    // Parse accounts
    const lines = accountListText.split('\n').filter(line => line.trim());
    const accounts = [];

    for (let line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
            accounts.push({
                username: parts[0],
                password: parts[1],
                additionalInfo: parts[2] || ''
            });
        }
    }

    if (accounts.length === 0) {
        showNotification('Không có tài khoản hợp lệ nào', 'error');
        return;
    }

    try {
        showNotification('Đang thêm tài khoản...', 'info');

        const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variantName,
                accounts
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Đã thêm ${data.count} tài khoản vào kho!`, 'success');
            closeAddAccountModal();
            
            // Reload if viewing this product
            const currentFilter = document.getElementById('accountProductFilter').value;
            if (currentFilter === productId) {
                loadAccountsByProduct();
            }
            
            // Update dashboard stats
            if (typeof loadDashboardStats === 'function') {
                loadDashboardStats();
            }
        } else {
            showNotification('Lỗi: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error adding accounts:', error);
        showNotification('Không thể thêm tài khoản', 'error');
    }
}

/**
 * Delete account
 */
async function deleteAccount(productId, accountId) {
    if (!confirm('Xóa tài khoản này khỏi kho?')) return;

    try {
        const response = await fetch(`${API_BASE}/products/${productId}/accounts/${accountId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Đã xóa tài khoản', 'success');
            loadAccountsByProduct();
            
            // Update stats
            if (typeof loadDashboardStats === 'function') {
                loadDashboardStats();
            }
        } else {
            showNotification('Lỗi: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Không thể xóa tài khoản', 'error');
    }
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

