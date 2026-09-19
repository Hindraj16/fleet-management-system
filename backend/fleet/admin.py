# fleet/admin.py

from django.contrib import admin
from .models import Vehicle, GPSLocation, UploadRouteHistory, UploadRoute


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    # Updated to match existing model fields: device_id instead of imei_number, is_active instead of status
    list_display = (
        'id',
        'vehicle_number',
        'device_id',
        'vendor_name',
        'is_active',
        'created_at',
    )
    list_filter = ('is_active',)
    search_fields = ('vehicle_number', 'device_id', 'driver_name')


@admin.register(GPSLocation)
class GPSLocationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'vehicle',
        'latitude',
        'longitude',
        'speed',
        'ignition',
        'gps_timestamp',
        'created_at',
    )
    list_filter = ('ignition', 'vehicle')
    search_fields = ('vehicle__vehicle_number',)

    
@admin.register(UploadRouteHistory)
class UploadRouteHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehicle', 'file_name', 'route_name', 'coordinates', 'created_at',)
    list_filter = ('file_name',)
    search_fields = ('route_name',)
    

@admin.register(UploadRoute)
class UploadRouteAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehicle', 'file', 'route_name', 'coordinates', 'assigned_at','updated_at')
    list_filter = ('file',)
    search_fields = ('file', 'route_name',)
     