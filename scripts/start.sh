#!/usr/bin/env bash
# ==============================================================================
# KHỞI ĐỘNG ỨNG DỤNG VỚI PM2
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$APP_DIR"

# 1. Đảm bảo đã có thư mục build
if [ ! -d "dist" ]; then
    log_info "Chưa tìm thấy thư mục dist/. Đang tiến hành build frontend..."
    npm run build
fi

# 2. Tạo/Cập nhật file cấu hình PM2 (ecosystem.config.cjs) để truyền PORT chuẩn
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [
    {
      name: '${APP_NAME}',
      script: 'server.js',
      cwd: '${APP_DIR}',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${PORT},
        DATABASE_URL: 'file:./dev.db'
      }
    }
  ]
};
EOF

# 3. Khởi động hoặc khởi động lại PM2
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log_info "Ứng dụng '$APP_NAME' đã tồn tại trong PM2. Đang khởi động lại (Restart)..."
    pm2 restart ecosystem.config.cjs --update-env
else
    log_info "Đang khởi động mới ứng dụng '$APP_NAME' trên cổng $PORT..."
    pm2 start ecosystem.config.cjs
fi

# 4. Lưu trạng thái PM2
pm2 save

# 5. Kiểm tra phản hồi (Health Check)
log_info "Đang kiểm tra trạng thái phản hồi tại http://localhost:${PORT}/api/health ..."
sleep 3
if curl -s "http://localhost:${PORT}/api/health" > /dev/null || curl -s "http://localhost:${PORT}" > /dev/null; then
    log_ok "Ứng dụng '$APP_NAME' đã chạy thành công tại http://localhost:${PORT}!"
else
    log_err "Ứng dụng chưa phản hồi trên cổng ${PORT}. Vui lòng kiểm tra log bằng lệnh: pm2 logs ${APP_NAME}"
fi

