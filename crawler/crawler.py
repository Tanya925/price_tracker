import urllib.request as req  # 匯入 Python 內建的網路請求工具
import json  # 匯入 JSON 工具（因為網站回傳的資料通常會是 JSON 格式，所以需要用 json.loads() 把文字轉成 Python 可以操作的資料）
import sqlite3  # 匯入 SQLite 資料庫工具（這樣 Python 才可以連接 .db 資料庫，並執行 SQL 指令）
import os  # 匯入作業系統相關工具（這裡主要用來組合資料庫路徑）

# 1. 設定 SQLite 資料庫的位置 (上一層資料夾 / db / sqlite.db)
db_path = os.path.join("..", "db", "sqlite.db")

# 2. 設定要查詢的網址
# 程式會把查詢條件送到這個網址，然後它會回傳符合條件的資料
url = "https://m.moa.gov.tw/Transaction/AgriculturalProduct/IndexPost"

# 3. 設定要送出的查詢資料（requestData）
# 這一大串是你要送給網站的查詢條件，裡面包含了你要查詢的市場、日期範圍、作物種類等等。網站會根據這些條件回傳相對應的資料。
# 後面的 NowPage=1，代表查詢第一頁的資料
# 最後面有一個 pageSize=100，表示你一次要查詢 100 筆資料（原本只有 25，但我想要多爬一點所以讓它一頁顯示多一點資料！）
requestData = "MarketId=400&StartDate=2026%2F03%2F08&EndDate=2026%2F05%2F08&TcType=N04&TradeCode=SE6+++&CropName=SE6&NoRest=false&btnradio=on&NowPage=1&SortAction=DESC%2CDESC%2CDESC&SortField=TDate%2CTradeVolumn%2CMarketId&PageSize=100"

# 4. 設定 HTTP 請求標頭 headers
# 因為網站有時候會檢查請求是不是從正常瀏覽器送出的，所以要加 headers
# Cookie: 網站用來辨識使用者或 Session 的資料
# Content-Type: 告訴網站你送出的資料格式是什麼（這裡是表單格式）
# User-Agent: 假裝自己是瀏覽器發出的請求
headers = {
    "Cookie": "_gid=GA1.3.1571043946.1778240565; .AspNetCore.Antiforgery.idCrnzStY7U=CfDJ8P34DfwZEOtJlXExepUS6e3vcKQfAAGgPAfUyRPxcOeNy3N9MGivYNsoq9GMQEj7pMkipvECZnGoYkgz9_pRPcEuZAaXzYCJSdc_mqtPYKdctBR5oZFFPbrC1hKiGhQnUzPhvoVpK2RJ-rFmSFaOOoc; _ga=GA1.1.1513279085.1778240565; .AspNetCore.Session=CfDJ8P34DfwZEOtJlXExepUS6e2aBExMC3zCSoR6qXfjT1NOX%2FmrXXMFMfOmD2cqUuqUZdymBjgYV0wVwzj1lfURNJ3J1o0CEDb1YndmRMyYjE7Nymx5S4fjEZvgSbju8qvWBhAXU2ZwphL%2Fq%2FfH%2B8%2FPdFvDTTjOD%2BSl9KyBy3srobrD; _ga_5PR972B50H=GS2.1.s1778259974$o4$g1$t1778260099$j60$l0$h0",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
}

# 5. 把請求資料轉成 bytes
# requestData 原本是字串，但是 urllib.request 送 POST 資料時，需要的是 bytes 格式
data = requestData.encode("utf-8")

# 6. 建立一個 HTTP Request 物件
# 這個物件裡面會包含：
# 要送去哪個網址、要帶哪些 headers、要送哪些表單資料
request = req.Request(
    url=url,
    headers=headers,
    data=data
)

# 7. 開始錯誤處理（代表接下來這段程式可能會出錯，所以用 try...except 包起來）
try:
    # 8. 送出請求並讀取回應
    with req.urlopen(request) as response:  # 這行會真的把 request 送出去（如果成功，網站會回傳 response）
        result = response.read().decode("utf-8")  # 先讀取網站回傳的內容 (但通常是 bytes)，所以要轉回字串。這時候 result 會是一大串 JSON 格式的文字
        
    # 把 JSON 字串轉成 Python 字典
    # 例如原本是 {"rows": [...]}，轉換後就可以用：jsonData["rows"] 來取資料
    jsonData = json.loads(result)
    
    # 從 jsonData 裡面取出 "rows" 這個資料
    # rows 通常是一個 list，裡面每一筆是一個 dict。
    # 例如：
    # [
    #     {
    #         "TradeDate": "2026/05/08",
    #         "AveragePrice": 35.5
    #     },
    #     {
    #         "TradeDate": "2026/05/07",
    #         "AveragePrice": 36.2
    #     }
    # ]
    # get("rows", []) 的意思是：如果有 "rows"，就取出來，如果沒有 "rows"，就給空 list
    rows = jsonData.get("rows", [])

    # 判斷有沒有資料（如果 rows 是空的，就代表沒有查到資料）
    if not rows:
        print("未找到任何資料。")
    else:  # 如果有資料，就執行下面的資料庫存取流程
        
        # 9.  連接 SQLite 資料庫
        conn = sqlite3.connect(db_path)  # conn 是資料庫連線物件（如果資料庫檔案存在，就連接它）
        cursor = conn.cursor()  # 建立 cursor（cursor 可以理解成「操作資料庫的工具」）

        # 逐筆處理 rows 裡面的資料（每一個 row 就是一筆交易資料）
        for row in rows:
            trade_date = row["TradeDate"]  # 從這筆資料中取出交易日期並存進變數
            avg_price = row["AveragePrice"]  # 從這筆資料中取出平均價格並存進變數
            
            # 如果日期是民國年格式，例如 115/03/08，就轉成西元格式 2026-03-08（這樣格式才會跟在網站中手動新增日期的格式一樣）
            parts = trade_date.split("/")
            if len(parts) == 3:
                year = int(parts[0]) + 1911
                month = parts[1].zfill(2)
                day = parts[2].zfill(2)
                trade_date = f"{year}-{month}-{day}"
            
            # 插入資料前檢查資料庫裡面是否已經有相同資料
            # 「去 scallion_prices 這張表找看看，有沒有日期等於 trade_date，而且價格等於 avg_price 的資料。」這裡的 ? 是參數佔位符。真正的值放在後面：(trade_date, avg_price)
            cursor.execute("SELECT 1 FROM scallion_prices WHERE date = ? AND price = ?", (trade_date, avg_price))
            if cursor.fetchone() is None:  # fetchone() 會取出查詢結果的第一筆，如果沒有資料就會回傳 None（代表可以新增這筆資料）
                cursor.execute("INSERT INTO scallion_prices (date, price) VALUES (?, ?)", (trade_date, avg_price))
                print(f"已存入: 日期 {trade_date}, 價格 {avg_price}")
            else:
                print(f"略過重複資料: 日期 {trade_date}")

        conn.commit()  # 提交資料庫變更（把前面的 INSERT 操作正式寫入資料庫）
        conn.close()  # 關閉資料庫連線
        print("資料庫操作完成。")

# 錯誤處理（如果 try 裡面任何地方出錯，就會跳到這裡）
except Exception as e:
    print(f"發生錯誤: {e}")