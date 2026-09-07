from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime

from .models import Vehicle, GPSLocation
from .serializers import VehicleSerializer, GPSLocationSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for fleet vehicles.
    Includes database optimization and text search.
    """
    queryset = Vehicle.objects.all().order_by("-created_at")
    serializer_class = VehicleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["vehicle_number", "device_id", "vendor_name"]


class GPSLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for telemetry logs with query-parameter filtering for vehicle IDs and date ranges.
    """
    serializer_class = GPSLocationSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["gps_timestamp", "speed"]
    ordering = ["-gps_timestamp"]

    def get_queryset(self):
        # Optimize database query by joining related vehicle data
        queryset = GPSLocation.objects.select_related("vehicle").all()

        # Filter by Vehicle ID or Device ID
        vehicle_id = self.request.query_params.get("vehicle") or self.request.query_params.get("vehicle_id")
        device_id = self.request.query_params.get("device_id")

        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        elif device_id:
            queryset = queryset.filter(vehicle__device_id=device_id)

        # Date Range Filtering for History Playback
        start_time = self.request.query_params.get("start_time")
        end_time = self.request.query_params.get("end_time")

        if start_time:
            parsed_start = parse_datetime(start_time)
            if parsed_start:
                queryset = queryset.filter(gps_timestamp__gte=parsed_start)

        if end_time:
            parsed_end = parse_datetime(end_time)
            if parsed_end:
                queryset = queryset.filter(gps_timestamp__lte=parsed_end)

        return queryset

    @action(detail=False, methods=["get"], url_path="latest")
    def latest_locations(self, request):
        """
        Custom Endpoint: GET /api/gps-locations/latest/
        Returns only the single most recent location ping per vehicle for live map overlays.
        """
        vehicles = Vehicle.objects.filter(is_active=True)
        latest_pings = []

        for vehicle in vehicles:
            latest_ping = (
                GPSLocation.objects.filter(vehicle=vehicle)
                .order_by("-gps_timestamp")
                .first()
            )
            if latest_ping:
                latest_pings.append(self.get_serializer(latest_ping).data)

        return Response(latest_pings, status=status.HTTP_200_OK)