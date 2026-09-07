import React, { useEffect } from "react";
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

// Fix standard Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Auto re-center view helper
function AutoRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center);
    }
  }, [center, map]);
  return null;
}

export default function MapView({
  locations = [],
  activePoint = null,
  height = "500px",
}) {
  const currentPoint = activePoint || locations[0] || {};
  
  const mapCenter = [
    Number(currentPoint.latitude) || 18.5204,
    Number(currentPoint.longitude) || 73.8567,
  ];

  const polylineCoords = locations.map((loc) => [
    Number(loc.latitude),
    Number(loc.longitude),
  ]);

  return (
    <div
      style={{ height }}
      className="w-full rounded-xl overflow-hidden shadow-md border border-gray-100"
    >
      <MapContainer center={mapCenter} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoRecenter center={mapCenter} />

        {/* Traveled Polyline Path */}
        {polylineCoords.length > 0 && (
          <Polyline positions={polylineCoords} color="#2563eb" weight={5} />
        )}

        {/* Dynamic Vehicle Marker */}
        {currentPoint.latitude && currentPoint.longitude && (
          <Marker position={mapCenter}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-800">
                  Vehicle ID: {currentPoint.vehicle}
                </p>
                <p className="text-blue-600 font-semibold">
                  Speed: {currentPoint.speed} km/h
                </p>
                <p className="text-gray-600">
                  Ignition: {currentPoint.ignition ? "ON" : "OFF"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentPoint.gps_timestamp
                    ? new Date(currentPoint.gps_timestamp).toLocaleString()
                    : ""}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}