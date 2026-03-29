import json
import urllib.request
import urllib.error

url = "http://127.0.0.1:8000/events"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    events_data = json.loads(response.read().decode())
    
url = "http://127.0.0.1:8000/predictions"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    preds_data = json.loads(response.read().decode())

print("First Prediction:", preds_data['data']['predictions'][0] if 'data' in preds_data and 'predictions' in preds_data['data'] else preds_data)

if preds_data:
    pred = preds_data['data']['predictions'][0]
    enrich_url = "http://127.0.0.1:8000/predictions/enrich"
    req_body = json.dumps({
        "event_type": pred['event_type'],
        "location": pred['location'],
        "risk_level": pred['risk_level']
    }).encode('utf-8')
    req = urllib.request.Request(enrich_url, data=req_body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print("Enrich Result:", res_data)
    except urllib.error.HTTPError as e:
        print("Enrich Error:", e.read())
