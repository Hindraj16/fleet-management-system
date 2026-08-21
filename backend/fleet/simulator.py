import random
import time
import requests

# API Configuration
API_URL = "http://127.0.0.1:8000/api/gps/device/"
API_KEY = "your_secret_api_key_here"  # Replace with the API key assigned to the vehicle
IMEI = "860260051721008"  # Ensure this IMEI exists in your Django database

# Initial Telemetry Values (Pune, India coordinates)
latitude = 18.5204
longitude = 73.8567
fuel_level = 95.0

headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY,
}

print(f"--- GPS Telemetry Simulator Running ---")
print(f"Targeting Endpoint: {API_URL}")
print(f"Device IMEI: {IMEI}\n")

while True:
    # Simulate movement and vehicle metrics
    latitude += random.uniform(-0.0005, 0.0005)
    longitude += random.uniform(-0.0005, 0.0005)
    speed = round(random.uniform(25.0, 65.0), 1)
    fuel_level = max(0.0, round(fuel_level - 0.05, 2))

    payload = {
        "imei": IMEI,
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "speed": speed,
        "fuel": fuel_level,
        "ignition": True,
    }

    try:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=5)
        
        if response.status_code == 200:
            print(f" [200 OK] Telemetry sent | Lat: {payload['latitude']}, Lng: {payload['longitude']}, Speed: {payload['speed']} km/h")
        else:
            print(f"⚠ [{response.status_code}] Error: {response.json()}")

    except requests.exceptions.RequestException as error:
        print(f"❌ Failed to connect to server: {error}")

    # Send updates every 3 seconds
    time.sleep(3)