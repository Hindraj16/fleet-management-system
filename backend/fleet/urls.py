from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, GPSLocationViewSet, VehicleRouteViewSet, VehicleRouteHistoryViewSet 

router = DefaultRouter()

router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"gps-locations", GPSLocationViewSet, basename="gps-location")
router.register(r'assigned-routes', VehicleRouteViewSet, basename='assigned-route')
router.register(r'route-history', VehicleRouteHistoryViewSet, basename='route-history')

urlpatterns = router.urls