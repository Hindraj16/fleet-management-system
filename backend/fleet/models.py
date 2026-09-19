import secrets
from django.db import models

def generate_api_key():
    return secrets.token_hex(32)

class Vehicle(models.Model):
    vehicle_number = models.CharField(max_length=50, unique=True)
    device_id = models.CharField(max_length=100, blank=True, null=True)
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

class UploadRouteHistory(models.Model):
    vehicle = models.ForeignKey("Vehicle",on_delete=models.CASCADE, related_name="route_histories")
    route_name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    coordinates = models.JSONField(help_text="List of [lat, lng] pairs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.route_name} ({len(self.coordinates)} points)"


class UploadRoute(models.Model):
    vehicle = models.ForeignKey("Vehicle",on_delete=models.CASCADE, related_name="uploaded_routes")
    route_name = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to='kml_files/', blank=True, null=True)
    coordinates = models.JSONField(blank=True, null=True) 
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        filename = self.file.name if self.file else "No file"
        return f"{filename} - {self.route_name or 'Unnamed Route'}" 

class AssignedRoute(models.Model):
    # Make vehicle optional so routes can exist independently
    vehicle = models.ForeignKey('Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_routes')
    route_name = models.CharField(max_length=255)
    kml_file = models.FileField(upload_to='kml_files/', null=True, blank=True)
    coordinates = models.JSONField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.route_name