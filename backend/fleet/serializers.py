from rest_framework import serializers
from .models import Vehicle, GPSLocation, Route, RouteHistory


class VehicleSerializer(serializers.ModelSerializer):

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
        extra_kwargs = {'device_id': {'required': False, 'allow_null': True}}

    def get_total_gps_logs(self, obj):
        # Returns total number of GPS points received for this vehicle using related_name 'gps_locations'
        return obj.gps_locations.count()


class GPSLocationSerializer(serializers.ModelSerializer):
    # Accept Vehicle ID on POST requests
    vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all()
    )
    
    # Human-readable speed classification calculated dynamically
    speed_status = serializers.SerializerMethodField()

    class Meta:
        model = GPSLocation
        fields = ['id', 'vehicle', 'latitude', 'longitude', 'speed', 'speed_status', 'gps_timestamp']
        read_only_fields = ['id', 'speed_status']

    def get_speed_status(self, obj):
        if obj.speed == 0:
            return "Stopped"
        elif obj.speed > 80:
            return "Overspeeding"
        return "Moving"

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value


class GPSLocationDetailSerializer(GPSLocationSerializer):
    vehicle = VehicleSerializer(read_only=True)


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ["coordinates", "status", "updated_at"]


class RouteHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteHistory
        fields = ["id", "route_name", "file_name", "coordinates", "detailed_points", "created_at"]
        read_only_fields = ["id", "created_at"]

