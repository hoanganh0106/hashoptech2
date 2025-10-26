// API Configuration
const API_BASE = window.location.origin + '/api';

// Product Data
let products = [];

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();
    setupEventListeners();
});

// Load Products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        if (data.success) {
            products = data.products;
            renderProducts();
        }
    } catch (error) {
        console.error('Lỗi tải sản phẩm:', error);
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
    
    if (!products || products.length === 0) {
        console.warn('⚠️ No products to render');
        productsGrid.innerHTML = '<div style="text-align:center; padding:3rem; color:#999;">Chưa có sản phẩm nào</div>';
        return;
    }
    
    console.log('✅ Rendering', products.length, 'products');
    
    productsGrid.innerHTML = products.map(product => {
        // Lấy giá thấp nhất từ variants
        const minPrice = product.variants && product.variants.length > 0
            ? Math.min(...product.variants.map(v => v.price || 0))
            : (product.price || 0);

        const priceDisplay = product.variants && product.variants.length > 1
            ? `Từ ${formatPrice(minPrice)}`
            : formatPrice(minPrice);

        return `
            <div class="product-card" onclick="showProductDetails('${product.id}')">
                ${product.image_url ? `
                    <img src="${product.image_url}" alt="${product.name}" style="width:100%; height:200px; object-fit:cover;">
                ` : `
                    <div class="product-image">
                        <span style="font-size: 4rem;">${product.icon || '📦'}</span>
                    </div>
                `}
                <div class="product-info">
                    <div class="product-category">${product.category || 'Sản phẩm'}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    ${product.features && product.features.length > 0 ? `
                        <ul class="product-features">
                            ${product.features.slice(0, 2).map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div class="product-footer">
                        <div class="product-price">${priceDisplay}</div>
                        <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${product.id}', null, event);">
                            <i class="fas fa-cart-plus"></i> Thêm
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
            <p style="color: var(--text-color); font-size: 1.1rem;">${product.description}</p>
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
                                <input type="radio" name="variant" value="${variant.id || index}" ${index === 0 ? 'checked' : ''} style="margin-right: 1rem;" onchange="selectVariant(${productId}, ${index})">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark-color);">${variant.name}</div>
                                    <div style="font-size: 0.9rem; color: #666;">${durationText}${variant.description ? ' - ' + variant.description : ''}</div>
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

        <div style="background: var(--light-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--dark-color);">Tính năng nổi bật:</h3>
            <ul class="product-features">
                ${product.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="product-price" style="font-size: 2rem;" id="selectedPrice">
                ${hasVariants ? formatPrice(defaultVariant.price) : formatPrice(product.price)}
            </div>
            <button class="btn btn-primary" onclick="addToCartFromModal(${product.id}); closeModal();" style="padding: 1rem 2rem;">
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
function addToCartFromModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hasVariants = product.variants && product.variants.length > 0;
    const variant = hasVariants ? product.variants[selectedVariantIndex] : null;

    addToCart(productId, variant);
}

// Close Modal
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Add to Cart (hỗ trợ variants)
function addToCart(productId, variant = null, event = null) {
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
    
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; color: var(--success-color); margin-bottom: 1rem;">
                ✅
            </div>
            <h2 style="color: var(--dark-color); margin-bottom: 1rem;">Đặt hàng thành công!</h2>
            <p style="color: var(--text-color); margin-bottom: 2rem;">
                Mã đơn hàng của bạn: <strong>${order.order_code}</strong>
            </p>
        </div>

        <div style="background: var(--light-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--dark-color);">💳 Thông tin thanh toán</h3>
            
            ${payment.qrUrl ? `
                <div style="text-align: center; margin-bottom: 1rem;">
                    <img src="${payment.qrUrl}" alt="QR Code" style="max-width: 300px; border-radius: 8px;">
                </div>
            ` : ''}
            
            <div style="background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p><strong>🏦 Ngân hàng:</strong> ${payment.bankName}</p>
                <p><strong>📊 Số tài khoản:</strong> <code style="background: var(--light-color); padding: 0.25rem 0.5rem; border-radius: 4px;">${payment.accountNumber}</code></p>
                <p><strong>💰 Số tiền:</strong> <strong style="color: var(--accent-color);">${formatPrice(order.total_amount)}</strong></p>
                <p><strong>✍️ Nội dung:</strong> <code style="background: var(--light-color); padding: 0.25rem 0.5rem; border-radius: 4px;">${payment.content}</code></p>
            </div>

            <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h4 style="color: #92400e; margin-bottom: 0.5rem;">⚠️ Lưu ý quan trọng:</h4>
                <ul style="color: #92400e; margin-left: 1.5rem;">
                    ${payment.instructions.map(inst => `<li style="margin-bottom: 0.25rem;">${inst}</li>`).join('')}
                </ul>
            </div>
        </div>

        <button class="btn btn-primary btn-block" onclick="closeModal()">
            Đã hiểu
        </button>
    `;

    document.getElementById('productModal').classList.add('active');
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

        // Validate
        if (cart.length === 0) {
            showNotification('Giỏ hàng trống!', 'warning');
            return;
        }

        const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

        showNotification('Đang xử lý đơn hàng...', 'info');

        try {
            // Create order via API
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    payment_method: paymentMethod,
                    order_note: orderNote,
                    items: cart,
                    total_amount: totalAmount
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
                showNotification(data.error || 'Lỗi tạo đơn hàng', 'error');
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
