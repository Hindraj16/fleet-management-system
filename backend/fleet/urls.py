from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, GPSLocationViewSet, UploadRouteViewSet, UploadRouteHistoryViewSet, AssignedRouteViewSet 
router = DefaultRouter()

router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"gps-locations", GPSLocationViewSet, basename="gps-location")
router.register(r'upload-route', UploadRouteViewSet, basename='upload-route')
router.register(r'route-history', UploadRouteHistoryViewSet, basename='route-history')
router.register(r'assign-route', AssignedRouteViewSet, basename='assign-route')
router.register(r'assigned-routes', AssignedRouteViewSet, basename='assigned-route')

urlpatterns = router.urls