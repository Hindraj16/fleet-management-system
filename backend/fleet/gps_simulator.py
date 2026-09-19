import requests
import time
import random
from datetime import datetime, timezone


URL = "http://192.168.17.1:8000/api/gps-locations/"

#IMEI = "867440067225581"
VEHICLE_ID = 1

latitude = 18.545264
longitude = 73.891449


while True:

    latitude += random.uniform(0.00001, 0.00005)
    longitude += random.uniform(0.00001, 0.00005)

    # Keep only 6 decimal places
    latitude = round(latitude, 6)
    longitude = round(longitude, 6)

    data = {
       # "imei": IMEI,
        "vehicle": VEHICLE_ID,
        "latitude": latitude,
        "longitude": longitude,
        "speed": random.randint(30, 60),
        "ignition": True,
        "gps_timestamp": datetime.now(
            timezone.utc
        ).isoformat()
    }

    try:

        response = requests.post(
            URL,
            json=data,
            timeout=5
        )

        print("--------------------------------")
        print("GPS PACKET SENT")
        print("Vehicle ID :", VEHICLE_ID)
        print("Latitude   :", latitude)
        print("Longitude  :", longitude)
        print("Speed      :", data["speed"])
        print("Status     :", response.status_code)
        print("Response   :", response.text)
        print("--------------------------------")

    except Exception as e:
        print("Error:", e)

    time.sleep(1)
