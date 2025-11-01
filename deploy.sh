#!/bin/bash

# Script tự động deploy HaShopTech lên EC2
# Sử dụng: ./deploy.sh
# Hoặc: bash deploy.sh

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

# Lưu commit hiện tại để so sánh
OLD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

# Pull code mới nhất
echo -e "${BLUE}📥 Pull code mới nhất từ GitHub...${NC}"
git fetch origin
git pull origin main || git pull origin master

# Kiểm tra xem có code mới không
NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ "$OLD_COMMIT" == "$NEW_COMMIT" ] && [ -n "$OLD_COMMIT" ]; then
    echo -e "${YELLOW}ℹ️  Không có code mới, đang restart server...${NC}"
else
    echo -e "${GREEN}✅ Đã pull code mới${NC}"
    echo -e "${BLUE}   Commit cũ: ${OLD_COMMIT:0:7}${NC}"
    echo -e "${BLUE}   Commit mới: ${NEW_COMMIT:0:7}${NC}"
    
    # Cài đặt dependencies nếu có thay đổi
    if git diff --name-only $OLD_COMMIT $NEW_COMMIT | grep -q "package.json\|package-lock.json"; then
        echo -e "${BLUE}📦 Cài đặt dependencies...${NC}"
        npm install --production
    else
        echo -e "${BLUE}ℹ️  Không có thay đổi dependencies, bỏ qua npm install${NC}"
    fi
fi

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Không tìm thấy file .env!${NC}"
    if [ -f .env.example ]; then
        echo -e "${YELLOW}📝 Tạo file .env từ .env.example...${NC}"
        cp .env.example .env
    fi
    echo -e "${YELLOW}⚠️  Vui lòng chỉnh sửa file .env với thông tin thực của bạn!${NC}"
    exit 1
fi

# Tạo thư mục logs và uploads nếu chưa có
mkdir -p logs
mkdir -p uploads/products
mkdir -p uploads/icons

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

# Đợi một chút để app khởi động
sleep 2

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

