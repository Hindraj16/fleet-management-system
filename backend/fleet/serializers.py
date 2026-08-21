from rest_framework import serializers
from .models import Driver, GPSLocation, Trip, Vehicle


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ["id", "name", "phone", "license_number", "created_at"]
        read_only_fields = ["id", "created_at"]


class VehicleSerializer(serializers.ModelSerializer):
    driver_name = serializers.ReadOnlyField(source="driver.name")
    driver_phone = serializers.ReadOnlyField(source="driver.phone")

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "name",
            "imei",
            "type",
            "category",
            "vehicle_number",
            "serial_number",
            "api_key",
            "driver",
            "driver_name",
            "driver_phone",
            "status",
            "speed",
            "fuel",
            "battery",
            "latitude",
            "longitude",
            "location",
            "total_distance",
            "today_distance",
            "engine_on",
            "gps_signal",
            "last_updated",
            "created_at",
        ]
        read_only_fields = ["id", "api_key", "created_at", "last_updated"]


class GPSLocationSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.ReadOnlyField(source="vehicle.name")
    vehicle_number = serializers.ReadOnlyField(source="vehicle.vehicle_number")

    class Meta:
        model = GPSLocation
        fields = [
            "id",
            "vehicle",
            "vehicle_name",
            "vehicle_number",
            "latitude",
            "longitude",
            "speed",
            "fuel",
            "battery",
            "recorded_at",
        ]
        read_only_fields = ["id", "recorded_at"]


class TripSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.ReadOnlyField(source="vehicle.name")
    vehicle_number = serializers.ReadOnlyField(source="vehicle.vehicle_number")
    driver_name = serializers.ReadOnlyField(source="driver.name")

    class Meta:
        model = Trip
        fields = [
            "id",
            "vehicle",
            "vehicle_name",
            "vehicle_number",
            "driver",
            "driver_name",
            "start_location",
            "end_location",
            "start_latitude",
            "start_longitude",
            "end_latitude",
            "end_longitude",
            "distance",
            "status",
            "started_at",
            "completed_at",
        ]
        read_only_fields = ["id", "started_at"]