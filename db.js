import sqlite3 from 'sqlite3';  // 匯入 SQLite3 套件
import fs from 'fs';  // 匯入檔案系統模組
import path from 'path';  // 匯入路徑處理模組
import { fileURLToPath } from 'url';  // 匯入 fileURLToPath（因為現在用的是 ES Module）

const __filename = fileURLToPath(import.meta.url);  // 取得目前這個檔案的完整路徑
const __dirname = path.dirname(__filename);  // 取得目前檔案所在的資料夾路徑

// 判斷目前程式是不是跑在 Azure App Service 上
const isAzure = !!process.env.WEBSITE_SITE_NAME;

// 判斷目前程式是不是跑在 Render 上
const isRender = !!process.env.RENDER;

// 設定資料庫資料夾位置
// Azure 用 /home/data/db
// Render 如果有設定 Persistent Disk，通常用 /var/data/db
// 如果不是 Azure / Render，就代表是本機，使用目前專案下的 db 資料夾
let dataDir;

if (isAzure) {
  dataDir = '/home/data/db';
} 
else if (isRender && fs.existsSync('/var/data')) {
  dataDir = '/var/data/db';
} 
else {
  dataDir = path.join(__dirname, 'db');
}

// 確認資料夾存在
if (!fs.existsSync(dataDir)) {  // 如果資料夾不存在，就執行下面建立資料夾
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sqlite.db');  // 設定資料庫檔案路徑（把資料夾路徑和資料庫檔案名稱組合起來）

// 建立 SQLite 資料庫連線
// 開啟 sqlite.db 這個資料庫檔案。
// 如果資料庫不存在，SQLite 會嘗試自動建立。
// 後面的 (err) => { ... } 是 callback function，資料庫開啟完成後，會執行這個函式。如果開啟失敗，錯誤會放在 err 裡
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

export default db;  // 匯出 db 物件，這樣其他檔案（例如 app.js）就可以 import db.js，然後使用這個 db 物件來操作資料庫