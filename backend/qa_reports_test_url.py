import urllib.request
import json

url = "http://localhost:8000/reports/investor-performance?user_id=1&start_date=2026-01-01&end_date=2026-12-31"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Performance:", json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")

url2 = "http://localhost:8000/reports/investor-statement?user_id=1&start_date=2026-01-01&end_date=2026-12-31"
try:
    req2 = urllib.request.Request(url2)
    with urllib.request.urlopen(req2) as response:
        data2 = json.loads(response.read().decode())
        print("Statement:", json.dumps(data2, indent=2))
except Exception as e:
    print(f"Error2: {e}")
