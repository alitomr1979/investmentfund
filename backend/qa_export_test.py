import sys
from fastapi.testclient import TestClient
from main import app
import pandas as pd
import io

client = TestClient(app)

def run_tests():
    # Setup: create user 1 and a transaction
    client.post("/users", json={"name": "Test User", "email": "test@example.com", "role": "investor"})
    client.post("/transactions", json={"user_id": 1, "type": "deposit", "amount": 1000, "date": "2023-01-01"})
    
    print("Testing /reports/fee-report CSV export...")
    resp_csv = client.get("/reports/fee-report?user_id=1&format=csv")
    if resp_csv.status_code == 200 and 'text/csv' in resp_csv.headers.get('content-type', ''):
        print("PASS: CSV content-type")
        df = pd.read_csv(io.StringIO(resp_csv.text))
        print(f"PASS: CSV valid, {len(df)} rows found.")
    else:
        print(f"FAIL: CSV export. Status {resp_csv.status_code}, Header {resp_csv.headers.get('content-type')}")
        print(f"BODY: {resp_csv.text}")
        sys.exit(1)

    print("Testing /reports/fee-report Excel export...")
    resp_xls = client.get("/reports/fee-report?user_id=1&format=excel")
    
    content_type = resp_xls.headers.get('content-type', '')
    if resp_xls.status_code == 200 and ('spreadsheet' in content_type or 'excel' in content_type):
        print(f"PASS: Excel content-type: {content_type}")
        # Verify content
        if b"management_fee" in resp_xls.content:
             print("PASS: Excel content has correct keys.")
        else:
             print("FAIL: Missing keys in excel output.")
             sys.exit(1)
    else:
        print(f"FAIL: Excel export. Status {resp_xls.status_code}, Header {content_type}")
        print(f"BODY: {resp_xls.text}")
        sys.exit(1)

    print("ALL TESTS PASSED")

if __name__ == "__main__":
    run_tests()
