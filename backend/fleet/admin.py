from django.contrib import admin

from .models import (
    Driver,
    Vehicle,
    GPSLocation,
    Trip,
)


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "phone",
        "license_number",
    )


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):

    list_display = (
        "vehicle_number",
        "driver",
        "status",
        "speed",
        "fuel",
        "battery",
        "location",
        "last_updated",
    )

    list_filter = (
        "status",
        "engine_on",
    )

    search_fields = (
        "vehicle_number",
        "location",
        "driver__name",
    )


@admin.register(GPSLocation)
class GPSLocationAdmin(admin.ModelAdmin):

    list_display = (
        "vehicle",
        "latitude",
        "longitude",
        "speed",
        "fuel",
        "recorded_at",
    )


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):

    list_display = (
        "vehicle",
        "driver",
        "start_location",
        "end_location",
        "distance",
        "status",
        "started_at",
    )

    list_filter = (
        "status",
    )
