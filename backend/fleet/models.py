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
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='gps_locations')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    gps_timestamp = models.DateTimeField()
    speed = models.FloatField(default=0.0) # km/h

    class Meta: 
        ordering = ['-gps_timestamp']
        verbose_name_plural = "GPS Locations"

    def __str__(self):
        return f"{self.vehicle} - {self.gps_timestamp}"

class RouteHistory(models.Model):
    route_name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    coordinates = models.JSONField(help_text="List of [lat, lng] pairs")
    detailed_points = models.JSONField(default=list, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.route_name} ({len(self.coordinates) if self.coordinates else 0} points)"


class Route(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('unassigned', 'Unassigned'),
    ]
    assign_vehicle = models.ForeignKey('Vehicle', on_delete=models.SET_NULL, related_name='assigned_routes', null=True, blank=True)
    route_name = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to='', blank=True, null=True)
    coordinates = models.JSONField(default=list, blank=True, null=True) 
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unassigned')  
    updated_at = models.DateTimeField(auto_now=True)    
    
    def save(self, *args, **kwargs):
        if not self.assign_vehicle:
            self.status = 'unassigned'
        else:
            if self.status == 'unassigned':
                self.status = 'active'
        super().save(*args, **kwargs)

    def __str__(self):
        filename = self.file.name if self.file else "No file"
        veh_num = self.assign_vehicle.vehicle_number if self.assign_vehicle else "Unassigned"
        return f"{veh_num} - {filename} - {self.status}"