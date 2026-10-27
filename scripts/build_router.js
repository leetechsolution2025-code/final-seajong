import fs from 'fs';

const clientServer = fs.readFileSync('/Users/leanhvan/client-skydoor/server.js', 'utf8');
const lines = clientServer.split('\n');

function getRange(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const section1 = getRange(7344, 7500);
const section2 = getRange(14095, 15093);
const section3 = getRange(15880, 16161);
const section4 = getRange(16954, 17789);

const combined = [section1, section2, section3, section4].join('\n\n');
const withRouter = combined.replace(/app\.(get|post|put|delete|patch)\(/g, 'router.$1(');

const header = `import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeFinancialReports } from '../services/financialReportEngine.js';
import { syncAllSubledgersToJournal } from '../services/journalSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Lỗi kết nối SQLite tại financeAccountingRouter:', err);
  else console.log('✓ FinanceAccountingRouter đã kết nối SQLite:', dbPath);
});

const router = express.Router();

function getCurrentDefaultPeriod() {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
}
`;

const footer = `
// Route đồng bộ thủ công
router.post('/api/finance/sync-journal', async (req, res) => {
  try {
    await syncAllSubledgersToJournal(db);
    res.json({ success: true, message: 'Đã đồng bộ toàn bộ công nợ và chi phí vào Sổ nhật ký chung thành công' });
  } catch (err) {
    console.error('Lỗi sync-journal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
`;

fs.writeFileSync('/Users/leanhvan/final-seajong/server/financeAccountingRouter.js', header + '\n' + withRouter + '\n' + footer);
console.log('Successfully written server/financeAccountingRouter.js');
