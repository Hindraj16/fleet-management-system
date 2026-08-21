from rest_framework import permissions
from django.conf import settings

class HasGatewayAPIKey(permissions.BasePermission):
    def has_permission(self, request, view):
        api_key = request.headers.get("X-API-KEY")
        return api_key == getattr(settings, "GPS_GATEWAY_API_KEY", None)