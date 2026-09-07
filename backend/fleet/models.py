import secrets
from django.db import models

def generate_api_key():
    return secrets.token_hex(32)

class Vehicle(models.Model):
    vehicle_number = models.CharField(max_length=50, unique=True)
    device_id = models.CharField(max_length=100, unique=True)
    vendor_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.vehicle_number

class GPSLocation(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    speed = models.FloatField(default=0.0) # km/h
    ignition = models.BooleanField(default=False)
    gps_timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-gps_timestamp']