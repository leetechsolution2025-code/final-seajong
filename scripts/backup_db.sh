#!/usr/bin/env bash
# ==============================================================================
# SAO LƯU AN TOÀN CƠ SỞ DỮ LIỆU SQLITE (ONLINE .backup + INTEGRITY CHECK)
# Dùng được cả trên máy Local lẫn cron hàng ngày trên VPS:
#   0 2 * * * /root/final-seajong/scripts/backup_db.sh >> /root/final-seajong/backups/backup.log 2>&1
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DB_PATH="${APP_DIR}/prisma/dev.db"
BACKUP_DIR="${APP_DIR}/backups"
KEEP_DAYS="${KEEP_DAYS:-14}"
KEEP_MAX_FILES="${KEEP_MAX_FILES:-10}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/dev_${TIMESTAMP}.db"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_PATH}" ]; then
  echo "[ERROR] Không tìm thấy file database tại ${DB_PATH}"
  exit 1
fi

echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') Bắt đầu sao lưu ${DB_PATH} -> ${BACKUP_FILE}"
sqlite3 "${DB_PATH}" ".timeout 10000" ".backup '${BACKUP_FILE}'"

INTEGRITY="$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" | head -n 1)"
if [ "${INTEGRITY}" != "ok" ]; then
  echo "[ERROR] File backup không toàn vẹn (${INTEGRITY}), đang xóa file lỗi..."
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Dọn các bản backup cũ hơn KEEP_DAYS ngày và chỉ giữ tối đa KEEP_MAX_FILES bản mới nhất để tránh đầy ổ đĩa
find "${BACKUP_DIR}" -name "dev_*.db" -type f -mtime +"${KEEP_DAYS}" -delete
ls -1t "${BACKUP_DIR}"/dev_*.db 2>/dev/null | tail -n +$((KEEP_MAX_FILES + 1)) | while IFS= read -r old_backup; do
  [ -n "${old_backup}" ] && rm -f "${old_backup}"
done

SIZE="$(du -h "${BACKUP_FILE}" | awk '{print $1}')"
echo "[OK] Sao lưu thành công: ${BACKUP_FILE} (${SIZE}) | integrity_check: ok"
