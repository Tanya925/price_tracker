import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sqlite3 from 'sqlite3';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 在 Azure 用 /home/data，本機用當前專案下的 db 資料夾
const isAzure = !!process.env.WEBSITE_SITE_NAME;
const dataDir = isAzure ? '/home/data/db' : path.join(__dirname, 'db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sqlite.db');  // 設定資料庫路徑
const db = new sqlite3.Database(dbPath, (err) => {  // 建立 SQLite 資料庫連線
  if (err) {
    console.error('app.js: 無法開啟資料庫:', err.message);
  } else {
    console.log('app.js: 成功連接至 SQLite 資料庫:', dbPath);
    // 確保表格存在
    db.run(`CREATE TABLE IF NOT EXISTS scallion_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        price REAL NOT NULL
    )`);
  }
});

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 2. 回傳資料庫中所有內容的 API
app.get('/api/prices', (req, res) => {
  const sql = 'SELECT * FROM scallion_prices';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// 3. 新增資料的 API (使用 GET 方法)
// 範例：/api/prices/add?date=2024-05-08&price=50
app.get('/api/prices/add', (req, res) => {
  const { date, price } = req.query;
  if (!date || !price) {
    res.status(400).json({ "error": "請提供 date 與 price 參數" });
    return;
  }
  const sql = 'INSERT INTO scallion_prices (date, price) VALUES (?,?)';
  const params = [date, price];
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { id: this.lastID, date, price }
    });
  });
});

// 4. 查詢特定日期的價格
// 範例：/api/prices/search?date=2024-05-08
app.get('/api/prices/search', (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400).json({ "error": "請提供 date 參數" });
    return;
  }
  const sql = 'SELECT * FROM scallion_prices WHERE date = ?';
  db.get(sql, [date], (err, row) => {
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

// 5. 顯示歷年來的最低價格、平均價格、最高價格的 API
app.get('/api/prices/stats', (req, res) => {
  const sql = `
    SELECT 
      MIN(price) as minPrice, 
      AVG(price) as avgPrice, 
      MAX(price) as maxPrice 
    FROM scallion_prices
  `;
  db.get(sql, [], (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": {
        minPrice: row.minPrice,
        avgPrice: row.avgPrice ? row.avgPrice.toFixed(2) : 0, // 四捨五入到小數點第二位
        maxPrice: row.maxPrice
      }
    });
  });
});

export default app;
