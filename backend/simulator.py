# simulator.py
import requests
import time
import random
from datetime import datetime

API_ENDPOINT = "http://127.0.0.1:8000/api/gps-locations/"

# Starting coordinates (e.g., Pune / Mumbai area)
lat = 18.5204
lng = 73.8567

while True:
    # Simulate movement
    lat += random.uniform(-0.001, 0.001)
    lng += random.uniform(-0.001, 0.001)
    
    payload = {
        "vehicle": 1,  # Vehicle ID in DB
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),
        "speed": random.randint(20, 60),
        "ignition": True,
        "gps_timestamp": datetime.utcnow().isoformat() + "Z"
    }

    try:
        response = requests.post(API_ENDPOINT, json=payload)
        print(f"Sent GPS Ping: {response.status_code}")
    except Exception as e:
        print(f"Connection error: {e}")

    time.sleep(5)  # Ping every 5 seconds