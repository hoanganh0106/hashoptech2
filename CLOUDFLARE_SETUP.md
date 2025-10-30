# Hướng dẫn cấu hình Cloudflare Images

## 1. Tạo Cloudflare Images Account

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vào **Images** > **Get started**
3. Chọn plan phù hợp (Free plan: 100,000 images/tháng)

## 2. Lấy Account ID và API Token

### Account ID:
1. Vào **My Profile** > **API Tokens**
2. Copy **Account ID** (dạng: `abc123def456...`)

### API Token:
1. Vào **My Profile** > **API Tokens** > **Create Token**
2. Chọn **Custom token**
3. Permissions:
   - **Account** > **Cloudflare Images** > **Edit**
4. Account Resources: **Include** > **Specific account** > Chọn account của bạn
5. Tạo token và copy (dạng: `abc123def456...`)

## 3. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Cloudflare Images API Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

## 4. Test Upload

1. Restart server: `npm start`
2. Vào admin panel
3. Thử upload ảnh sản phẩm
4. Kiểm tra console log để xem URL CDN

## 5. URL CDN Format

Sau khi upload thành công, ảnh sẽ có URL dạng:
```
https://imagedelivery.net/{ACCOUNT_ID}/{IMAGE_ID}
```

## 6. Troubleshooting

### Lỗi 10009: Token không hợp lệ
- Kiểm tra lại CLOUDFLARE_API_TOKEN
- Đảm bảo token có quyền Cloudflare Images

### Lỗi 10010: Account ID không đúng
- Kiểm tra lại CLOUDFLARE_ACCOUNT_ID
- Đảm bảo account đã enable Cloudflare Images

### Lỗi 10011: File không đúng định dạng
- Chỉ chấp nhận: JPG, PNG, GIF, WebP
- Kiểm tra file extension và MIME type
