from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .filters import GPSLocationFilter
from .models import Driver, GPSLocation, Trip, Vehicle
from .serializers import (
    DriverSerializer,
    GPSLocationSerializer,
    TripSerializer,
    VehicleSerializer,
)

# -------------------------------------------------------------------
# VIEWSETS
# -------------------------------------------------------------------

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related("driver").all()
    serializer_class = VehicleSerializer


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer


class GPSLocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GPSLocation.objects.select_related("vehicle").order_by("recorded_at")
    serializer_class = GPSLocationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = GPSLocationFilter

    def get_queryset(self):
        queryset = GPSLocation.objects.select_related("vehicle").order_by("recorded_at")

        vehicle_id = self.request.query_params.get("vehicle")
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)

        if start_date:
            parsed_start = parse_datetime(start_date)
            if parsed_start:
                queryset = queryset.filter(recorded_at__gte=parsed_start)

        if end_date:
            parsed_end = parse_datetime(end_date)
            if parsed_end:
                queryset = queryset.filter(recorded_at__lte=parsed_end)

        return queryset

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer


# -------------------------------------------------------------------
# DASHBOARD STATS
# -------------------------------------------------------------------

@api_view(["GET"])
def dashboard_stats(request):
    """Single DB query aggregation for fleet counters."""
    stats = Vehicle.objects.aggregate(
        total_vehicles=Count("id"),
        moving=Count("id", filter=Q(status="moving")),
        idle=Count("id", filter=Q(status="idle")),
        offline=Count("id", filter=Q(status="offline")),
    )
    return Response(stats, status=status.HTTP_200_OK)


# -------------------------------------------------------------------
# TELEMETRY PROCESSING HELPER
# -------------------------------------------------------------------

def _process_gps_telemetry(vehicle: Vehicle, latitude: float, longitude: float, speed: float, fuel: float = 0.0, engine_on: bool = False):
    """
    Core service logic to update vehicle telemetry and log history.
    Enforces selective column updates and WebSocket broadcasts.
    """
    parsed_speed = max(0.0, float(speed))
    new_status = "moving" if parsed_speed > 0 else "idle"

    # 1. Update Vehicle instance using explicit update_fields
    vehicle.latitude = latitude
    vehicle.longitude = longitude
    vehicle.speed = parsed_speed
    vehicle.fuel = fuel
    vehicle.engine_on = engine_on
    vehicle.status = new_status
    vehicle.save(update_fields=["latitude", "longitude", "speed", "fuel", "engine_on", "status"])

    # 2. Save GPS historical log
    GPSLocation.objects.create(
        vehicle=vehicle,
        latitude=latitude,
        longitude=longitude,
        speed=parsed_speed,
        fuel=fuel,
    )

    # 3. Broadcast update to Django Channels WebSocket group for real-time map updates
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "live_vehicles",
            {
                "type": "vehicle_position_update",
                "data": {
                    "vehicle_id": vehicle.id,
                    "imei": getattr(vehicle, "imei_number", None),
                    "latitude": float(latitude),
                    "longitude": float(longitude),
                    "speed": parsed_speed,
                    "status": new_status,
                },
            },
        )


# -------------------------------------------------------------------
# INGESTION ENDPOINTS
# -------------------------------------------------------------------

@api_view(["POST"])
@transaction.atomic
def update_vehicle_location(request):
    """Ingest via Vehicle PK ID."""
    vehicle_id = request.data.get("vehicle_id")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if None in (vehicle_id, latitude, longitude):
        return Response(
            {"error": "vehicle_id, latitude, and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    vehicle = get_object_or_404(Vehicle, id=vehicle_id)
    _process_gps_telemetry(
        vehicle=vehicle,
        latitude=float(latitude),
        longitude=float(longitude),
        speed=request.data.get("speed", 0.0),
        fuel=getattr(vehicle, "fuel", 0.0),
    )

    return Response({"message": "Location updated successfully"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@transaction.atomic
def receive_gps_data(request):
    """Ingest GPS telemetry via Device IMEI with API key authorization."""
    imei = request.data.get("imei")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    # 1. Read API Key from HTTP Header (preferred) or request body
    provided_key = request.headers.get("X-API-KEY") or request.data.get("api_key")

    # 2. Check for required parameters
    if None in (imei, latitude, longitude):
        return Response(
            {"error": "imei, latitude, and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not provided_key:
        return Response(
            {"error": "API key required in 'X-API-KEY' header or 'api_key' field."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 3. Look up vehicle by IMEI
    try:
        vehicle = Vehicle.objects.get(imei_number=imei)
    except Vehicle.DoesNotExist:
        return Response(
            {"error": "Unknown GPS device"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # 4. Verify API Key against vehicle's key (if field exists on Vehicle model)
    if hasattr(vehicle, "api_key") and vehicle.api_key and vehicle.api_key != provided_key:
        return Response(
            {"error": "Unauthorized: Invalid API key"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 5. Process location data & update history
    _process_gps_telemetry(
        vehicle=vehicle,
        latitude=float(latitude),
        longitude=float(longitude),
        speed=request.data.get("speed", 0.0),
        fuel=request.data.get("fuel", 0.0),
        engine_on=request.data.get("ignition", False),
    )

    return Response(
        {
            "success": True,
            "vehicle": getattr(vehicle, "vehicle_number", vehicle.id),
            "status": vehicle.status,
        },
        status=status.HTTP_200_OK,
    )