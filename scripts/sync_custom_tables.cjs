/**
 * SCRIPT ĐỒNG BỘ DỮ LIỆU CÁC BẢNG TÙY CHỌN TỪ LOCAL LÊN VPS
 * Cách hoạt động:
 * 1. Trên máy Local (mode = 'export'): Đọc danh sách bảng trong sync_tables_config.json,
 *    trích xuất cấu trúc bảng và toàn bộ dữ liệu các bảng đó từ prisma/dev.db ra file SQL (sync_selected_tables.sql).
 * 2. Trên máy VPS (mode = 'import'): Đọc file sync_selected_tables.sql và cập nhật (GHI ĐÈ)
 *    chỉ đúng các bảng đã chọn vào prisma/dev.db trên VPS, giữ nguyên tuyệt đối dữ liệu các bảng còn lại.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mode = process.argv[2] || 'export';
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'prisma', 'dev.db');
const CONFIG_PATH = path.join(__dirname, 'sync_tables_config.json');
const SQL_OUTPUT_PATH = path.join(__dirname, 'sync_selected_tables.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Không tìm thấy file cơ sở dữ liệu tại: ${DB_PATH}`);
  process.exit(1);
}

function queryJson(sql) {
  try {
    const out = execFileSync('sqlite3', ['-json', DB_PATH, sql], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return out.trim() ? JSON.parse(out) : [];
  } catch (err) {
    return [];
  }
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportTables() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Không tìm thấy file cấu hình: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tables = Array.isArray(config.tables_to_sync) ? config.tables_to_sync : [];

  if (tables.length === 0) {
    console.log('ℹ️ Danh sách tables_to_sync trống. Không có bảng nào cần trích xuất.');
    if (fs.existsSync(SQL_OUTPUT_PATH)) fs.unlinkSync(SQL_OUTPUT_PATH);
    process.exit(0);
  }

  console.log(`📦 Đang trích xuất ${tables.length} bảng từ Local DB: ${tables.join(', ')}...`);

  const sqlLines = [
    '-- ============================================================================',
    `-- AUTO-GENERATED SQL SYNC FILE (${new Date().toISOString()})`,
    `-- Tables: ${tables.join(', ')}`,
    '-- ============================================================================',
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    '',
  ];

  for (const table of tables) {
    const masterRows = queryJson(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=${escapeSqlValue(table)};`
    );

    if (!masterRows || masterRows.length === 0) {
      console.warn(`⚠️ Bảng '${table}' không tồn tại trong Local DB, bỏ qua.`);
      continue;
    }

    const createTableSql = masterRows[0].sql.replace(
      /^CREATE TABLE /i,
      'CREATE TABLE IF NOT EXISTS '
    );
    sqlLines.push(`-- Bảng: ${table}`);
    sqlLines.push(`${createTableSql};`);
    sqlLines.push(`DELETE FROM "${table}";`);

    const rows = queryJson(`SELECT * FROM "${table}";`);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]).map((c) => `"${c}"`).join(', ');
      for (const row of rows) {
        const values = Object.values(row).map(escapeSqlValue).join(', ');
        sqlLines.push(`INSERT INTO "${table}" (${columns}) VALUES (${values});`);
      }
    }
    sqlLines.push('');
    console.log(`   ✔ Bảng '${table}': đã xuất ${rows.length} bản ghi.`);
  }

  sqlLines.push('COMMIT;');
  sqlLines.push('PRAGMA foreign_keys = ON;');

  fs.writeFileSync(SQL_OUTPUT_PATH, sqlLines.join('\n'), 'utf8');
  console.log(`✅ Đã xuất dữ liệu thành công ra file: ${SQL_OUTPUT_PATH}`);
}

async function importTables() {
  if (!fs.existsSync(SQL_OUTPUT_PATH)) {
    console.log('ℹ️ Không tìm thấy file sync_selected_tables.sql. Bỏ qua bước đồng bộ bảng tùy chọn.');
    process.exit(0);
  }

  console.log(`🔄 Đang nạp dữ liệu các bảng tùy chọn vào Database trên VPS (${DB_PATH})...`);
  try {
    execFileSync('sqlite3', [DB_PATH, `.read ${SQL_OUTPUT_PATH}`], {
      stdio: 'inherit',
    });
    console.log('✅ Đã đồng bộ các bảng được chọn vào Database trên VPS thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi thực thi SQL trên VPS:', err.message);
    process.exit(1);
  }
}

if (mode === 'export') {
  exportTables();
} else if (mode === 'import') {
  importTables();
} else {
  console.error(`Chế độ không hợp lệ: ${mode}. Sử dụng 'export' hoặc 'import'.`);
  process.exit(1);
}

