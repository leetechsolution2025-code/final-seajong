#!/usr/bin/env bash
# ==============================================================================
# DỪNG ỨNG DỤNG TRONG PM2
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log_info "Đang dừng ứng dụng '$APP_NAME'..."
    pm2 stop "$APP_NAME"
    pm2 save
    log_ok "Đã dừng ứng dụng '$APP_NAME' thành công."
else
    log_warn "Ứng dụng '$APP_NAME' hiện không tồn tại trong danh sách PM2."
fi

