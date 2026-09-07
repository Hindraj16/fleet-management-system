from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, GPSLocationViewSet

router = DefaultRouter()

router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"gps-locations", GPSLocationViewSet, basename="gps-location")

urlpatterns = router.urls