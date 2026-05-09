import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 在 Azure 用 /home/data，本機用當前專案下的 db 資料夾
const isAzure = !!process.env.WEBSITE_SITE_NAME;
const dataDir = isAzure ? '/home/data/db' : path.join(__dirname, 'db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sqlite.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('無法開啟資料庫：', err.message);
  } else {
    console.log('成功連接至 SQLite 資料庫。資料庫路徑：', dbPath);
    
    // 初始化(建立) scallion_prices 資料表
    // 如果資料表已存在就不會再建立一次
    db.run(`CREATE TABLE IF NOT EXISTS scallion_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        price REAL NOT NULL
    )`, (err) => {
      if (err) {
        console.error('建立表格失敗：', err.message);
      } else {
        console.log('scallion_prices 表格已就緒');
      }
    });
  }
});

export default db;
