# Hướng dẫn tạo Cloudflare Images API Token

## ❌ Vấn đề hiện tại
- **Error 9109**: Account ID không hợp lệ hoặc không tồn tại
- **Error 10000**: Token không đúng hoặc không có quyền

## ✅ Giải pháp: Tạo API Token mới

### Bước 1: Đăng nhập Cloudflare Dashboard
1. Truy cập: https://dash.cloudflare.com/
2. Đăng nhập với tài khoản Cloudflare

### Bước 2: Lấy Account ID
1. Vào **My Profile** (góc phải trên)
2. Chọn **API Tokens**
3. Copy **Account ID** (dạng: `abc123def456...`)

### Bước 3: Tạo API Token mới
1. Vào **My Profile** > **API Tokens**
2. Nhấn **Create Token**
3. Chọn **Custom token**

### Bước 4: Cấu hình Token
**Permissions:**
- **Account** > **Cloudflare Images** > **Edit**

**Account Resources:**
- **Include** > **Specific account** > Chọn account của bạn

**Zone Resources:**
- **Include** > **All zones** (hoặc bỏ trống)

### Bước 5: Tạo và lưu Token
1. Nhấn **Continue to summary**
2. Nhấn **Create Token**
3. **Copy token ngay** (chỉ hiển thị 1 lần)

### Bước 6: Cập nhật cấu hình
Thay thế trong file `routes/products.js` và `routes/admin.js`:

```javascript
// Thay đổi từ:
const CLOUDFLARE_ACCOUNT_ID = 'e5dc4daf5e54420f146839691036000f';
const CLOUDFLARE_API_TOKEN = '9xFxjdwfxE8ylWOyVGID12EyMxXIVmJYgJKuLeBc';

// Thành:
const CLOUDFLARE_ACCOUNT_ID = 'YOUR_NEW_ACCOUNT_ID';
const CLOUDFLARE_API_TOKEN = 'YOUR_NEW_API_TOKEN';
```

### Bước 7: Test lại
1. Restart server: `npm start`
2. Vào admin panel > Cài đặt
3. Nhấn "Test Cloudflare Images"

## 🔍 Kiểm tra Cloudflare Images
Đảm bảo account của bạn đã enable Cloudflare Images:
1. Vào **Images** trong dashboard
2. Nếu chưa có, chọn **Get started**
3. Chọn plan phù hợp (Free: 100,000 images/tháng)

## 📝 Lưu ý quan trọng
- Token chỉ hiển thị 1 lần khi tạo
- Lưu token ở nơi an toàn
- Không chia sẻ token với ai khác
- Token có thể có thời hạn (tùy cấu hình)
