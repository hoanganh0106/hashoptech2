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

        const grid = document.getElementById('productsList');
        
        if (!grid) {
            console.error('productsList element not found');
            return;
        }

        if (data.success && data.products.length > 0) {
            grid.innerHTML = data.products.map(product => {
                const minPrice = product.variants.length > 0 
                    ? Math.min(...product.variants.map(v => v.price))
                    : product.price;
                
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
                            Kho: ${product.stock || 0}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary" onclick="editProductNew('${product.id}')">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="btn btn-danger" onclick="deleteProductNew('${product.id}', '${product.name}')">
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
    
    // Show modal
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('show', 'active');
}

/**
 * Close product modal
 */
function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.classList.remove('show', 'active');
    
    // Reset form
    currentProductId = null;
    productVariants = [];
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

        // Load variants from product data and ensure they have description field
        productVariants = (product.variants || []).map(v => ({
            ...v,
            description: v.description || ''
        }));

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = getProductFormHTML(product);

        // Show modal
        const modal = document.getElementById('productModal');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.classList.add('show', 'active');
        
        renderVariants();
    } catch (error) {
        console.error('Edit product error:', error);
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
                <input type="text" id="productName" class="form-input" value="${product?.name || ''}" autocomplete="off" spellcheck="false" required>
            </div>

            <div class="form-group">
                <label>Danh mục *</label>
                <input type="text" id="productCategory" class="form-input" value="${product?.category || ''}" placeholder="VD: Streaming, Music, Design..." autocomplete="off" spellcheck="false" required>
            </div>

            <div class="form-group">
                <label>Mô tả</label>
                <textarea id="productDescription" class="form-textarea" rows="3" autocomplete="off" spellcheck="false" placeholder="Mô tả sản phẩm (mỗi dòng 1 mục)&#10;VD:&#10;Tính năng 1&#10;Tính năng 2&#10;Tính năng 3">${product?.description || ''}</textarea>
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
        description: '',
        stockType: 'available'
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
    
    console.log('Rendering variants:', productVariants);

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
                    <input type="text" class="form-input variant-name" data-index="${index}" value="${v.name}" placeholder="VD: Gói 1 tháng" autocomplete="off" spellcheck="false" required>
                </div>
                
                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Giá (VNĐ) *</label>
                    <input type="number" class="form-input variant-price" data-index="${index}" value="${v.price}" placeholder="50000" required>
                </div>

                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Thời gian *</label>
                    <input type="number" class="form-input variant-duration" data-index="${index}" value="${v.duration_value}" min="1" required>
                </div>

                <div>
                    <label style="font-size:0.875rem; font-weight:600;">Đơn vị *</label>
                    <select class="form-input variant-unit" data-index="${index}">
                        <option value="day" ${v.duration_unit === 'day' ? 'selected' : ''}>Ngày</option>
                        <option value="month" ${v.duration_unit === 'month' ? 'selected' : ''}>Tháng</option>
                        <option value="year" ${v.duration_unit === 'year' ? 'selected' : ''}>Năm</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:1rem;">
                <label style="font-size:0.875rem; font-weight:600;">Mô tả gói</label>
                <input type="text" class="form-input variant-desc" data-index="${index}" value="${v.description || ''}" placeholder="VD: Tài khoản Premium 1 tháng" autocomplete="off" spellcheck="false">
            </div>

            <div style="margin-top:1rem;">
                <label style="font-size:0.875rem; font-weight:600;">Loại kho *</label>
                <select class="form-input variant-stock-type" data-index="${index}" required>
                    <option value="available" ${v.stockType === 'available' ? 'selected' : ''}>Có sẵn hàng</option>
                    <option value="contact" ${v.stockType === 'contact' ? 'selected' : ''}>Cần liên hệ</option>
                </select>
                <small style="color:#666; font-size:0.75rem; display:block; margin-top:0.25rem;">
                    • Có sẵn hàng: Tự động thêm vào giỏ hàng<br>
                    • Cần liên hệ: Yêu cầu liên hệ trực tiếp
                </small>
            </div>
        </div>
    `).join('');
}

/**
 * Update variant - Lấy giá trị từ các input khi submit
 */
function updateVariantsFromForm() {
    const variantNames = document.querySelectorAll('.variant-name');
    const variantPrices = document.querySelectorAll('.variant-price');
    const variantDurations = document.querySelectorAll('.variant-duration');
    const variantUnits = document.querySelectorAll('.variant-unit');
    const variantDescs = document.querySelectorAll('.variant-desc');
    const variantStockTypes = document.querySelectorAll('.variant-stock-type');

    variantNames.forEach((input, idx) => {
        if (productVariants[idx]) {
            productVariants[idx].name = input.value;
            productVariants[idx].price = parseInt(variantPrices[idx].value) || 0;
            productVariants[idx].duration_value = parseInt(variantDurations[idx].value) || 1;
            productVariants[idx].duration_unit = variantUnits[idx].value;
            productVariants[idx].description = variantDescs[idx].value;
            productVariants[idx].stockType = variantStockTypes[idx].value;
        }
    });
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

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const icon = document.getElementById('productIcon').value.trim();
    const image_url = document.getElementById('productImageUrl').value.trim();
    const features = []; // Không còn tính năng

    // Validation
    if (!name || !category) {
        showNotification('Vui lòng điền tên và danh mục sản phẩm', 'error');
        return;
    }

    if (productVariants.length === 0) {
        showNotification('Vui lòng thêm ít nhất 1 gói/option', 'error');
        return;
    }

    // Cập nhật variants từ form
    updateVariantsFromForm();

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
        description: description || '', // Đảm bảo description là string trống nếu không có giá trị
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

