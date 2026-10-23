# fleet/admin.py

from import_export.admin import ImportExportModelAdmin
from django.contrib import admin
from import_export import resources
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget, DateTimeWidget
from .models import Vehicle, GPSLocation, RouteHistory, Route, AssignedRoute

@admin.register(Vehicle)
class VehicleAdmin(ImportExportModelAdmin):
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
    
class GPSLocationResource(resources.ModelResource):
    vehicle = Field(
        column_name='vehicle',
        attribute='vehicle',
        widget=ForeignKeyWidget(Vehicle, field='id')
    )
    # डेट आणि टाईमसाठी योग्य फॉरमॅट सेट करणे
    gps_timestamp = Field(
        column_name='gps_timestamp',
        attribute='gps_timestamp',
        widget=DateTimeWidget(format='%d-%m-%Y %H:%M')
    )

    class Meta:
        model = GPSLocation
        fields = ('id', 'vehicle', 'latitude', 'longitude', 'speed', 'gps_timestamp')

@admin.register(GPSLocation)
class GpsLocationAdmin(ImportExportModelAdmin):
    resource_class = GPSLocationResource
    list_display = ('id', 'vehicle', 'latitude', 'longitude', 'speed', 'gps_timestamp')
    list_filter = ('vehicle',)
    search_fields = ('vehicle__vehicle_number', 'latitude', 'longitude')

@admin.register(AssignedRoute)
class AssignedRouteAdmin(ImportExportModelAdmin):
    list_display = ('id', 'vehicle', 'file', 'route_name', 'coordinates', 'assigned_at', 'updated_at')
    list_filter = ('file',)
    search_fields = ('file', 'vehicle')

@admin.register(RouteHistory)
class RouteHistoryAdmin(ImportExportModelAdmin):
    list_display = ('id', 'file_name', 'route_name', 'coordinates', 'created_at')
    list_filter = ('file_name',)
    search_fields = ('route_name',)

@admin.register(Route)
class RouteAdmin(ImportExportModelAdmin):
    list_display = ('id', 'file', 'route_name', 'coordinates', 'assigned_at', 'updated_at')
    list_filter = ('file',)
    search_fields = ('file', 'route_name')