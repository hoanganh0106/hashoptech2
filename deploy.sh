#!/bin/bash

# Script tự động deploy HaShopTech lên EC2
# Sử dụng: ./deploy.sh

set -e  # Dừng nếu có lỗi

echo "🚀 Bắt đầu deploy HaShopTech..."
echo ""

# Màu sắc cho output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kiểm tra git status
echo -e "${BLUE}📋 Kiểm tra git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Có thay đổi chưa commit:${NC}"
    git status -s
    echo ""
    read -p "Bạn có muốn commit những thay đổi này? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Nhập commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Đã commit${NC}"
    fi
fi

# Pull code mới nhất
echo -e "${BLUE}📥 Pull code mới nhất từ GitHub...${NC}"
git pull origin main || git pull origin master

# Cài đặt dependencies
echo -e "${BLUE}📦 Cài đặt dependencies...${NC}"
npm install --production

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Không tìm thấy file .env!${NC}"
    echo -e "${YELLOW}📝 Tạo file .env từ .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Vui lòng chỉnh sửa file .env với thông tin thực của bạn!${NC}"
    exit 1
fi

# Tạo thư mục logs nếu chưa có
mkdir -p logs

# Kiểm tra PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 chưa được cài đặt. Đang cài đặt...${NC}"
    npm install -g pm2
fi

# Restart hoặc start app với PM2
echo -e "${BLUE}🔄 Restart application với PM2...${NC}"
if pm2 describe hashoptech > /dev/null 2>&1; then
    echo -e "${BLUE}🔄 Reload app (zero downtime)...${NC}"
    pm2 reload hashoptech
else
    echo -e "${BLUE}🚀 Khởi động app lần đầu...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
fi

# Hiển thị trạng thái
echo ""
echo -e "${GREEN}✅ Deploy thành công!${NC}"
echo ""
echo -e "${BLUE}📊 Trạng thái ứng dụng:${NC}"
pm2 status

echo ""
echo -e "${BLUE}📝 Các lệnh hữu ích:${NC}"
echo -e "  ${YELLOW}pm2 logs hashoptech${NC}     - Xem logs"
echo -e "  ${YELLOW}pm2 monit${NC}                - Monitor real-time"
echo -e "  ${YELLOW}pm2 restart hashoptech${NC}   - Restart app"
echo -e "  ${YELLOW}pm2 stop hashoptech${NC}      - Stop app"
echo ""
echo -e "${GREEN}🎉 Hoàn tất!${NC}"

