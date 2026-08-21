import secrets
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def generate_api_key():
    """Generates a unique 64-character hex API key."""
    return secrets.token_hex(32)


class Driver(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    license_number = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Vehicle(models.Model):
    STATUS_CHOICES = [
        ("moving", "Moving"),
        ("idle", "Idle"),
        ("offline", "Offline"),
    ]

    TYPE_CHOICES = [
        ("SWEEPER", "SWEEPER"),
        ("SMALL BELL TRUCK", "SMALL BELL TRUCK"),
        ("COMPACTOR", "COMPACTOR"),
    ]

    CATEGORY_CHOICES = [
        ("Primary", "Primary"),
        ("Secondary", "Secondary"),
    ]

    # Required by UI Form
    name = models.CharField(max_length=100, help_text="Vehicle display name")
    imei = models.CharField(
        max_length=30, 
        unique=True, 
        db_index=True, 
        help_text="IMEI identifier"
    )
    type = models.CharField(
        max_length=50, 
        choices=TYPE_CHOICES, 
        default="SWEEPER"
    )
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES, 
        default="Primary"
    )

    # Secondary / Hardware Identifiers
    vehicle_number = models.CharField(max_length=30, blank=True, null=True)
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Vehicle GPS device serial number",
    )
    api_key = models.CharField(
        max_length=64,
        unique=True,
        default=generate_api_key,
        help_text="Secret API key assigned to this tracking device",
    )

    driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="offline",
        db_index=True,
    )
    speed = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
    )
    fuel = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )
    battery = models.FloatField(
        default=100.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )

    latitude = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
    )
    longitude = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
    )
    location = models.CharField(max_length=255, blank=True)

    total_distance = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
    )
    today_distance = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
    )

    engine_on = models.BooleanField(default=False)
    gps_signal = models.CharField(max_length=20, default="strong")

    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "-last_updated"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.imei})"


class GPSLocation(models.Model):
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name="gps_locations",
    )
    latitude = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
    )
    longitude = models.FloatField(
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
    )
    speed = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
    )
    fuel = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )
    battery = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "GPS Location"
        verbose_name_plural = "GPS Locations"
        indexes = [
            models.Index(fields=["vehicle", "-recorded_at"]),
        ]

    def __str__(self):
        return f"{self.vehicle.name} @ {self.recorded_at.strftime('%Y-%m-%d %H:%M:%S')}"


class Trip(models.Model):
    TRIP_STATUS_CHOICES = [
        ("started", "Started"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name="trips",
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trips",
    )

    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255, blank=True)

    start_latitude = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
    )
    start_longitude = models.FloatField(
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
    )

    end_latitude = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
    )
    end_longitude = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
    )

    distance = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0)],
    )
    status = models.CharField(
        max_length=20,
        choices=TRIP_STATUS_CHOICES,
        default="started",
        db_index=True,
    )

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["vehicle", "-started_at"]),
        ]

    def __str__(self):
        return f"Trip {self.id}: {self.vehicle.name} ({self.status})"