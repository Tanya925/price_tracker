// 初始載入
window.onload = () => {
    fetchAllPrices();
    fetchStats();
};

// 獲取所有價格
async function fetchAllPrices() {
    try {
        const response = await fetch('/api/prices');
        const result = await response.json();
        const tbody = document.querySelector('#priceTable tbody');
        tbody.innerHTML = '';
        
        if(result.data && result.data.length > 0) {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.date}</td><td>${item.price}</td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('載入資料失敗:', err);
    }
}

// 獲取統計資訊
async function fetchStats() {
    try {
        const response = await fetch('/api/prices/stats');
        const result = await response.json();
        document.getElementById('minPrice').innerText = result.data.minPrice || 0;
        document.getElementById('avgPrice').innerText = result.data.avgPrice || 0;
        document.getElementById('maxPrice').innerText = result.data.maxPrice || 0;
    } catch (err) {
        console.error('載入統計失敗:', err);
    }
}

// 新增價格
async function addPrice() {
    const date = document.getElementById('addDate').value;
    const price = document.getElementById('addPrice').value;
    
    if (!date || !price) {
        alert('請完整填寫日期與價格');
        return;
    }

    try {
        const response = await fetch(`/api/prices/add?date=${date}&price=${price}`);
        const result = await response.json();
        if (result.message === 'success') {
            alert('新增成功');
            fetchAllPrices();
            fetchStats();
            document.getElementById('addPrice').value = '';
        }
    } catch (err) {
        alert('新增失敗');
    }
}

// 查詢價格
async function searchPrice() {
    const date = document.getElementById('searchDate').value;
    if (!date) return;

    try {
        const response = await fetch(`/api/prices/search?date=${date}`);
        const result = await response.json();
        const display = document.getElementById('searchResult');
        
        if (typeof result.data === 'string') {
            display.innerText = result.data;
        } else if (result.data) {
            display.innerText = `${result.data.date} 的價格為 ${result.data.price} 元`;
        } else {
            display.innerText = '找不到該日期的資料';
        }
    } catch (err) {
        document.getElementById('searchResult').innerText = '查詢出錯';
    }
}
