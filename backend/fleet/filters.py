from django_filters import rest_framework as filters
from .models import GPSLocation

class GPSLocationFilter(filters.FilterSet):
    start_date = filters.IsoDateTimeFilter(field_name="recorded_at", lookup_expr="gte")
    end_date = filters.IsoDateTimeFilter(field_name="recorded_at", lookup_expr="lte")

    class Meta:
        model = GPSLocation
        fields = ["vehicle", "start_date", "end_date"]
        