import urllib.request
import json
import csv
import pandas as pd
import math

url = "http://localhost:8000/reports/investor-performance?user_id=1&start_date=2026-01-01&end_date=2026-12-31"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    perf_data = json.loads(response.read().decode())[0]

# Simulate CSV export
csv_filename = "investor_performance.csv"
headers = list(perf_data.keys())
with open(csv_filename, "w", newline='') as f:
    writer = csv.DictWriter(f, fieldnames=headers)
    writer.writeheader()
    writer.writerow(perf_data)

# Simulate Excel export
excel_filename = "investor_performance.xlsx"
df_out = pd.DataFrame([perf_data])
df_out.to_excel(excel_filename, index=False)

# Read CSV and verify
with open(csv_filename, "r") as f:
    reader = csv.DictReader(f)
    csv_data = list(reader)[0]

# Read Excel and verify
df_in = pd.read_excel(excel_filename)
excel_data = df_in.to_dict('records')[0]

def compare_dicts(original, test_dict, name):
    for k, v in original.items():
        val2 = test_dict[k]
        if isinstance(v, float):
            v2 = float(val2)
            if not math.isclose(v, v2, rel_tol=1e-9):
                print(f"FAIL {name}: Mismatch on {k}. Expected {v}, got {v2}")
                return False
        elif isinstance(v, int):
            if int(v) != int(val2):
                print(f"FAIL {name}: Mismatch on {k}. Expected {v}, got {val2}")
                return False
        else:
            if v != val2:
                print(f"FAIL {name}: Mismatch on {k}. Expected {v}, got {val2}")
                return False
    print(f"PASS: {name} matches original data exactly.")
    return True

compare_dicts(perf_data, csv_data, "CSV")
compare_dicts(perf_data, excel_data, "Excel")

