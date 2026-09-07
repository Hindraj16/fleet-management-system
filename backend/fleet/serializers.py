# backend/fleet/serializers.py

from rest_framework import serializers
from .models import Vehicle, GPSLocation


class VehicleSerializer(serializers.ModelSerializer):
    """
    Serializer for Fleet Vehicles
    Handles vehicle details and calculates total recorded GPS logs.
    """
    total_gps_logs = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id',
            'vehicle_number',
            'device_id',
            'vendor_name',
            'is_active',
            'total_gps_logs',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'total_gps_logs']

    def get_total_gps_logs(self, obj):
        # Returns total number of GPS points received for this vehicle
        return obj.locations.count()


class GPSLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for raw GPS location pings.
    Supports writing vehicle by ID (Primary Key) and optional nested reading.
    """
    # Accept Vehicle ID on POST requests
    vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all()
    )
    
    # Human-readable speed classification calculated dynamically
    speed_status = serializers.SerializerMethodField()

    class Meta:
        model = GPSLocation
        fields = [
            'id',
            'vehicle',
            'latitude',
            'longitude',
            'speed',
            'speed_status',
            'ignition',
            'gps_timestamp',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'speed_status']

    def get_speed_status(self, obj):
        if not obj.ignition or obj.speed == 0:
            return "Stopped"
        elif obj.speed > 80:
            return "Overspeeding"
        return "Moving"

    def validate_latitude(self, value):
        """Ensure coordinate falls in valid GPS Latitude range [-90, 90]"""
        if value < -90 or value > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        """Ensure coordinate falls in valid GPS Longitude range [-180, 180]"""
        if value < -180 or value > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value


class GPSLocationDetailSerializer(GPSLocationSerializer):
    """
    Expanded Serializer for GET requests to include full Vehicle info
    in the same JSON response instead of just the vehicle ID.
    """
    vehicle = VehicleSerializer(read_only=True)