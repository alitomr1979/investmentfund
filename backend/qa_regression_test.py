import urllib.request

endpoints = [
    "/reports/executive-dashboard",
    "/reports/nav-history",
    "/reports/fund-performance",
    "/fee-ledger",
    "/transactions/"
]

for ep in endpoints:
    url = f"http://localhost:8000{ep}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(f"PASS: {ep} returned {response.status}")
    except Exception as e:
        print(f"FAIL: {ep} failed with {e}")
