import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet icon assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Helper component to smoothly center or fit bounds
function AutoRecenter({ center, polylineCoords, autoFitBounds }) {
  const map = useMap();

  useEffect(() => {
    // Flatten coordinate bounds check if multi-segment arrays exist
    const flatCoords = polylineCoords.flat(2);
    
    if (autoFitBounds && flatCoords.length > 0) {
      try {
        map.fitBounds(polylineCoords, { padding: [30, 30] });
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    } else if (center && center[0] && center[1]) {
      map.panTo(center);
    }
  }, [center, polylineCoords, autoFitBounds, map]);

  return null;
}

export default function MapView({
  locations = [],
  activePoint = null,
  height = "500px",
  zoom = 15,
  autoFitBounds = false,
  customIcon = null,
}) {
  // Safe coordinate parser helper
  const extractLatLng = (point) => {
    if (!point) return null;
    const lat = Number(point.latitude ?? point.lat);
    const lng = Number(point.longitude ?? point.lng);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 ? [lat, lng] : null;
  };

  // Process single or multi-segment location arrays
  const processLocations = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    // Check if data is an array of segments [[{lat, lng}, ...], [{...}]]
    if (Array.isArray(data[0])) {
      return data
        .map((segment) =>
          segment
            .map((pt) => extractLatLng(pt))
            .filter((pt) => pt !== null)
        )
        .filter((segment) => segment.length > 0);
    }

    // Flat array [{lat, lng}, {lat, lng}]
    return data
      .map((pt) => extractLatLng(pt))
      .filter((pt) => pt !== null);
  };

  const polylineCoords = processLocations(locations);

  // Extract initial active point or first available coordinate
  const firstValidPoint = polylineCoords.flat(1)[0];
  const currentPoint = activePoint || locations[0] || {};

  const mapCenter = [
    Number(currentPoint.latitude ?? currentPoint.lat) || firstValidPoint?.[0] || 18.5204,
    Number(currentPoint.longitude ?? currentPoint.lng) || firstValidPoint?.[1] || 73.8567,
  ];

  return (
    <div
      style={{ height }}
      className="w-full rounded-xl overflow-hidden shadow-md border border-gray-100 relative z-0"
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoRecenter
          center={mapCenter}
          polylineCoords={polylineCoords}
          autoFitBounds={autoFitBounds}
        />

        {/* Render Traveled Route Polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#2563eb"
            weight={5}
            opacity={0.8}
          />
        )}

        {/* Dynamic Marker */}
        {mapCenter[0] && mapCenter[1] && (
          <Marker
            position={mapCenter}
            icon={customIcon || new L.Icon.Default()}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-800">
                  Vehicle ID: {currentPoint.vehicle || currentPoint.vehicle_id || "N/A"}
                </p>
                <p className="text-blue-600 font-semibold">
                  Speed: {currentPoint.speed ?? 0} km/h
                </p>
                <p className="text-gray-600">
                  Ignition: {currentPoint.ignition ? "ON" : "OFF"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentPoint.gps_timestamp
                    ? new Date(currentPoint.gps_timestamp).toLocaleString()
                    : "No timestamp"}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}