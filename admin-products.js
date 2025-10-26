// Admin Products Management - Functions nâng cao
let currentProductId = null;
let productVariants = [];

/**
 * Load products với variants
 */
async function loadProductsNew() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        const grid = document.getElementById('productsGrid');

        if (data.success && data.products.length > 0) {
            grid.innerHTML = data.products.map(product => {
                const minPrice = product.variants.length > 0 
                    ? Math.min(...product.variants.map(v => v.price))
                    : product.price;
                
                const variantsInfo = product.variants.length > 0
                    ? `${product.variants.length} gói`
                    : 'Chưa có gói';

                return `
                    <div class="product-card-admin">
                        ${product.image_url ? `
                            <img src="${product.image_url}" alt="${product.name}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">
                        ` : `
                            <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">${product.icon || '📦'}</div>
                        `}
                        <div class="product-category" style="color: var(--primary-color); font-size: 0.875rem; font-weight: 600;">${product.category}</div>
                        <h3>${product.name}</h3>
                        <p style="color: #666; font-size: 0.9rem;">${product.description}</p>
                        <div class="product-price">Từ ${formatPrice(minPrice)}</div>
                        <div style="font-size: 0.875rem; color: #666; margin: 0.5rem 0;">
                            ${variantsInfo} | Kho: ${product.stock || 0}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary" onclick="editProductNew(${product.id})">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn btn-danger" onclick="deleteProductNew(${product.id}, '${product.name}')">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = '<p>Chưa có sản phẩm nào</p>';
        }
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
        showNotification('Lỗi tải sản phẩm', 'error');
    }
}

/**
 * Show modal thêm sản phẩm
 */
function showAddProductModalNew() {
    currentProductId = null;
    productVariants = [];
    
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) {
        showNotification('Lỗi: Không tìm thấy modal. Vui lòng refresh trang.', 'error');
        console.error('Modal body not found!');
        return;
    }
    
    modalBody.innerHTML = getProductFormHTML();
    
    document.getElementById('productModal').classList.add('active');
}

/**
 * Close product modal
 */
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Alias for compatibility
function closeModal() {
    closeProductModal();
}

/**
 * Edit product
 */
async function editProductNew(id) {
    try {
        const response = await fetch(`${API_BASE}/products/${id}`);
        const data = await response.json();

        if (!data.success) {
            showNotification('Không tìm thấy sản phẩm', 'error');
            return;
        }

        currentProductId = id;
        const product = data.product;

        // Load variants
        const variantsResponse = await fetch(`${API_BASE}/products/${id}/stock`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        // Load variants from product data (đã có trong response)
        productVariants = product.variants || [];

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = getProductFormHTML(product);

        document.getElementById('productModal').classList.add('active');
        renderVariants();
    } catch (error) {
        showNotification('Lỗi tải thông tin sản phẩm', 'error');
    }
}

/**
 * HTML form sản phẩm
 */
function getProductFormHTML(product = null) {
    return `
        <h2>${product ? 'Sửa' : 'Thêm'} Sản Phẩm</h2>
        <form id="productForm" onsubmit="saveProduct(event)">
            <div class="form-group">
                <label>Tên sản phẩm *</label>
                <input type="text" id="productName" class="form-input" value="${product?.name || ''}" required>
            </div>

            <div class="form-group">
                <label>Danh mục *</label>
                <input type="text" id="productCategory" class="form-input" value="${product?.category || ''}" placeholder="VD: Streaming, Music, Design..." required>
            </div>

            <div class="form-group">
                <label>Mô tả</label>
                <textarea id="productDescription" class="form-textarea" rows="3">${product?.description || ''}</textarea>
            </div>

            <div class="form-group">
                <label>Icon/Emoji</label>
                <input type="text" id="productIcon" class="form-input" value="${product?.icon || ''}" placeholder="🎬">
                <small style="color:#666;">VD: 🎬, 🎵, 🎨, 📺, etc.</small>
            </div>

            <div class="form-group">
                <label>Ảnh sản phẩm</label>
                <input type="file" id="productImage" class="form-input" accept="image/*" onchange="uploadProductImage()">
                <div id="imagePreview" style="margin-top:0.5rem;">
                    ${product?.image_url ? `<img src="${product.image_url}" style="max-width:200px; border-radius:8px;">` : ''}
                </div>
                <input type="hidden" id="productImageUrl" value="${product?.image_url || ''}">
            </div>

            <div class="form-group">
                <label>Tính năng (mỗi dòng 1 tính năng)</label>
                <textarea id="productFeatures" class="form-textarea" rows="4" placeholder="Tính năng 1&#10;Tính năng 2&#10;Tính năng 3">${product?.features?.join('\n') || ''}</textarea>
            </div>

            <hr style="margin: 2rem 0;">

            <h3 style="margin-bottom: 1rem;">Các Gói/Options</h3>
            <div id="variantsList"></div>
            
            <button type="button" class="btn btn-secondary" onclick="addVariant()" style="margin-bottom: 2rem;">
                <i class="fas fa-plus"></i> Thêm gói
            </button>

            <div style="display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">
                    <i class="fas fa-save"></i> Lưu sản phẩm
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    Hủy
                </button>
            </div>
        </form>
    `;
}

/**
 * Upload ảnh
 */
async function uploadProductImage() {
    const fileInput = document.getElementById('productImage');
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        showNotification('Đang upload ảnh...', 'info');

        const response = await fetch(`${API_BASE}/products/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('productImageUrl').value = data.imageUrl;
            document.getElementById('imagePreview').innerHTML = `
                <img src="${data.imageUrl}" style="max-width:200px; border-radius:8px;">
            `;
            showNotification('Upload ảnh thành công!', 'success');
        } else {
            showNotification('Lỗi upload: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Không thể upload ảnh', 'error');
    }
}

/**
 * Thêm variant
 */
function addVariant() {
    const variant = {
        id: Date.now(),
        name: '',
        duration_value: 1,
        duration_unit: 'month',
        price: 0,
        description: ''
    };

    productVariants.push(variant);
    renderVariants();
}

/**
 * Render danh sách variants
 */
function renderVariants() {
    const container = document.getElementById('variantsList');

    if (productVariants.length === 0) {
        container.innerHTML = '<p style="color:#666;">Chưa có gói nào. Click "Thêm gói" để tạo.</p>';
        return;
    }

    container.innerHTML = productVariants.map((v, index) => `
        <div class="variant-item" style="background:#f8f9fa; padding:1rem; border-radius:8px; margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <strong>Gói ${index + 1}</strong>
                <button type="button" class="btn btn-danger" onclick="removeVariant(${index})" style="padding:0.25rem 0.75rem; font-size:0.875rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Tên gói *</label>
                    <input type="text" class="form-input" value="${v.name}" onchange="updateVariant(${index}, 'name', this.value)" placeholder="VD: Gói 1 tháng" required>
                </div>
                
                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Giá *</label>
                    <input type="number" class="form-input" value="${v.price}" onchange="updateVariant(${index}, 'price', parseInt(this.value))" placeholder="50000" required>
                </div>

                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Thời gian *</label>
                    <input type="number" class="form-input" value="${v.duration_value}" onchange="updateVariant(${index}, 'duration_value', parseInt(this.value))" min="1" required>
                </div>

                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Đơn vị *</label>
                    <select class="form-input" onchange="updateVariant(${index}, 'duration_unit', this.value)">
                        <option value="day" ${v.duration_unit === 'day' ? 'selected' : ''}>Ngày</option>
                        <option value="month" ${v.duration_unit === 'month' ? 'selected' : ''}>Tháng</option>
                        <option value="year" ${v.duration_unit === 'year' ? 'selected' : ''}>Năm</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:1rem;">
                <label style="font-size:0.875rem; font-weight:600;">Mô tả</label>
                <input type="text" class="form-input" value="${v.description || ''}" onchange="updateVariant(${index}, 'description', this.value)" placeholder="VD: Tài khoản Premium 1 tháng">
            </div>
        </div>
    `).join('');
}

/**
 * Update variant
 */
function updateVariant(index, field, value) {
    productVariants[index][field] = value;
}

/**
 * Remove variant
 */
function removeVariant(index) {
    if (confirm('Xóa gói này?')) {
        productVariants.splice(index, 1);
        renderVariants();
    }
}

/**
 * Save product
 */
async function saveProduct(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value;
    const icon = document.getElementById('productIcon').value;
    const image_url = document.getElementById('productImageUrl').value;
    const featuresText = document.getElementById('productFeatures').value;
    const features = featuresText.split('\n').filter(f => f.trim());

    if (productVariants.length === 0) {
        showNotification('Vui lòng thêm ít nhất 1 gói/option', 'error');
        return;
    }

    // Validate variants
    for (let v of productVariants) {
        if (!v.name || !v.price || !v.duration_value) {
            showNotification('Vui lòng điền đầy đủ thông tin các gói', 'error');
            return;
        }
    }

    const productData = {
        name,
        category,
        description,
        icon,
        image_url,
        features,
        variants: productVariants,
        status: 'active'
    };

    try {
        showNotification('Đang lưu...', 'info');

        const url = currentProductId 
            ? `${API_BASE}/products/${currentProductId}`
            : `${API_BASE}/products`;

        const response = await fetch(url, {
            method: currentProductId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Đã ${currentProductId ? 'cập nhật' : 'thêm'} sản phẩm!`, 'success');
            closeModal();
            loadProductsNew();
        } else {
            showNotification('Lỗi: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Không thể lưu sản phẩm', 'error');
    }
}

/**
 * Delete product
 */
async function deleteProductNew(id, name) {
    if (!confirm(`Xóa sản phẩm "${name}"?`)) return;

    try {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Đã xóa sản phẩm', 'success');
            loadProductsNew();
        } else {
            showNotification('Lỗi xóa: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Không thể xóa sản phẩm', 'error');
    }
}

