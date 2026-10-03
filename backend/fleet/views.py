from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
import xml.etree.ElementTree as ET
import json
from .models import Vehicle, GPSLocation, UploadRoute, UploadRouteHistory ,AssignedRoute
from .serializers import VehicleSerializer, GPSLocationSerializer, UploadRouteSerializer, UploadRouteHistorySerializer, AssignedRouteSerializer

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


    @api_view(["POST"])
    def receive_gps(request):

        imei = request.data.get("imei")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        speed = request.data.get("speed", 0)
        ignition = request.data.get("ignition", False)
        gps_timestamp = request.data.get("gps_timestamp")

        if not imei:
            return Response(
                {"error": "IMEI is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            vehicle = Vehicle.objects.get(
                imei_number=imei
            )
        except Vehicle.DoesNotExist:
            return Response(
                {"error": "Vehicle not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        gps_time = parse_datetime(gps_timestamp)

        location = GPSLocation.objects.create(
            vehicle=vehicle,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            ignition=ignition,
            gps_timestamp=gps_time
        )

        return Response({
            "message": "GPS data saved",
            "vehicle": vehicle.vehicle_number,
            "location_id": location.id
        })

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

def parse_kml_file(uploaded_file):
    """
    Parse KML file and return coordinates as:

    [
        [latitude, longitude],
        [latitude, longitude],
        ...
    ]
    """

    uploaded_file.seek(0)

    try:
        tree = ET.parse(uploaded_file)
        root = tree.getroot()
    except Exception as e:
        raise ValueError(f"Invalid KML file: {str(e)}")

    coordinates = []

    for element in root.iter():

        # Handles normal KML namespaces too
        if element.tag.endswith("coordinates"):

            text = element.text or ""

            for coord in text.strip().split():

                parts = coord.split(",")

                if len(parts) >= 2:

                    try:
                        longitude = float(parts[0])
                        latitude = float(parts[1])

                        coordinates.append([
                            latitude,
                            longitude
                        ])

                    except ValueError:
                        continue

    return coordinates

class UploadRouteHistoryViewSet(viewsets.ModelViewSet):
    queryset = UploadRouteHistory.objects.all().order_by("-created_at")
    serializer_class = UploadRouteHistorySerializer


class UploadRouteViewSet(viewsets.ModelViewSet):
    queryset = UploadRoute.objects.all().order_by("-assigned_at")
    serializer_class = UploadRouteSerializer

    def create(self, request, *args, **kwargs):
        print("\n========== CREATE ROUTE ==========")
        print("REQUEST DATA:", request.data)
        print("REQUEST FILES:", request.FILES)
        print("==================================")

        route_name = request.data.get("route_name")
        # Check both 'file' and 'kml_file' keys from request.FILES
        uploaded_file = request.FILES.get("file") or request.FILES.get("kml_file")

        if not route_name:
            return Response(
                {"detail": "Route name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not uploaded_file:
            return Response(
                {"detail": "KML file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        coordinates = []

        # 1. Parse uploaded KML file directly on backend
        try:
            coordinates = parse_kml_file(uploaded_file)
            uploaded_file.seek(0)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Fallback: Parse coordinates if sent as JSON payload
        if not coordinates and "coordinates" in request.data:
            raw_coords = request.data.get("coordinates")
            if isinstance(raw_coords, str):
                try:
                    coordinates = json.loads(raw_coords)
                except json.JSONDecodeError:
                    pass
            elif isinstance(raw_coords, list):
                coordinates = raw_coords

        if not coordinates:
            return Response(
                {"detail": "No valid coordinates found inside the KML file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        print("Parsed coordinates sample:", coordinates[:5])
        print("Total coordinate points:", len(coordinates))

        # Overwrite existing route record if the route name already exists
        UploadRoute.objects.filter(route_name__iexact=route_name).delete()

        # Save route in database
        route = UploadRoute.objects.create(
            route_name=route_name,
            file=uploaded_file,
            coordinates=coordinates,
        )

        # Log history record
        UploadRouteHistory.objects.create(
            route_name=route_name,
            file_name=uploaded_file.name,
            coordinates=coordinates,
        )

        serializer = self.get_serializer(route)

        print("\n========== ROUTE SAVED ==========")
        print(serializer.data)
        print("=================================\n")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = super().get_queryset()
        # Safely filter by query parameter if provided (e.g., /routes/?route_name=new%20route)
        route_name = self.request.query_params.get("route_name") or self.request.query_params.get("name")
        if route_name:
            queryset = queryset.filter(route_name__icontains=route_name)
        return queryset

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        route_name = request.data.get("route_name", instance.route_name)
        uploaded_file = request.FILES.get("file") or request.FILES.get("kml_file")

        # Update file & coordinates ONLY if a new file is uploaded
        if uploaded_file:
            try:
                coordinates = parse_kml_file(uploaded_file)
                uploaded_file.seek(0)
                instance.file = uploaded_file
                instance.coordinates = coordinates
            except ValueError as e:
                return Response(
                    {"detail": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not coordinates:
                return Response(
                    {"detail": "No valid coordinates found in KML."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        instance.route_name = route_name
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Saved route successfully deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )

class AssignedRouteViewSet(viewsets.ModelViewSet):
    queryset = AssignedRoute.objects.select_related('vehicle').all()    
    serializer_class = AssignedRouteSerializer

    def create(self, request, *args, **kwargs):

        vehicle_id = request.data.get("vehicle_id") or request.data.get("vehicle")
        route_id = request.data.get("route_id") or request.data.get("route")

        if not vehicle_id or not route_id:
            return Response(
                {"detail": "Both vehicle and route identifiers are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lookup Vehicle (by ID or vehicle_number)
        try:
            if str(vehicle_id).isdigit():
                vehicle = Vehicle.objects.get(Q(id=vehicle_id) | Q(vehicle_number=str(vehicle_id)))
            else:
                vehicle = Vehicle.objects.get(vehicle_number=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({"detail": f"Vehicle '{vehicle_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Lookup Route (by ID or route_name)
        try:
            if str(route_id).isdigit():
                route = UploadRouteHistory.objects.get(Q(id=route_id) | Q(route_name=route_id))
            else:
                route = UploadRouteHistory.objects.get(route_name=route_id)
        except UploadRouteHistory.DoesNotExist:
            return Response({"detail": f"Route '{route_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Create or update assignment
        assigned_route, created = AssignedRoute.objects.update_or_create(
            vehicle=vehicle,
            defaults={"route": route}
        )

        serializer = self.get_serializer(assigned_route)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=False, methods=['get'], url_path='by-vehicle/(?P<vehicle_identifier>[^/.]+)')
    def get_by_vehicle(self, request, vehicle_identifier=None):
        try:
            # Query assignment using vehicle ID or vehicle_number
            assignment = AssignedRoute.objects.filter(
                Q(vehicle__id=vehicle_identifier) | Q(vehicle__vehicle_number=str(vehicle_identifier))
            ).first()

            if not assignment:
                return Response(
                    {"detail": f"No route currently assigned to vehicle '{vehicle_identifier}'."},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(assignment)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)