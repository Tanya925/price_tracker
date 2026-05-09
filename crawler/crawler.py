import urllib.request as req
import urllib.parse
import json
import sqlite3
import os

# 資料庫路徑 (指向專案根目錄下的 db/sqlite.db)
db_path = os.path.join("..", "db", "sqlite.db")

url = "https://m.moa.gov.tw/Transaction/AgriculturalProduct/IndexPost"

requestData = "MarketId=400&StartDate=2026%2F03%2F08&EndDate=2026%2F05%2F08&TcType=N04&TradeCode=SE6+++&CropName=SE6&NoRest=false&btnradio=on&NowPage=1&SortAction=DESC%2CDESC%2CDESC&SortField=TDate%2CTradeVolumn%2CMarketId&PageSize=100"

headers = {
    "Cookie": "_gid=GA1.3.1571043946.1778240565; .AspNetCore.Antiforgery.idCrnzStY7U=CfDJ8P34DfwZEOtJlXExepUS6e3vcKQfAAGgPAfUyRPxcOeNy3N9MGivYNsoq9GMQEj7pMkipvECZnGoYkgz9_pRPcEuZAaXzYCJSdc_mqtPYKdctBR5oZFFPbrC1hKiGhQnUzPhvoVpK2RJ-rFmSFaOOoc; _ga=GA1.1.1513279085.1778240565; .AspNetCore.Session=CfDJ8P34DfwZEOtJlXExepUS6e2aBExMC3zCSoR6qXfjT1NOX%2FmrXXMFMfOmD2cqUuqUZdymBjgYV0wVwzj1lfURNJ3J1o0CEDb1YndmRMyYjE7Nymx5S4fjEZvgSbju8qvWBhAXU2ZwphL%2Fq%2FfH%2B8%2FPdFvDTTjOD%2BSl9KyBy3srobrD; _ga_5PR972B50H=GS2.1.s1778259974$o4$g1$t1778260099$j60$l0$h0",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
}

data = requestData.encode("utf-8")

request = req.Request(
    url=url,
    headers=headers,
    data=data
)

try:
    with req.urlopen(request) as response:
        result = response.read().decode("utf-8")
    
    jsonData = json.loads(result)
    rows = jsonData.get("rows", [])

    if not rows:
        print("未找到任何資料。")
    else:
        # 連接 SQLite 資料庫
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        for row in rows:
            trade_date = row["TradeDate"]
            avg_price = row["AveragePrice"]
            
            # 插入資料前檢查是否已存在 (避免重複)
            cursor.execute("SELECT 1 FROM scallion_prices WHERE date = ? AND price = ?", (trade_date, avg_price))
            if cursor.fetchone() is None:
                cursor.execute("INSERT INTO scallion_prices (date, price) VALUES (?, ?)", (trade_date, avg_price))
                print(f"已存入: 日期 {trade_date}, 價格 {avg_price}")
            else:
                print(f"略過重複資料: 日期 {trade_date}")

        conn.commit()
        conn.close()
        print("資料庫操作完成。")

except Exception as e:
    print(f"發生錯誤: {e}")