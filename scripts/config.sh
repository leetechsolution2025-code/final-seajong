#!/usr/bin/env bash
# ==============================================================================
# CẤU HÌNH DỰ ÁN: FINAL-SEAJONG
# Chỉnh sửa file này để phù hợp với môi trường Server (Ubuntu / Debian)
# ==============================================================================

# 1. Tên ứng dụng (Dùng cho PM2 & Nginx config)
export APP_NAME="final-seajong"

# 2. Cổng nội bộ (Port mà Node.js / Express chạy, Nginx sẽ proxy_pass vào đây)
# Lưu ý: Cổng 3365 được chọn độc lập, không tranh chấp với các dịch vụ đang chạy trên VPS
export PORT=3365

# 3. Tên miền chính thức (Hoặc IP nếu chưa có domain)
export DOMAIN="fseajong.leetech.vn"

# 4. Đường dẫn thư mục gốc của dự án (Tự động nhận diện thư mục cha của /scripts)
export APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 5. Cấu hình Nginx
export NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# 6. File log triển khai
export LOG_FILE="/var/log/deploy_${APP_NAME}.log"

# 7. Cấu hình kết nối SSH tới VPS (Dùng khi chạy update.sh từ máy Local)
export SSH_HOST="14.225.198.32"
export SSH_USER="root"
export SSH_DIR="/root/final-seajong"
export SSH_KEY="${HOME}/.ssh/id_ed25519"

