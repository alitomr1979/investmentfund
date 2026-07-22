import requests
import json
import csv
import io
import pandas as pd
import sys

BASE_URL = "http://localhost:8000"

def test_endpoints():
    print("Testing /reports/investor-performance")
    res = requests.get(f"{BASE_URL}/reports/investor-performance", params={"user_id": 1, "start_date": "2023-01-01", "end_date": "2023-12-31"})
    if res.status_code == 200:
        print("PASS: /reports/investor-performance returned 200")
        data = res.json()
        print(f"Data keys: {data.keys()}")
    else:
        print(f"FAIL: /reports/investor-performance returned {res.status_code}")
        print(res.text)

    print("Testing /reports/investor-statement")
    res2 = requests.get(f"{BASE_URL}/reports/investor-statement", params={"user_id": 1, "start_date": "2023-01-01", "end_date": "2023-12-31"})
    if res2.status_code == 200:
        print("PASS: /reports/investor-statement returned 200")
        data2 = res2.json()
        print(f"Data keys: {data2.keys()}")
    else:
        print(f"FAIL: /reports/investor-statement returned {res2.status_code}")
        print(res2.text)

def test_math():
    print("Testing Math Equation")
    res = requests.get(f"{BASE_URL}/reports/investor-performance", params={"user_id": 1, "start_date": "2023-01-01", "end_date": "2023-12-31"})
    if res.status_code == 200:
        data = res.json()
        if "metrics" in data:
            m = data["metrics"]
            beg = m.get("beginning_value", 0)
            end = m.get("ending_value", 0)
            cont = m.get("net_contributions", 0)
            withd = m.get("net_withdrawals", 0)
            gain = m.get("investment_gain_loss", 0)
            
            calculated_end = beg + cont - withd + gain
            if abs(calculated_end - end) < 0.01:
                print("PASS: Math Equation matches")
            else:
                print(f"FAIL: Math Equation mismatch. Expected {end}, got {calculated_end}")
    else:
        print("FAIL: Cannot test math, endpoint failed.")

if __name__ == "__main__":
    try:
        test_endpoints()
        test_math()
        print("QA Script Finished.")
    except Exception as e:
        print(f"Error running tests: {e}")
