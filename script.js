// API Configuration
const API_BASE = window.location.origin + '/api';

// Product Data
let products = [];
let filteredProducts = []; // Store filtered products for search
let currentCategory = 'all'; // Current selected category

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing...');
    loadProducts();
    updateCartUI();
    setupEventListeners();
});

// Load Products from API
async function loadProducts() {
    try {
        console.log('📦 Loading products from API...');
        const response = await fetch(`${API_BASE}/products`);
        console.log('📡 API Response:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📊 API Data:', data);

        if (data.success) {
            products = data.products;
            filteredProducts = [...products]; // Initialize filtered products
            console.log('✅ Products loaded:', products.length);
            renderCategoryButtons();
            renderProducts();
            updateSearchStats(products.length, products.length);
        } else {
            console.error('❌ API returned error:', data.error);
        }
    } catch (error) {
        console.error('❌ Lỗi tải sản phẩm:', error);
        showNotification('Không thể tải sản phẩm', 'error');
    }
}

// Render Products với variants
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) {
        console.warn('⚠️ productsGrid element not found');
        return;
    }
    
    if (!filteredProducts || filteredProducts.length === 0) {
        console.warn('⚠️ No products to render');
        productsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Rendering', filteredProducts.length, 'products');
    
    // Nhóm sản phẩm theo category
    const groupedProducts = groupProductsByCategory(filteredProducts);
    
    // Render từng nhóm category
    productsGrid.innerHTML = Object.keys(groupedProducts).map(category => {
        const products = groupedProducts[category];
        return `
            <div class="category-section">
                <div class="category-header">
                    <h3 class="category-title">${category}</h3>
                    
                </div>
                <div class="category-products">
                    ${products.map(product => renderProductCard(product)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render category filter buttons
 */
function renderCategoryButtons() {
    const categoryButtonsContainer = document.getElementById('categoryButtons');
    if (!categoryButtonsContainer) return;
    
    // Lấy tất cả categories từ products
    const categories = [...new Set(products.map(product => product.category || 'Khác'))];
    
    // Tạo buttons cho từng category
    categoryButtonsContainer.innerHTML = categories.map(category => `
        <button class="category-btn" data-category="${category}" onclick="filterByCategory('${category}')">
            <i class="fas fa-tag"></i>
            ${category}
        </button>
    `).join('');
}

/**
 * Filter products by category
 */
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // Filter products
    if (category === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => 
            (product.category || 'Khác') === category
        );
    }
    
    // Re-apply search if there's a search term
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput && searchInput.value.trim()) {
        searchProducts();
    } else {
        renderProducts();
        updateSearchStats(filteredProducts.length, products.length);
    }
}

/**
 * Nhóm sản phẩm theo category
 */
function groupProductsByCategory(products) {
    const grouped = {};
    
    products.forEach(product => {
        const category = product.category || 'Khác';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(product);
    });
    
    // Sắp xếp categories theo alphabet
    const sortedCategories = Object.keys(grouped).sort();
    const sortedGrouped = {};
    
    sortedCategories.forEach(category => {
        sortedGrouped[category] = grouped[category];
    });
    
    return sortedGrouped;
}

/**
 * Render một product card
 */
function renderProductCard(product) {
    const minPrice = product.variants && product.variants.length > 0
        ? Math.min(...product.variants.map(v => v.price || 0))
        : (product.price || 0);

    const priceDisplay = product.variants && product.variants.length > 1
        ? `Từ ${formatPrice(minPrice)}`
        : formatPrice(minPrice);

    return `
        <div class="product-card" onclick="showProductDetails('${product.id}')">
            ${product.image_url ? `
                <img src="${product.image_url}" alt="${product.name}" style="width:100%; aspect-ratio:1; object-fit:${product.image_fit || 'cover'}; object-position:center;">
            ` : `
                <div class="product-image">
                    <span style="font-size: 4rem;">${product.icon || '📦'}</span>
                </div>
            `}
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${product.description ? `
                    <div class="product-description">
                        ${(() => {
                            const lines = product.description.split('\n').filter(line => line.trim()).length > 0 
                                ? product.description.split('\n').filter(line => line.trim())
                                : product.description.split(',').map(item => item.trim());
                            
                            // Trên mobile chỉ hiển thị 2 dòng đầu
                            const displayLines = window.innerWidth <= 768 ? lines.slice(0, 2) : lines;
                            
                            return displayLines.map(line => 
                                `<div class="description-item">${line.trim()}</div>`
                            ).join('');
                        })()}
                    </div>
                ` : ''}
                ${product.features && product.features.length > 0 ? `
                    <ul class="product-features">
                        ${product.features.slice(0, 2).map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                ` : ''}
                <div class="product-footer">
                    <div class="product-price">${priceDisplay}</div>
                    <button class="btn btn-primary" onclick="event.stopPropagation(); showProductDetails('${product.id}')">
                        Xem chi tiết
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Show Product Details với options
function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hasVariants = product.variants && product.variants.length > 0;
    const defaultVariant = hasVariants ? product.variants[0] : null;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            ${product.image_url ? `
                <img src="${product.image_url}" alt="${product.name}" style="max-width:300px; border-radius:12px; margin-bottom:1rem;">
            ` : `
                <div style="font-size: 6rem; margin-bottom: 1rem;">${product.icon || '📦'}</div>
            `}
            <div style="color: var(--primary-color); font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">
                ${product.category}
            </div>
            <h2 style="color: var(--dark-color); margin-bottom: 1rem;">${product.name}</h2>
            ${product.description ? `
                <div style="color: var(--text-color); font-size: 1.1rem;">
                    ${product.description.split('\n').filter(line => line.trim()).length > 0 
                        ? product.description.split('\n').filter(line => line.trim()).map(line => 
                            `<div style="margin-bottom: 0.5rem;">${line.trim()}</div>`
                        ).join('')
                        : product.description.split(',').map(item => 
                            `<div style="margin-bottom: 0.5rem;">${item.trim()}</div>`
                        ).join('')
                    }
                </div>
            ` : ''}
        </div>

        ${hasVariants ? `
            <div style="background: var(--light-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: var(--dark-color);">Chọn gói:</h3>
                <div id="variantOptions" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${product.variants.map((variant, index) => {
                        const durationText = variant.duration_value + ' ' + 
                            (variant.duration_unit === 'day' ? 'ngày' : 
                             variant.duration_unit === 'month' ? 'tháng' : 'năm');
                        
                        return `
                            <label class="variant-option ${index === 0 ? 'selected' : ''}" style="display: flex; align-items: center; padding: 1rem; border: 2px solid ${index === 0 ? 'var(--primary-color)' : '#e2e8f0'}; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="variant" value="${variant.id || index}" ${index === 0 ? 'checked' : ''} style="margin-right: 1rem;" onchange="selectVariant('${productId}', ${index})">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark-color);">${variant.name}</div>
                                    <div style="font-size: 0.9rem; color: #666;">${variant.description || ''}</div>
                                </div>
                                <div style="font-size: 1.25rem; font-weight: bold; color: var(--accent-color);">
                                    ${formatPrice(variant.price)}
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        ${product.features && product.features.length > 0 ? `
            <div style="background: var(--light-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: var(--dark-color);">Tính năng nổi bật:</h3>
                <ul class="product-features">
                    ${product.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="product-price" style="font-size: 2rem;" id="selectedPrice">
                ${hasVariants ? formatPrice(defaultVariant.price) : formatPrice(product.price)}
            </div>
            <button class="btn btn-primary" onclick="addToCartFromModal('${product.id}'); closeModal();" style="padding: 1rem 2rem;">
                <i class="fas fa-cart-plus"></i> Thêm vào giỏ hàng
            </button>
        </div>
    `;

    document.getElementById('productModal').classList.add('active');

    // Add CSS for variant options
    if (!document.getElementById('variantStyles')) {
        const style = document.createElement('style');
        style.id = 'variantStyles';
        style.textContent = `
            .variant-option:hover {
                border-color: var(--primary-color) !important;
                background-color: rgba(99, 102, 241, 0.05);
            }
            .variant-option.selected {
                border-color: var(--primary-color) !important;
                background-color: rgba(99, 102, 241, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
}

// Select variant (update price and styling)
let selectedVariantIndex = 0;
function selectVariant(productId, variantIndex) {
    selectedVariantIndex = variantIndex;
    const product = products.find(p => p.id === productId);
    if (!product || !product.variants) return;

    const variant = product.variants[variantIndex];
    
    // Update price display
    document.getElementById('selectedPrice').textContent = formatPrice(variant.price);

    // Update selected styling
    document.querySelectorAll('.variant-option').forEach((el, index) => {
        if (index === variantIndex) {
            el.classList.add('selected');
            el.style.borderColor = 'var(--primary-color)';
        } else {
            el.classList.remove('selected');
            el.style.borderColor = '#e2e8f0';
        }
    });
}

// Add to cart from modal (with selected variant)
async function addToCartFromModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hasVariants = product.variants && product.variants.length > 0;
    const variant = hasVariants ? product.variants[selectedVariantIndex] : null;

    await addToCart(productId, variant);
}

// Close Modal
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Add to Cart (hỗ trợ variants)
async function addToCart(productId, variant = null, event = null) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }

    // Tự động chọn variant đầu tiên nếu sản phẩm có variants
    const selectedVariant = variant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
    
    // Kiểm tra kho trước khi thêm vào giỏ hàng
    try {
        let variantIndex = 0;
        if (selectedVariant && product.variants) {
            // Tìm index của variant được chọn
            const foundIndex = product.variants.findIndex(v => 
                (v.id && v.id === selectedVariant.id) || 
                (v.name && v.name === selectedVariant.name)
            );
            if (foundIndex !== -1) {
                variantIndex = foundIndex;
            }
        }
        
        const stockCheckUrl = `/api/products/${productId}/stock-check?variantIndex=${variantIndex}`;
        console.log('🔍 Checking stock for:', product.name, 'variant:', variantIndex);
        
        const response = await fetch(stockCheckUrl);
        const stockData = await response.json();
        
        console.log('📊 Stock check result:', stockData);
        
        if (!stockData.success) {
            console.error('Stock check failed:', stockData.error);
            showNotification('Lỗi kiểm tra kho sản phẩm', 'error');
            return;
        }
        
        // Handle different stock types
        if (stockData.stockType === 'contact') {
            showNotification('📞 Sản phẩm này cần liên hệ trực tiếp để đặt hàng!', 'warning');
            return;
        } else if (stockData.stockType === 'available' && !stockData.hasStock) {
            showNotification('⚠️ Sản phẩm đã hết hàng! Vui lòng liên hệ trực tiếp để được hỗ trợ.', 'warning');
            return;
        } else if (stockData.stockType === 'available' && stockData.hasStock) {
            console.log('✅ Available product - stock check passed');
        }
        
        console.log('✅ Stock check passed:', stockData.stockCount, 'items available');
        
    } catch (error) {
        console.error('Stock check error:', error);
        showNotification('Lỗi kiểm tra kho sản phẩm', 'error');
        return;
    }
    
    // Tạo unique key cho cart item (product + variant)
    const cartItemKey = selectedVariant 
        ? `${productId}-${selectedVariant.id || selectedVariant.name}`
        : `${productId}`;

    const existingItem = cart.find(item => item.cartItemKey === cartItemKey);
    
    if (existingItem) {
        console.log('⚠️ Product already in cart');
        showNotification('Sản phẩm đã có trong giỏ hàng!', 'warning');
        return;
    }

    const price = selectedVariant ? selectedVariant.price : (product.price || 0);
    const displayName = selectedVariant 
        ? `${product.name} - ${selectedVariant.name}`
        : product.name;

    console.log('✅ Adding to cart:', displayName, 'Price:', price);

    cart.push({
        id: product.id,
        cartItemKey: cartItemKey,
        name: displayName,
        productName: product.name,
        variantName: selectedVariant ? selectedVariant.name : null,
        variantId: selectedVariant ? (selectedVariant.id || null) : null,
        price: price,
        icon: product.icon || '📦',
        variant: selectedVariant
    });

    saveCart();
    updateCartUI();
    showNotification('Đã thêm vào giỏ hàng!', 'success');
}

// Remove from Cart (sử dụng cartItemKey)
function removeFromCart(cartItemKey) {
    cart = cart.filter(item => item.cartItemKey !== cartItemKey);
    saveCart();
    updateCartUI();
    showNotification('Đã xóa khỏi giỏ hàng!', 'info');
}

// Toggle Cart
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('active');
}

// Update Cart UI
function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.querySelector('.cart-count');
    const totalAmount = document.getElementById('totalAmount');

    cartCount.textContent = cart.length;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Giỏ hàng trống</p>
            </div>
        `;
        totalAmount.textContent = '0đ';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-icon">${item.icon}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.cartItemKey}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    totalAmount.textContent = formatPrice(total);
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        showNotification('Giỏ hàng trống!', 'warning');
        return;
    }

    toggleCart();
    
    const orderSummary = document.getElementById('orderSummary');
    orderSummary.innerHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.icon} ${item.name}</span>
            <span>${formatPrice(item.price)}</span>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('orderTotal').textContent = formatPrice(total);

    document.getElementById('checkoutModal').classList.add('active');
}

// Close Checkout Modal
function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

// Show Payment Info
function showPaymentInfo(order, payment) {
    const modalBody = document.getElementById('modalBody');
    
    console.log('💳 Payment info:', payment);
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; color: #10b981; margin-bottom: 1rem;">
                ✅
            </div>
            <h2 style="margin-bottom: 1rem;">Đặt hàng thành công!</h2>
            <p style="margin-bottom: 2rem;">
                Mã đơn hàng: <strong>${order.order_code}</strong>
            </p>
        </div>

        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem;">💳 Quét mã QR để thanh toán</h3>
            
            ${payment.qrCodeUrl ? `
                <div style="text-align: center; margin: 1.5rem 0;">
                    <img src="${payment.qrCodeUrl}" alt="QR Code Thanh toán" style="max-width: 300px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                </div>
            ` : ''}
            
            <div style="background: white; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                <p style="margin: 0.5rem 0;"><strong>🏦 Ngân hàng:</strong> ${payment.bankCode || 'VPBank'}</p>
                <p style="margin: 0.5rem 0;"><strong>📊 Số tài khoản:</strong> <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px;">${payment.accountNumber}</code></p>
                <p style="margin: 0.5rem 0;"><strong>💰 Số tiền:</strong> <strong style="color: #ef4444;">${formatPrice(payment.amount)}</strong></p>
                <p style="margin: 0.5rem 0;"><strong>✍️ Nội dung:</strong> <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px;">${payment.content}</code></p>
            </div>

            <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h4 style="color: #92400e; margin-bottom: 0.5rem;">⚠️ Lưu ý quan trọng:</h4>
                <ul style="color: #92400e; margin-left: 1.5rem; font-size: 0.9rem;">
                    <li style="margin-bottom: 0.25rem;">Chuyển khoản ĐÚNG số tiền và nội dung</li>
                    <li style="margin-bottom: 0.25rem;">Đơn hàng tự động xử lý sau khi thanh toán</li>
                    <li style="margin-bottom: 0.25rem;">Thông tin tài khoản sẽ được gửi qua EMAIL</li>
                    <li style="margin-bottom: 0.25rem;">Liên hệ hỗ trợ nếu có vấn đề</li>
                </ul>
            </div>

            <div style="background: #e7f3ff; padding: 1rem; border-radius: 8px; border-left: 4px solid #007bff; margin-top: 1rem;">
                <h4 style="color: #004085; margin-bottom: 0.5rem;">📧 Thông tin tài khoản:</h4>
                <p style="color: #004085; margin: 0; font-size: 0.9rem;">
                    Sau khi thanh toán thành công, thông tin tài khoản sẽ được gửi qua email. 
                    Vui lòng kiểm tra hộp thư và thư mục Spam.
                </p>
            </div>
        </div>

        <button class="btn btn-primary btn-block" onclick="closeModal()">
            Đã hiểu
        </button>
    `;

    document.getElementById('productModal').classList.add('active');
    
    // Start checking order status
    const customerEmail = document.getElementById('customerEmail').value;
    startOrderStatusCheck(order.order_code, customerEmail);
}

// Setup Event Listeners
function setupEventListeners() {
    // Order Form Submit
    document.getElementById('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const orderNote = document.getElementById('orderNote').value;

        console.log('📋 Form data:', { customerName, customerEmail, customerPhone, paymentMethod });

        // Validate
        if (cart.length === 0) {
            showNotification('Giỏ hàng trống!', 'warning');
            return;
        }

        if (!customerName || !customerEmail || !customerPhone) {
            showNotification('Vui lòng điền đầy đủ thông tin!', 'warning');
            return;
        }

        const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

        showNotification('Đang xử lý đơn hàng...', 'info');

        try {
            // Transform cart to backend format
            const orderItems = cart.map(item => ({
                productId: item.id,
                variantId: item.variantId,
                quantity: 1
            }));

            console.log('📦 Order items:', orderItems);

            // Create order via API
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerName: customerName,  // camelCase
                    customerEmail: customerEmail,  // camelCase
                    customerPhone: customerPhone,  // camelCase
                    items: orderItems  // Đúng format backend expect
                })
            });

            const data = await response.json();

            if (data.success) {
                // Clear cart
                cart = [];
                saveCart();
                updateCartUI();

                // Close checkout modal
                closeCheckoutModal();

                // Show payment info
                showPaymentInfo(data.order, data.payment);

                // Reset form
                document.getElementById('orderForm').reset();

                showNotification('Đặt hàng thành công! Vui lòng thanh toán để hoàn tất.', 'success');
            } else {
                // Xử lý lỗi hết hàng
                if (data.error === 'Sản phẩm hết hàng') {
                    showOutOfStockModal(data.message, data.outOfStockItems);
                } else {
                    showNotification('❌ ' + (data.error || 'Có lỗi xảy ra'), 'error');
                }
            }
        } catch (error) {
            console.error('Lỗi đặt hàng:', error);
            showNotification('Không thể kết nối đến server', 'error');
        }
    });

    // Close modals on outside click
    window.onclick = (event) => {
        const productModal = document.getElementById('productModal');
        const checkoutModal = document.getElementById('checkoutModal');
        
        if (event.target === productModal) {
            closeModal();
        }
        if (event.target === checkoutModal) {
            closeCheckoutModal();
        }
    };

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Format Price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: colors[type] || colors.info,
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease-out',
        fontWeight: '500'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// Show out of stock modal
function showOutOfStockModal(message, outOfStockItems) {
    const modalBody = document.getElementById('modalBody');
    
    let itemsHTML = '';
    outOfStockItems.forEach(item => {
        itemsHTML += `
            <div style="background: #fef3c7; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h4 style="margin: 0 0 10px 0; color: #92400e;">${item.productName} - ${item.variantName}</h4>
                <p style="margin: 5px 0; color: #92400e;">
                    <strong>Cần:</strong> ${item.requested} tài khoản<br>
                    <strong>Có sẵn:</strong> ${item.available} tài khoản
                </p>
            </div>
        `;
    });

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; color: #f59e0b; margin-bottom: 1rem;">
                ⚠️
            </div>
            <h2 style="margin-bottom: 1rem; color: #92400e;">Sản phẩm hết hàng</h2>
            <p style="margin-bottom: 2rem; color: #666;">
                Một số sản phẩm trong giỏ hàng hiện tại không có đủ số lượng trong kho.
            </p>
        </div>

        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: #495057;">📦 Chi tiết sản phẩm hết hàng:</h3>
            ${itemsHTML}
        </div>

        <div style="background: #e7f3ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #007bff;">
            <h3 style="margin-bottom: 1rem; color: #004085;">📞 Liên hệ hỗ trợ</h3>
            <p style="color: #004085; margin-bottom: 15px;">
                Để được hỗ trợ nhanh nhất, vui lòng liên hệ trực tiếp với chúng tôi:
            </p>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin: 20px 0;">
                <a href="https://t.me/hoanganh1162" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; background: #0088cc; color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    <i class="fab fa-telegram"></i> Telegram
                </a>
                <a href="https://facebook.com/HoangAnh.Sw" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; background: #1877f2; color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    <i class="fab fa-facebook"></i> Facebook
                </a>
            </div>
            
            <p style="color: #004085; margin-top: 15px; font-size: 0.9em;">
                <strong>Lưu ý:</strong> Khi liên hệ, vui lòng cung cấp thông tin sản phẩm bạn muốn mua để chúng tôi hỗ trợ bạn nhanh nhất.
            </p>
        </div>

        <div style="display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="closeModal()" style="flex: 1;">
                <i class="fas fa-check"></i> Đã hiểu
            </button>
            <button class="btn btn-secondary" onclick="clearCartAndClose()" style="flex: 1;">
                <i class="fas fa-trash"></i> Xóa giỏ hàng
            </button>
        </div>
    `;

    document.getElementById('productModal').classList.add('active');
}

// Clear cart and close modal
function clearCartAndClose() {
    cart = [];
    saveCart();
    updateCartUI();
    closeModal();
    showNotification('Đã xóa giỏ hàng', 'info');
}

// Check order status and redirect to thank you page
function checkOrderStatus(orderCode, customerEmail) {
    // Redirect to thank you page with order info
    const thankYouUrl = `/thank-you?order=${encodeURIComponent(orderCode)}&email=${encodeURIComponent(customerEmail)}`;
    
    // Redirect immediately
    window.location.href = thankYouUrl;
}

// Function to periodically check order status (optional)
function startOrderStatusCheck(orderCode, customerEmail) {
    let checkCount = 0;
    const maxChecks = 30; // Check for 5 minutes (30 * 10 seconds)
    
    const checkInterval = setInterval(async () => {
        checkCount++;
        
        try {
            const response = await fetch(`/api/orders/${orderCode}/status`);
            const data = await response.json();
            
            if (data.success && data.order.paymentStatus === 'paid') {
                clearInterval(checkInterval);
                checkOrderStatus(orderCode, customerEmail);
            }
        } catch (error) {
            console.log('Checking order status...', checkCount);
        }
        
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.log('Order status check timeout');
        }
    }, 10000); // Check every 10 seconds
}

// Toggle Floating Contact Bubble
function toggleContact() {
    const contactButtons = document.getElementById('contactButtons');
    const toggleBtn = document.querySelector('.contact-toggle');
    
    if (contactButtons.classList.contains('active')) {
        contactButtons.classList.remove('active');
        toggleBtn.classList.remove('active');
    } else {
        contactButtons.classList.add('active');
        toggleBtn.classList.add('active');
    }
}

// Close contact bubble when clicking outside
document.addEventListener('click', function(e) {
    const floatingContact = document.querySelector('.floating-contact');
    if (floatingContact && !floatingContact.contains(e.target)) {
        const contactButtons = document.getElementById('contactButtons');
        const toggleBtn = document.querySelector('.contact-toggle');
        if (contactButtons && contactButtons.classList.contains('active')) {
            contactButtons.classList.remove('active');
            toggleBtn.classList.remove('active');
        }
    }
});

/**
 * Search products by phrase (not individual words)
 */
function searchProducts() {
    const searchInput = document.getElementById('productSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    // Show/hide clear button
    if (searchTerm.length > 0) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    if (searchTerm.length === 0) {
        // Apply current category filter
        if (currentCategory === 'all') {
            filteredProducts = [...products];
        } else {
            filteredProducts = products.filter(product => 
                (product.category || 'Khác') === currentCategory
            );
        }
        renderProducts();
        updateSearchStats(filteredProducts.length, products.length);
        return;
    }
    
    // First filter by current category, then apply search
    let baseProducts = currentCategory === 'all' 
        ? products 
        : products.filter(product => (product.category || 'Khác') === currentCategory);
    
    filteredProducts = baseProducts.filter(product => {
        const searchableText = [
            product.name,
            product.category,
            product.description || ''
        ].join(' ').toLowerCase();
        
        // Check if the search term appears as a complete phrase
        return searchableText.includes(searchTerm);
    });
    
    renderProducts();
    updateSearchStats(filteredProducts.length, products.length);
}

/**
 * Clear search
 */
function clearSearch() {
    const searchInput = document.getElementById('productSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Apply current category filter
    if (currentCategory === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => 
            (product.category || 'Khác') === currentCategory
        );
    }
    renderProducts();
    updateSearchStats(filteredProducts.length, products.length);
}

/**
 * Update search statistics
 */
function updateSearchStats(filteredCount, totalCount) {
    const searchStats = document.getElementById('searchStats');
    
    if (!searchStats) return;
    
    if (filteredCount === totalCount) {
        searchStats.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Hiển thị tất cả ${totalCount} sản phẩm
        `;
    } else {
        searchStats.innerHTML = `
            <i class="fas fa-search"></i>
            Tìm thấy ${filteredCount} sản phẩm trong tổng số ${totalCount} sản phẩm
        `;
    }
}
