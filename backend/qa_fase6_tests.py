import requests
import json
import csv
import pandas as pd
import io

BASE_URL = "http://0.0.0.0:8000"

def test_regression():
    print("Running Regression Tests...")
    endpoints = [
        "/reports/nav-history",
        "/reports/fund-performance",
        "/reports/investor-performance",
        "/reports/investor-statement?user_id=1",
        "/settings",
        "/reports/fee-report?user_id=1"
    ]
    for endpoint in endpoints:
        res = requests.get(BASE_URL + endpoint)
        if res.status_code == 200:
            print(f"PASS: {endpoint} returned 200")
        else:
            print(f"FAIL: {endpoint} returned {res.status_code} - {res.text}")

def test_settings():
    print("\nRunning Settings Tests...")
    # Get settings
    res = requests.get(BASE_URL + "/settings")
    if res.status_code == 200:
        print(f"PASS: GET /settings returned 200. Data: {res.json()}")
    else:
        print(f"FAIL: GET /settings returned {res.status_code}")
    
    # Put settings
    payload = {"fee_collection_frequency": "quarterly"}
    res2 = requests.put(BASE_URL + "/settings", json=payload)
    if res2.status_code == 200:
        print(f"PASS: PUT /settings returned 200. Data: {res2.json()}")
    else:
        print(f"FAIL: PUT /settings returned {res2.status_code} - {res2.text}")

def test_fee_report_api():
    print("\nRunning Fee Report API Tests...")
    # Fetch report for user 1
    res = requests.get(BASE_URL + "/reports/fee-report?user_id=1&start_date=2020-01-01&end_date=2026-12-31")
    if res.status_code == 200:
        data = res.json()
        print("Fee Report API Data Keys:", data.keys())
        expected_keys = ['hwm_nav', 'management_fee', 'last_30_days_fees']
        if all(k in data for k in expected_keys):
            print("PASS: /reports/fee-report returned correct structure.")
            print(f"PASS: recent_30_days_transactions found. Count: {len(data['last_30_days_fees'])}")
        else:
            print("FAIL: /reports/fee-report missing expected keys.")
    else:
        print(f"FAIL: /reports/fee-report returned {res.status_code} - {res.text}")

def test_csv_excel():
    print("\nRunning CSV and Excel Export Tests...")
    # CSV
    res_csv = requests.get(BASE_URL + "/reports/fee-report?user_id=1&format=csv")
    if res_csv.status_code == 200 and 'text/csv' in res_csv.headers.get('Content-Type', ''):
        print("PASS: CSV export endpoint returned 200 and csv content type.")
        try:
            df = pd.read_csv(io.StringIO(res_csv.text))
            print(f"PASS: Parsed CSV successfully. Rows: {len(df)}")
            print("CSV Columns:", list(df.columns))
            if 'Total Fees Accrued' in df.columns or 'total_fees_accrued' in df.columns or 'date' in df.columns:
                 print("PASS: CSV contains expected columns.")
        except Exception as e:
            print("FAIL: Could not parse CSV.", e)
    else:
        print(f"FAIL: CSV export endpoint returned {res_csv.status_code}")

    # Excel
    res_xls = requests.get(BASE_URL + "/reports/fee-report?user_id=1&format=excel")
    if res_xls.status_code == 200 and 'spreadsheet' in res_xls.headers.get('Content-Type', ''):
        print("PASS: Excel export endpoint returned 200 and spreadsheet content type.")
        try:
            df = pd.read_excel(io.BytesIO(res_xls.content))
            print(f"PASS: Parsed Excel successfully. Rows: {len(df)}")
            print("Excel Columns:", list(df.columns))
        except Exception as e:
            print("FAIL: Could not parse Excel.", e)
    else:
        print(f"FAIL: Excel export endpoint returned {res_xls.status_code} - Header: {res_xls.headers.get('Content-Type')}")

if __name__ == '__main__':
    test_regression()
    test_settings()
    test_fee_report_api()
    test_csv_excel()
