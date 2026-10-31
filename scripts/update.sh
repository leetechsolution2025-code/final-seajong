#!/usr/bin/env bash
# ==============================================================================
# CẬP NHẬT & ĐỒNG BỘ MÃ NGUỒN TỪ MÁY LOCAL LÊN VPS (1-CLICK DEPLOY)
# Cách dùng trên máy Mac/Local:
#   bash scripts/update.sh
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}🚀 BẮT ĐẦU QUÁ TRÌNH BUILD & CẬP NHẬT LÊN VPS: ${DOMAIN}${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Tham số SSH an toàn
SSH_OPTS="-o StrictHostKeyChecking=accept-new"
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

# ------------------------------------------------------------------------------
# BƯỚC 1: KIỂM TRA KẾT NỐI SSH TỚI VPS
# ------------------------------------------------------------------------------
log_info "1. Kiểm tra kết nối SSH tới ${SSH_USER}@${SSH_HOST}..."
if ! ssh $SSH_OPTS -o ConnectTimeout=10 "${SSH_USER}@${SSH_HOST}" "mkdir -p ${SSH_DIR}/prisma"; then
    log_err "Không thể kết nối SSH tới ${SSH_USER}@${SSH_HOST}. Vui lòng kiểm tra mạng hoặc SSH Key!"
    exit 1
fi
log_ok "Kết nối SSH thành công! Thư mục đích: ${SSH_DIR}"

# ------------------------------------------------------------------------------
# BƯỚC 2: CẬP NHẬT PHIÊN BẢN & BUILD FRONTEND NGAY TRÊN MÁY LOCAL
# ------------------------------------------------------------------------------
log_info "2. Đang tạo thông tin phiên bản mới và đóng gói giao diện (npm run build) trên máy Local..."
cd "$APP_DIR"

BUILD_VERSION="1.0.$(date +%Y%m%d.%H%M)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > "${APP_DIR}/public/version.json" <<EOF
{
  "version": "${BUILD_VERSION}",
  "buildTime": "${BUILD_TIME}",
  "notes": "Cập nhật tính năng và tối ưu hóa hệ thống Seajong"
}
EOF
log_info "Đã ghi nhận phiên bản mới: v${BUILD_VERSION} (${BUILD_TIME})"

if [ "$1" = "--skip-build" ] && [ -d "${APP_DIR}/dist" ]; then
    cp -f "${APP_DIR}/public/version.json" "${APP_DIR}/dist/version.json"
    log_ok "Sử dụng bản build dist/ đã đóng gói sẵn!"
else
    npm run build
    log_ok "Đã build xong thư mục dist/ thành công!"
fi

# ------------------------------------------------------------------------------
# BƯỚC 3: KIỂM TRA CƠ SỞ DỮ LIỆU TRÊN VPS ĐỂ QUYẾT ĐỊNH CHẾ ĐỘ ĐỒNG BỘ
# ------------------------------------------------------------------------------
log_info "3. Kiểm tra trạng thái Database (prisma/dev.db) trên VPS..."
RSYNC_EXCLUDES=(
    "--exclude=node_modules"
    "--exclude=.git"
    "--exclude=.env"
    "--exclude=*.log"
    "--exclude=.DS_Store"
    "--exclude=backups"
    "--exclude=backup_data"
    "--exclude=/dev.db"
    "--exclude=/dev.db-journal"
)

if ssh $SSH_OPTS "${SSH_USER}@${SSH_HOST}" "sqlite3 ${SSH_DIR}/prisma/dev.db 'SELECT count(*) FROM User;' >/dev/null 2>&1"; then
    log_warn "Phát hiện prisma/dev.db hợp lệ đã tồn tại trên VPS -> BẢO VỆ DỮ LIỆU ĐANG CHẠY (Không ghi đè toàn bộ prisma/dev.db và uploads/)"
    RSYNC_EXCLUDES+=("--exclude=/prisma/dev.db" "--exclude=/prisma/dev.db-journal" "--exclude=/prisma/dev.db-wal" "--exclude=/prisma/dev.db-shm" "--exclude=uploads/*" "--exclude=public/uploads/*")

    # Trích xuất các bảng được cấu hình trong sync_tables_config.json ra file SQL
    if [ -f "${SCRIPT_DIR}/sync_custom_tables.cjs" ] && [ -f "${SCRIPT_DIR}/sync_tables_config.json" ]; then
        log_info "3.1. Đang trích xuất dữ liệu các bảng được chọn trong sync_tables_config.json..."
        node "${SCRIPT_DIR}/sync_custom_tables.cjs" export
    fi
else
    log_info "Chưa có prisma/dev.db đầy đủ trên VPS -> Sẽ tải bản prisma/dev.db và uploads/ khởi tạo từ máy Local lên VPS."
    ssh $SSH_OPTS "${SSH_USER}@${SSH_HOST}" "pm2 stop ${APP_NAME} >/dev/null 2>&1 || true; rm -f ${SSH_DIR}/prisma/dev.db ${SSH_DIR}/prisma/dev.db-journal ${SSH_DIR}/prisma/dev.db-wal ${SSH_DIR}/prisma/dev.db-shm"
    rm -f "${SCRIPT_DIR}/sync_selected_tables.sql"
fi

# ------------------------------------------------------------------------------
# BƯỚC 4: ĐỒNG BỘ MÃ NGUỒN & BẢN BUILD LÊN VPS BẰNG RSYNC
# ------------------------------------------------------------------------------
log_info "4. Đang đồng bộ mã nguồn và bản build lên ${SSH_USER}@${SSH_HOST}:${SSH_DIR}..."
rsync -avz --delete \
    "${RSYNC_EXCLUDES[@]}" \
    -e "ssh $SSH_OPTS" \
    "${APP_DIR}/" "${SSH_USER}@${SSH_HOST}:${SSH_DIR}/"

log_ok "Đồng bộ file lên VPS hoàn tất!"

# ------------------------------------------------------------------------------
# BƯỚC 5: CÀI ĐẶT THƯ VIỆN, CẤU HÌNH NGINX & KHỞI ĐỘNG LẠI PM2 TRÊN VPS
# ------------------------------------------------------------------------------
log_info "5. Đang cập nhật thư viện, cấu hình Nginx và khởi động lại dịch vụ trên VPS..."

ssh $SSH_OPTS "${SSH_USER}@${SSH_HOST}" "bash -s" <<EOF
set -e
cd "${SSH_DIR}"

if [ ! -f ".env" ]; then
    cat > ".env" <<'ENV_EOF'
DATABASE_URL="file:./dev.db"
JWT_SECRET="seajong_jwt_secret_key_2026_final_production"
PORT=${PORT}
CLIENT_SHORT_NAME="seajong"
CLIENT_NAME="Công ty Cổ phần Seajong Faucet Việt Nam"
ENV_EOF
fi

echo "-> Đang kiểm tra và cài đặt dependencies (npm install --omit=dev)..."
npm install --omit=dev --prefer-offline

echo "-> Đang khởi tạo Prisma Client (npx prisma generate)..."
npx prisma generate

# Nếu có file SQL đồng bộ các bảng được chọn từ Local thì nạp vào DB trên VPS
if [ -f "scripts/sync_selected_tables.sql" ]; then
    echo "-> Đang đồng bộ dữ liệu các bảng được chọn từ Local vào prisma/dev.db trên VPS..."
    node scripts/sync_custom_tables.cjs import
    rm -f scripts/sync_selected_tables.sql
fi

echo "-> Đảm bảo quyền thư mục uploads và scripts..."
mkdir -p uploads public/uploads backups
chmod -R 755 uploads public/uploads
chmod +x scripts/*.sh 2>/dev/null || true

echo "-> Kiểm tra cấu hình Nginx cho tên miền ${DOMAIN} (Port nội bộ: ${PORT})..."
if [ ! -f "${NGINX_CONF}" ]; then
    echo "-> Tạo mới cấu hình Nginx tại ${NGINX_CONF}..."
    cat > "${NGINX_CONF}" <<'NGINX_EOF'
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX_EOF
    ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}"
    nginx -t && systemctl reload nginx

    if command -v certbot > /dev/null 2>&1; then
        echo "-> Đang kiểm tra và kích hoạt chứng chỉ SSL (HTTPS) cho ${DOMAIN}..."
        certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect --register-unsafely-without-email || echo "⚠️ Chưa thể cấp SSL tự động (có thể DNS chưa trỏ hoàn tất), hệ thống vẫn hoạt động bình thường qua HTTP."
    fi
fi

echo "-> Đang khởi động lại ứng dụng qua scripts/start.sh..."
bash scripts/start.sh

echo "-> Kiểm tra và reload Nginx..."
if command -v nginx > /dev/null 2>&1; then
    nginx -t && systemctl reload nginx
fi
EOF

# Dọn file SQL tạm trên máy Local (nếu có)
rm -f "${SCRIPT_DIR}/sync_selected_tables.sql"

# ------------------------------------------------------------------------------
# BƯỚC 6: KIỂM TRA PHẢN HỒI TỪ TÊN MIỀN PUBLIC
# ------------------------------------------------------------------------------
log_info "6. Kiểm tra trạng thái hoạt động từ tên miền https://${DOMAIN} ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" || curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}" || echo "000")

echo -e "${BLUE}======================================================================${NC}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    log_ok "🎉 CẬP NHẬT THÀNH CÔNG! Hệ thống đã sẵn sàng tại: https://${DOMAIN} (HTTP $HTTP_CODE)"
else
    log_warn "Đã cập nhật lên VPS thành công (Mã phản hồi tên miền: $HTTP_CODE). Kiểm tra trực tiếp: http://${SSH_HOST}:${PORT} hoặc https://${DOMAIN}"
fi
echo -e "${BLUE}======================================================================${NC}"

