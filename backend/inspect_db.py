import sqlite3
import json

conn = sqlite3.connect('supply_chain.db')
conn.row_factory = sqlite3.Row

tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
print("=== TABLES ===")
print(tables)
print()

for table in tables:
    cols = [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"--- {table} ({count} rows) ---")
    print(f"  Columns: {cols}")

    rows = conn.execute(f"SELECT * FROM {table} LIMIT 3").fetchall()
    for row in rows:
        row_dict = dict(row)
        for k, v in row_dict.items():
            if isinstance(v, str) and len(v) > 120:
                row_dict[k] = v[:120] + "..."
        print(f"  Sample: {json.dumps(row_dict, default=str, indent=4)}")
    print()

conn.close()
