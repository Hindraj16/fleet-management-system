from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DriverViewSet,
    GPSLocationViewSet,
    TripViewSet,
    VehicleViewSet,
    dashboard_stats,
    receive_gps_data,
    update_vehicle_location,
)

app_name = "tracking"

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("drivers", DriverViewSet, basename="driver")
router.register("gps", GPSLocationViewSet, basename="gps-location")
router.register("trips", TripViewSet, basename="trip")

urlpatterns = [
    # 1. Custom paths MUST come FIRST so Django doesn't confuse "device" with an ID
    path("dashboard/", dashboard_stats, name="dashboard-stats"),
    path("location/update/", update_vehicle_location, name="update-vehicle-location"),
    path("gps/device/", receive_gps_data, name="receive-gps-data"),
    
    # 2. Router endpoints come LAST
    path("", include(router.urls)),
]