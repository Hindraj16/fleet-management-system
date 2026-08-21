# tracking/tasks.py
from celery import shared_task
from django.db import transaction
from .models import Vehicle, GPSLocation


@shared_task(bind=True, max_retries=3)
def process_gps_telemetry(self, payload):
    """
    Consumes decoded GPS data from the queue and updates DB safely.
    """
    imei = payload.get("imei")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    speed = payload.get("speed", 0.0)
    fuel = payload.get("fuel", 100.0)
    ignition = payload.get("ignition", False)

    try:
        with transaction.atomic():
            # 1. Fetch Vehicle by IMEI
            try:
                vehicle = Vehicle.objects.get(imei_number=imei)
            except Vehicle.DoesNotExist:
                # Log and exit cleanly if the IMEI isn't registered
                return f"Skipped: Unknown IMEI {imei}"

            # 2. Update real-time Vehicle state
            vehicle.latitude = latitude
            vehicle.longitude = longitude
            vehicle.speed = speed
            vehicle.fuel = fuel
            vehicle.engine_on = bool(ignition)
            vehicle.status = "moving" if float(speed) > 0 else "idle"
            vehicle.save()

            # 3. Create historical path record
            GPSLocation.objects.create(
                vehicle=vehicle,
                latitude=latitude,
                longitude=longitude,
                speed=speed,
                fuel=fuel,
            )

            return f"Success: Updated Vehicle {vehicle.vehicle_number}"

    except Exception as exc:
        # Retry task after 2 seconds if DB is busy/locked
        raise self.retry(exc=exc, countdown=2)