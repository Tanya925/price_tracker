import express from 'express';  // 匯入 Express 框架
import fs from 'fs';  // 匯入 Node.js 內建的檔案系統模組
import path from 'path';  // 匯入路徑處理工具
import { fileURLToPath } from 'url';  // 匯入 fileURLToPat（因為現在使用的是 ES Module）
import cookieParser from 'cookie-parser';  // 匯入 Cookie 解析中介軟體（可以讓後端比較方便讀取瀏覽器送來的 Cookie）
import logger from 'morgan';  // 匯入 morgan（morgan 是記錄 HTTP 請求的中介軟體。例如你打開網站時，終端機會看到：GET /api/prices 200方便除錯）
import sqlite3 from 'sqlite3';  // 匯入 SQLite3 套件（這樣 Express 後端就可以連接 SQLite 資料庫）

import indexRouter from './routes/index.js';  // 匯入首頁路由
import usersRouter from './routes/users.js';  // 匯入使用者路由

const __filename = fileURLToPath(import.meta.url);  // 取得目前這個檔案的完整路徑
const __dirname = path.dirname(__filename);  // 取得目前檔案所在的資料夾路徑

// 在 Azure 用 /home/data，本機用當前專案下的 db 資料夾
const isAzure = !!process.env.WEBSITE_SITE_NAME;  // 判斷程式是不是跑在 Azure App Service 上，存成布林值 (isAzure = true 代表在 Azure 上，isAzure = false 代表在本機)
const dataDir = isAzure ? '/home/data/db' : path.join(__dirname, 'db');  // 設定資料庫資料夾位置

if (!fs.existsSync(dataDir)) {  // 檢查 dataDir 這個資料夾是否存在（如果資料夾不存在，就進入 {} 裡面）
  fs.mkdirSync(dataDir, { recursive: true });  // 如果資料夾不存在，就建立這個資料夾（recursive: true 的意思是：如果上層資料夾也不存在，就一起建立）
}

// 設定 SQLite 資料庫路徑
// 如果在 Azure 會長這樣：/home/data/db/sqlite.db；如果在本機會長：你的專案/db/sqlite.db
const dbPath = path.join(dataDir, 'sqlite.db');  

// 建立 SQLite 資料庫連線
const db = new sqlite3.Database(dbPath, (err) => {  
  if (err) {
    console.error('app.js: 無法開啟資料庫:', err.message);
  } else {
    console.log('app.js: 成功連接至 SQLite 資料庫:', dbPath);
    
    // 執行 SQL 指令，建立資料表（如果 scallion_prices 這張表不存在，就建立它；如果已經存在，就不要重複建立）
    db.run(`CREATE TABLE IF NOT EXISTS scallion_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        price REAL NOT NULL
    )`);
  }
});

var app = express();  // 建立 Express 應用程式！！

// 設定中介軟體（middleware）
app.use(logger('dev'));  // 它會在終端機顯示請求紀錄（例如：GET /api/prices 200 15ms）
app.use(express.json());  // 讓 Express 可以解析 JSON 格式的請求 body
app.use(express.urlencoded({ extended: false }));  // 讓 Express 可以解析表單格式資料
app.use(cookieParser());  // 啟用 Cookie 解析
app.use(express.static(path.join(__dirname, 'public')));  // 設定靜態檔案資料夾

app.use('/', indexRouter);  // 當使用者進入首頁：/ ，就會交給 routes/index.js 處理
app.use('/users', usersRouter);  // 當使用者進入：/users，就會交給 routes/users.js 處理

// 1. 回傳資料庫中所有內容的 API
app.get('/api/prices', (req, res) => {
  const sql = 'SELECT * FROM scallion_prices';  // 查詢 scallion_prices 表裡面的所有資料
  db.all(sql, [], (err, rows) => {  // 執行查詢（db.all() 會取得多筆資料）。rows 會是一個陣列，裡面包含資料庫裡的所有資料
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows  // 把資料庫查到的所有資料放進 data
    });
  });
});

// 2. 新增資料的 API (使用 GET 方法)
// 範例：/api/prices/add?date=2024-05-08&price=50
app.get('/api/prices/add', (req, res) => {
  const { date, price } = req.query;  // 從網址(例如上面範例) query string 取出 date 和 prices
  if (!date || !price) {  // 檢查是否有提供 date 和 price
    res.status(400).json({ "error": "請提供 date 與 price 參數" });
    return;
  }
  const sql = 'INSERT INTO scallion_prices (date, price) VALUES (?,?)';  // 新增資料的 SQL
  const params = [date, price];  // 設定要放進 SQL 的參數。第一個 ? 對應 date、第二個 ? 對應 price

  // 在 sqlite3 的 db.run 回呼函式中，為了讀取 this.lastID ，必須使用傳統的 function 關鍵字而不能用箭頭函式
  db.run(sql, params, function (err) {  // 執行新增資料（db.run() 用於執行新增、更新或刪除操作）
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: this.lastID, date, price }  // 回傳新增的資料（this.lastID 是 SQLite 提供的值，代表剛剛新增那筆資料的 id）
    });
  });
});

// 3. 查詢特定日期的價格
// 範例：/api/prices/search?date=2024-05-08
app.get('/api/prices/search', (req, res) => {
  const { date } = req.query;  // 從網址 query string 取出 date（要查詢的日期）
  if (!date) {
    res.status(400).json({ "error": "請提供 date 參數" });
    return;
  }
  const sql = 'SELECT * FROM scallion_prices WHERE date = ?';  // 查詢 SQL
  db.get(sql, [date], (err, row) => {  // 執行查詢（db.get() 用於取得一筆資料）
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": row || "找不到該日期的資料"
    });
  });
});

// 4. 顯示歷年來的最低價格、平均價格、最高價格的 API
app.get('/api/prices/stats', (req, res) => {
  const sql = `
    SELECT 
      MIN(price) as minPrice, 
      AVG(price) as avgPrice, 
      MAX(price) as maxPrice 
    FROM scallion_prices
  `;
  db.get(sql, [], (err, row) => {  // 執行查詢（db.get() 用於取得一筆資料，這裡會回傳一筆資料，裡面有 minPrice、avgPrice、maxPrice 三個欄位）
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": {
        minPrice: row.minPrice,  // 回傳最低價格（會在 rows 中）
        avgPrice: row.avgPrice ? row.avgPrice.toFixed(2) : 0, // 四捨五入到小數點第二位
        maxPrice: row.maxPrice
      }
    });
  });
});

export default app;  // 匯出 app 物件，這樣 bin/www.js 就可以 import app.js，然後啟動 Express 伺服器