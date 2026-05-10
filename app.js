import express from 'express';  // 匯入 Express 框架
import fs from 'fs';  // 匯入 Node.js 內建的檔案系統模組
import path from 'path';  // 匯入路徑處理工具
import { fileURLToPath } from 'url';  // 匯入 fileURLToPat（因為現在使用的是 ES Module）
import cookieParser from 'cookie-parser';  // 匯入 Cookie 解析中介軟體
import logger from 'morgan';  // 匯入 morgan
import sqlite3 from 'sqlite3';  // 匯入 SQLite3 套件
import { fileURLToPath } from 'url';  // 匯入 fileURLToPath

import indexRouter from './routes/index.js';  // 匯入首頁路由
import usersRouter from './routes/users.js';  // 匯入使用者路由

const __filename = fileURLToPath(import.meta.url);  // 取得目前這個檔案的完整路徑
const __dirname = path.dirname(__filename);  // 取得目前檔案所在的資料夾路徑

// 設定資料庫路徑（使用相對路徑定位）
const dbPath = path.join(__dirname, 'db', 'sqlite.db');

// 確保 db 目錄存在
const dataDir = path.join(__dirname, 'db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 建立 SQLite 資料庫連線
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('app.js: 無法開啟資料庫:', err.message);
  } else {
    console.log('app.js: 成功連接至 SQLite 資料庫:', dbPath);
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