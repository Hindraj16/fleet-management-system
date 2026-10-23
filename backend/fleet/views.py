from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
import xml.etree.ElementTree as ET
from django.db.models import Q
import json
from .models import Vehicle, GPSLocation, Route, RouteHistory ,AssignedRoute
from .serializers import VehicleSerializer, GPSLocationSerializer, RouteSerializer, RouteHistorySerializer, AssignedRouteSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by("-created_at")
    serializer_class = VehicleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["vehicle_number", "device_id", "vendor_name"]


class GPSLocationViewSet(viewsets.ModelViewSet):
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
            return Response({"error": "IMEI is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            vehicle = Vehicle.objects.get(imei_number=imei)
        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found"},status=status.HTTP_404_NOT_FOUND)
        gps_time = parse_datetime(gps_timestamp)
        location = GPSLocation.objects.create(vehicle=vehicle, latitude=latitude, longitude=longitude, speed=speed, gnition=ignition, gps_timestamp=gps_time)
        return Response({"message": "GPS data saved","vehicle": vehicle.vehicle_number,"location_id": location.id})

    def get_queryset(self):
        queryset = GPSLocation.objects.select_related("vehicle").all()
        vehicle_id = self.request.query_params.get("vehicle") or self.request.query_params.get("vehicle_id")
        device_id = self.request.query_params.get("device_id")
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        elif device_id:
            queryset = queryset.filter(vehicle__device_id=device_id)
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
            latest_ping = (GPSLocation.objects.filter(vehicle=vehicle).order_by("-gps_timestamp").first())
            if latest_ping:
                latest_pings.append(self.get_serializer(latest_ping).data)

        return Response(latest_pings, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=["get"], url_path=r'live-status/(?P<vehicle_identifier>[^/]+)')
    def live_status(self, request, vehicle_identifier=None):
        identifier_str = str(vehicle_identifier).strip()
        vehicle_query = Q(id=int(identifier_str)) | Q(vehicle_number=identifier_str) if identifier_str.isdigit() else Q(vehicle_number=identifier_str)
        vehicle = Vehicle.objects.filter(vehicle_query).first()

        if not vehicle:
            return Response({"detail": f"Vehicle '{vehicle_identifier}' not found."},status=status.HTTP_404_NOT_FOUND)

        latest_ping = (GPSLocation.objects.filter(vehicle=vehicle).order_by("-gps_timestamp").first())

        if not latest_ping:
            return Response({"detail": f"No GPS data found for vehicle '{vehicle_identifier}'."},status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(latest_ping)
        return Response(serializer.data, status=status.HTTP_200_OK)

def parse_kml_file(uploaded_file):
    uploaded_file.seek(0)
    try:
        tree = ET.parse(uploaded_file)
        root = tree.getroot()
    except Exception as e:
        raise ValueError(f"Invalid KML file: {str(e)}")
    coordinates = []
    for element in root.iter():
        if element.tag.endswith("coordinates"):
            text = element.text or ""
            for coord in text.strip().split():
                parts = coord.split(",")
                if len(parts) >= 2:
                    try:
                        longitude = float(parts[0])
                        latitude = float(parts[1])
                        coordinates.append([latitude, longitude])
                    except ValueError:
                        continue
    return coordinates

class RouteHistoryViewSet(viewsets.ModelViewSet):
    queryset = RouteHistory.objects.all().order_by("-created_at")
    serializer_class = RouteHistorySerializer
    
class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by("-assigned_at")
    serializer_class = RouteSerializer

    def create(self, request, *args, **kwargs):
        print("\n========== CREATE ROUTE ==========")
        print("REQUEST DATA:", request.data)
        print("REQUEST FILES:", request.FILES)  
        print("==================================")

        route_name = request.data.get("route_name")
        uploaded_file = request.FILES.get("file") or request.FILES.get("kml_file")
        
        # --- Handle detailed_points (JSON string asel tar parse kara, nahi tar list gya) ---
        raw_detailed_points = request.data.get("detailed_points", [])
        detailed_points = []
        if isinstance(raw_detailed_points, str):
            try:
                detailed_points = json.loads(raw_detailed_points)
            except json.JSONDecodeError:
                detailed_points = []
        elif isinstance(raw_detailed_points, list):
            detailed_points = raw_detailed_points

        if not route_name:
            return Response({"detail": "Route name is required."}, status=status.HTTP_400_BAD_REQUEST)

        coordinates = []
        if uploaded_file:
            try:
                coordinates = parse_kml_file(uploaded_file)
                uploaded_file.seek(0)
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({"detail": "No valid coordinates found."}, status=status.HTTP_400_BAD_REQUEST)
            
        print("Parsed coordinates sample:", coordinates[:5])
        print("Total coordinate points:", len(coordinates))
        
        vehicle_number = request.data.get("vehicle_number")

        # Purana route delete karun navin save kara
        Route.objects.filter(route_name__iexact=route_name).delete()
        
        # --- 1. Route Table Madhe Save Kara (Coordinates & Detailed Points Sah) ---
        route_kwargs = {
            "route_name": route_name,
            "coordinates": coordinates,
            "detailed_points": detailed_points, # <--- Ithe pan add kela
        }
        if uploaded_file:
            route_kwargs["file"] = uploaded_file

        route = Route.objects.create(**route_kwargs)
        
        # --- 2. RouteHistory Madhe Entry Kara ---
        RouteHistory.objects.create(
            route_name=route_name, 
            file_name=uploaded_file.name if uploaded_file else "edited_route.kml", 
            coordinates=coordinates,
            detailed_points=detailed_points # <--- Ithe pan labels/names barobar save honar
        )

        serializer = self.get_serializer(route)
        print("\n========== ROUTE SAVED ==========")
        print(serializer.data)
        print("=================================\n")
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # --- NAVIN: Front-end chya EditKMLFile sathi custom save action ---
    @action(detail=False, methods=['post'], url_path='save-route')
    def save_route_endpoint(self, request):
        print("\n========== SAVE ROUTE ENDPOINT ==========")
        print("REQUEST DATA:", request.data)
        print("=========================================")

        data = request.data
        route_name = data.get("route_name")
        vehicle_number = data.get("vehicle_number")
        coordinates = data.get("coordinates")
        detailed_points = data.get("detailed_points", [])

        if not route_name or not coordinates:
            return Response({"detail": "Route name and coordinates are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Database madhe route update kinva create kara
        route, created = Route.objects.update_or_create(
            route_name__iexact=route_name,
            defaults={
                "route_name": route_name,
                "coordinates": coordinates,
            }
        )

        # RouteHistory madhe pan save/update karu sakta
        RouteHistory.objects.create(
            route_name=route_name,
            file_name=f"route_{route_name}.kml",
            coordinates=coordinates
        )

        serializer = self.get_serializer(route)
        return Response({
            "status": "success",
            "message": f"Route '{route_name}' successfully saved!",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def get_queryset(self):
        queryset = super().get_queryset()
        route_name = self.request.query_params.get("route_name") or self.request.query_params.get("name")
        if route_name:
            queryset = queryset.filter(route_name__icontains=route_name)
        return queryset

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        route_name = request.data.get("route_name", instance.route_name)
        uploaded_file = request.FILES.get("file") or request.FILES.get("kml_file")
        if uploaded_file:
            try:
                coordinates = parse_kml_file(uploaded_file)
                uploaded_file.seek(0)
                instance.file = uploaded_file
                instance.coordinates = coordinates
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            if not coordinates:
                return Response({"detail": "No valid coordinates found in KML."}, status=status.HTTP_400_BAD_REQUEST)
        elif "coordinates" in request.data:
            instance.coordinates = request.data.get("coordinates")

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
        return Response({"message": "Saved route successfully deleted."}, status=status.HTTP_204_NO_CONTENT)
    
class AssignedRouteViewSet(viewsets.ModelViewSet):
    queryset = AssignedRoute.objects.select_related('vehicle').all()
    serializer_class = AssignedRouteSerializer

    def create(self, request, *args, **kwargs):
        vehicle_input = request.data.get("vehicle")
        route_input = request.data.get("route")
        if not vehicle_input or not route_input:
            return Response({"detail": "Both vehicle and route are required."}, status=status.HTTP_400_BAD_REQUEST)
        vehicle_str = str(vehicle_input).strip()
        vehicle = Vehicle.objects.filter(Q(id=int(vehicle_str)) | Q(vehicle_number=vehicle_str) if vehicle_str.isdigit() else Q(vehicle_number=vehicle_str)).first()
        if not vehicle:
            return Response({"detail": f"Vehicle '{vehicle_input}' not found."}, status=status.HTTP_404_NOT_FOUND)
        route_str = str(route_input).strip()
        route = RouteHistory.objects.filter(Q(id=int(route_str)) | Q(route_name=route_str) if route_str.isdigit() else Q(route_name=route_str)).first()
        if not route:
            return Response({"detail": f"Route '{route_input}' not found."}, status=status.HTTP_404_NOT_FOUND)
        if AssignedRoute.objects.filter(vehicle=vehicle, route_name=route.route_name).exists():
            return Response({"detail": f"Route '{route.route_name}' is already assigned to vehicle '{vehicle.vehicle_number}'."},status=status.HTTP_400_BAD_REQUEST)
        assigned_route = AssignedRoute.objects.create(vehicle=vehicle, route_name=route.route_name, file=getattr(route, 'file', None) or getattr(route, 'kml_file', None), coordinates=getattr(route, 'coordinates', None))
        serializer = self.get_serializer(assigned_route)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path=r'by-vehicle/(?P<vehicle_identifier>[^/]+)')
    def get_by_vehicle(self, request, vehicle_identifier=None):
        identifier_str = str(vehicle_identifier).strip()
        query = Q(vehicle__id=int(identifier_str)) | Q(vehicle__vehicle_number=identifier_str) if identifier_str.isdigit() else Q(vehicle__vehicle_number=identifier_str)
        assignments = AssignedRoute.objects.filter(query).order_by('-assigned_at')
        if not assignments.exists():
            return Response({"detail": f"No routes assigned to vehicle '{vehicle_identifier}'."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)