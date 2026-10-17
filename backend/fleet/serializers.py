from rest_framework import serializers
from .models import Vehicle, GPSLocation, UploadRoute, UploadRouteHistory, AssignedRoute


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
    vehicle = VehicleSerializer(read_only=True)


class UploadRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadRoute
        fields = ["id", "route_name", "file", "coordinates", "assigned_at", "updated_at"]
        read_only_fields = ["id", "coordinates", "assigned_at", "updated_at"]


class UploadRouteHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadRouteHistory
        fields = ["id", "route_name", "file_name", "coordinates", "created_at"]
        read_only_fields = ["id", "created_at"]


class AssignedRouteSerializer(serializers.ModelSerializer):
    # Field to output the vehicle number or name for frontend display
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)

    class Meta:
        model = AssignedRoute
        fields = [
            'id', 
            'vehicle',          # Allows setting/updating vehicle ID
            'vehicle_number',   # Read-only string for React UI display
            'route_name',       # Direct CharField on AssignedRoute model
            'file',             # Direct FileField on AssignedRoute model
            'coordinates',      # Direct JSONField on AssignedRoute model
            'assigned_at', 
            'updated_at'
        ]