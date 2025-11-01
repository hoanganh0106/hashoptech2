#!/bin/bash

# Script deploy đơn giản - chỉ pull code và restart
# Sử dụng: ./deploy-simple.sh

set -e

echo "🚀 Auto deploy từ Git..."

# Pull code mới nhất
echo "📥 Pull code từ GitHub..."
git pull origin main || git pull origin master

# Restart PM2
echo "🔄 Restart server..."
if pm2 describe hashoptech > /dev/null 2>&1; then
    pm2 reload hashoptech
else
    pm2 start ecosystem.config.js
    pm2 save
fi

echo "✅ Done!"

