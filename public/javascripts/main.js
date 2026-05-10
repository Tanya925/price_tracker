// 初始載入
// window.onload 代表：當整個網頁載入完成後才執行裡面的程式
window.onload = () => {
    fetchAllPrices();  // 向後端取得所有價格資料並顯示到表格上
    fetchStats();  // 向後端取得統計資訊(最低價格、平均價格、最高價格)並顯示到統計區塊上
};

// 建立一個非同步函式(因為 fetch API 需要等待網路請求): 獲取所有價格資料！
async function fetchAllPrices() {
    try {

        // 向後端發送 GET /api/prices 請求（也就是呼叫你的 Express API：app.get('/api/prices', ...)）
        // response: 後端回傳的 HTTP 回應物件，裡面包含了所有後端回傳的資料（例如：status、headers、body 等等）
        // await: 意思是「等到 fetch() 這個網路請求完成，然後把結果放在 response 這個變數裡」。因為網路請求需要時間，所以我們用 await 來等待它完成（如果沒有 await，程式不會等 API 回來，就直接往下跑）
        const response = await fetch('/api/prices');

        // 從 response 物件裡面取出 JSON 格式的資料（也就是你在 app.js 裡面 res.json() 回傳的資料）
        // 而因為API 回傳的是 JSON 格式：
        // {
        // "message": "success",
        // "data": [...]
        // }
        // 所以 response.json() 會：把 JSON 字串轉成 JavaScript 物件
        // result: 就是轉換後的 JavaScript 物件，裡面會有 message 和 data 兩個屬性(data 就是資料庫裡的所有價格資料陣列)
        const result = await response.json();
        const tbody = document.querySelector('#priceTable tbody');  // 找到 HTML 裡的：<table id="priceTable">中的：<tbody>（也就是表格的內容區域）
        tbody.innerHTML = '';  // 清空裡面的舊資料
        
        // 判斷有沒有資料（檢查 result.data 是否存在、data 裡面是否有資料）
        if(result.data && result.data.length > 0) {

            // forEach() : 陣列逐筆處理
            // item: 每次迴圈中的一筆資料。例如:
            // item = {
            //   id: 1,
            //   date: "2026-05-08",
            //   price: 35
            // }
            result.data.forEach(item => {  
                const tr = document.createElement('tr');  // 動態建立表格列 <tr>
                tr.innerHTML = `<td>${item.date}</td><td>${item.price}</td>`;  // 設定剛剛創建的 tr 裡面的 HTML
                tbody.appendChild(tr);  // 把這個 tr 加到 tbody 裡面（也就是表格的內容區域），這樣就會顯示在網頁上
            });
        }
    } catch (err) {
        console.error('載入資料失敗:', err);
    }
}


// 建立一個非同步函式：獲取統計資訊（最低價格、平均價格、最高價格）！
async function fetchStats() {
    try {
        const response = await fetch('/api/prices/stats');  // 向後端發送: GET /api/prices/stats
        const result = await response.json();  // 解析後回傳到前端這裡的 JSON 資料（裡面會有 message 和 data，data 裡面會有 minPrice、avgPrice、maxPrice）
        document.getElementById('minPrice').innerText = result.data.minPrice || 0;  // 修改(更新) html 裡面的文字
        document.getElementById('avgPrice').innerText = result.data.avgPrice || 0;
        document.getElementById('maxPrice').innerText = result.data.maxPrice || 0;
    } catch (err) {
        console.error('載入統計失敗:', err);
    }
}

// 建立一個非同步函式：新增價格！（當按鈕：<button onclick="addPrice()"> 被點擊時會執行）
async function addPrice() {
    const date = document.getElementById('addDate').value;  // 取得日期輸入框內容
    const price = document.getElementById('addPrice').value;  // 取得價格輸入框內容
    
    // 檢查是否有輸入日期和價格，如果沒有就顯示提示訊息並結束函式
    if (!date || !price) {
        alert('請完整填寫日期與價格');  // 跳出警告視窗
        return;
    }

    try {
        const response = await fetch(`/api/prices/add?date=${date}&price=${price}`);  // 呼叫新增資料的 API(發送例如：/api/prices/add?date=2026-05-08&price=35 到後端)
        const result = await response.json();  // 解析後端回傳的 JSON 資料
        if (result.message === 'success') {
            alert('新增成功');  // 跳出成功提示
            fetchAllPrices();  // 重新載入表格（重新抓所有資料）
            fetchStats();  // 重新載入統計
            document.getElementById('addPrice').value = '';  // 清空價格輸入框
        }
    } catch (err) {
        alert('新增失敗');
    }
}

// 建立一個非同步函式：查詢價格！（按下搜尋按鈕時執行）
async function searchPrice() {
    const date = document.getElementById('searchDate').value;  // 取得查詢日期
    if (!date) return;  // 沒輸入就停止

    try {
        const response = await fetch(`/api/prices/search?date=${date}`);  // V呼叫搜尋 API(向後端發送例如：/api/prices/search?date=2026-05-08)
        const result = await response.json();  // 解析後端回傳的 JSON 資料，裡面會有 message 和 data，data 可能是字串（例如：找不到該日期的資料）或物件（例如：{ date: "2026-05-08", price: 35 }）
        const display = document.getElementById('searchResult');  // 找到顯示區(要顯示查詢到的價格的地方)
        
        if (typeof result.data === 'string') {  // 判斷是不是字串
            display.innerText = result.data;  // 如果是字串（例如：找不到該日期的資料），就直接顯示這個字串
        } else if (result.data) {  // 如果 result.data 有值(代表找到資料)
            display.innerText = `${result.data.date} 的價格為 ${result.data.price} 元`;  // 顯示查詢的結果（例如：2026-05-08 的價格為 35 元）
        } else {  // 如果沒有資料就顯示找不到資料
            display.innerText = '找不到該日期的資料';
        }
    } catch (err) {
        document.getElementById('searchResult').innerText = '查詢出錯';
    }
}