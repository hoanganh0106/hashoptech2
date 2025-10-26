# 🛍️ HaShopTech - Website Bán Tài Khoản

Website thương mại điện tử chuyên bán các loại tài khoản với thanh toán tự động qua Sepay và thông báo Telegram.

## ✨ Tính Năng

- 🛒 **Website bán hàng**: Hiển thị sản phẩm, giỏ hàng, thanh toán
- 💰 **Thanh toán tự động**: Tích hợp Sepay API để tự động xác nhận thanh toán
- 📱 **Thông báo Telegram**: Gửi thông báo khi có đơn hàng thành công
- 🔐 **Quản trị Admin**: Dashboard quản lý sản phẩm, đơn hàng, tài khoản
- 📦 **Quản lý sản phẩm**: Thêm/sửa/xóa sản phẩm với nhiều variant (biến thể)
- 💾 **MongoDB Atlas**: Lưu trữ dữ liệu trên cloud

## 🛠️ Công Nghệ

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Payment**: Sepay API
- **Notification**: Telegram Bot API
- **Process Manager**: PM2

## 📋 Yêu Cầu

- Node.js >= 14.x
- MongoDB Atlas account
- Sepay API key
- Telegram Bot token

## 🚀 Cài Đặt Local

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/hashoptech.git
cd hashoptech
```

### 2. Cài Đặt Dependencies

```bash
npm install
```

### 3. Cấu Hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Sau đó chỉnh sửa file `.env` với thông tin thực của bạn:

```env
# Server
PORT=3001
NODE_ENV=development

# JWT Secret (Tạo chuỗi ngẫu nhiên mạnh)
JWT_SECRET=your-super-secret-jwt-key-here

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_EMAIL=admin@hashoptech.me

# Sepay
SEPAY_API_KEY=your-sepay-api-key
SEPAY_ACCOUNT_NUMBER=your-account-number
SEPAY_BANK_CODE=VPB
SEPAY_WEBHOOK_SECRET=your-webhook-secret
SEPAY_API_URL=https://my.sepay.vn/userapi

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# MongoDB
MONGODB_URI=your-mongodb-atlas-uri
MONGODB_DB_NAME=hashoptech

# Frontend
FRONTEND_URL=http://localhost:3001
```

### 4. Khởi Động Server

```bash
npm start
```

Website sẽ chạy tại: `http://localhost:3001`

## 🌐 Deploy Lên EC2 (Linux)

### Bước 1: Kết Nối SSH

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### Bước 2: Cài Đặt Node.js & PM2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PM2
sudo npm install -g pm2

# Kiểm tra
node -v
npm -v
pm2 -v
```

### Bước 3: Cài Đặt Nginx (Optional - cho HTTPS)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Bước 4: Clone & Setup Project

```bash
# Clone repository
cd /home/ubuntu
git clone https://github.com/yourusername/hashoptech.git
cd hashoptech

# Cài dependencies
npm install --production

# Tạo thư mục logs
mkdir -p logs

# Tạo file .env
nano .env
```

Paste nội dung từ `.env.example` và điền thông tin thực:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-production-secret-key
# ... điền các thông tin khác
FRONTEND_URL=https://hashoptech.me
```

**Lưu file**: `Ctrl + X`, `Y`, `Enter`

### Bước 5: Khởi Động với PM2

```bash
# Khởi động app
pm2 start ecosystem.config.js

# Xem logs
pm2 logs hashoptech

# Xem trạng thái
pm2 status

# Tự động khởi động khi reboot
pm2 startup
pm2 save
```

### Bước 6: Cấu Hình Nginx (cho HTTPS)

```bash
sudo nano /etc/nginx/sites-available/hashoptech
```

Paste nội dung:

```nginx
server {
    listen 80;
    server_name hashoptech.me www.hashoptech.me;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt site:

```bash
sudo ln -s /etc/nginx/sites-available/hashoptech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Bước 7: Cài SSL (Let's Encrypt)

```bash
# Cài Certbot
sudo apt install -y certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d hashoptech.me -d www.hashoptech.me
```

### Bước 8: Cấu Hình Firewall

```bash
# Mở port HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 🔄 Update Code Trên Server

```bash
cd /home/ubuntu/hashoptech

# Pull code mới
git pull origin main

# Cài dependencies mới (nếu có)
npm install --production

# Restart PM2
pm2 restart hashoptech

# Hoặc reload không downtime
pm2 reload hashoptech
```

## 📱 Quản Lý PM2

```bash
# Xem logs
pm2 logs hashoptech

# Xem trạng thái
pm2 status

# Restart
pm2 restart hashoptech

# Stop
pm2 stop hashoptech

# Delete
pm2 delete hashoptech

# Monitor
pm2 monit
```

## 📂 Cấu Trúc Thư Mục

```
hashoptech/
├── index.html              # Trang chủ khách hàng
├── admin.html              # Trang quản trị
├── style.css               # CSS khách hàng
├── admin-style.css         # CSS admin
├── script.js               # JS khách hàng
├── admin-script.js         # JS admin
├── server.js               # Server chính
├── config.js               # Cấu hình (đọc từ .env)
├── database.js             # Kết nối MongoDB
├── ecosystem.config.js     # Cấu hình PM2
├── routes/                 # API routes
│   ├── admin.js
│   ├── products.js
│   ├── orders.js
│   └── webhook.js
├── models/                 # MongoDB models
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   └── Account.js
├── services/               # Services
│   └── qrcode.js
├── middleware/             # Middleware
│   └── auth.js
└── uploads/                # Upload images
```

## 🔧 Scripts

```bash
npm start           # Khởi động server
npm run dev         # Khởi động với nodemon (development)
npm run init-db     # Khởi tạo database (tạo admin)
```

## 🐛 Troubleshooting

### Port đã được sử dụng

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux
lsof -ti:3001 | xargs kill -9
```

### PM2 không tự động khởi động

```bash
pm2 startup
pm2 save
```

### MongoDB connection error

- Kiểm tra IP whitelist trên MongoDB Atlas (thêm `0.0.0.0/0` để cho phép tất cả)
- Kiểm tra username/password
- Kiểm tra URL encode password nếu có ký tự đặc biệt

### Sepay webhook không hoạt động

- Đảm bảo webhook URL công khai (dùng ngrok cho test local)
- Kiểm tra logs: `pm2 logs hashoptech`
- Test webhook bằng Postman

## 📞 Liên Hệ

- **Telegram**: [@hoanganh1162](https://t.me/hoanganh1162)
- **Facebook**: [facebook.com/HoangAnh.Sw](https://facebook.com/HoangAnh.Sw)

## 📝 License

Private Project - All Rights Reserved
