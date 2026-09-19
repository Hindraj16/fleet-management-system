import { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.divIcon.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function CalloutMarker({ position, index, onDragEnd }) {
  const eventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker) {
          const latLng = marker.getLatLng();
          onDragEnd(index, [latLng.lat, latLng.lng]);
        }
      },
    }),
    [index, onDragEnd]
  );

  return (
    <Marker position={position} draggable={true} eventHandlers={eventHandlers}>
      <Popup>
        <div className="p-1 text-center">
          <p className="font-bold text-blue-600">Point #{index + 1}</p>
          <p className="text-xs text-gray-500">Drag marker to reposition</p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function RouteMap({
  routeCoordinates,
  handleMarkerDragEnd,
  activeTab,
  expandedSection,
  POINTS_PER_SECTION = 50,
}) {
  const defaultCenter = [18.5204, 73.8567];
  const isKmlLatLongEditTab = activeTab === "save";

  // Compute exact coordinates slice for the expanded section
  const currentSectionWaypoints = useMemo(() => {
    if (!isKmlLatLongEditTab || expandedSection === null || expandedSection === undefined) {
      return [];
    }

    const startIdx = expandedSection * POINTS_PER_SECTION;
    const endIdx = startIdx + POINTS_PER_SECTION;

    return routeCoordinates
      .slice(startIdx, endIdx)
      .map((coord, offset) => ({
        coord,
        globalIndex: startIdx + offset,
      }));
  }, [isKmlLatLongEditTab, expandedSection, POINTS_PER_SECTION, routeCoordinates]);

  return (
    <>
      {/* Leaflet Map Display */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
        <div className="h-[520px] w-full rounded-lg overflow-hidden">
          <MapContainer
            center={routeCoordinates[0] || defaultCenter}
            zoom={15}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RecenterMap bounds={routeCoordinates} />

            {routeCoordinates.length > 0 && (
              <>
                {/* Full route polyline */}
                <Polyline
                  positions={routeCoordinates}
                  color="#51a8b0"
                  weight={3}
                  opacity={0.8}
                />

                {/* Overall Start & End Pin Markers */}
                <Marker position={routeCoordinates[0]}>
                  <Popup>Start Point</Popup>
                </Marker>
                <Marker position={routeCoordinates[routeCoordinates.length - 1]}>
                  <Popup>End Point</Popup>
                </Marker>

                {/* Markers ONLY for points inside the open Section #1 (Points 1-50) */}
                {isKmlLatLongEditTab &&
                  currentSectionWaypoints.map(({ coord, globalIndex }) => (
                    <CalloutMarker
                      key={`marker-${globalIndex}`}
                      position={coord}
                      index={globalIndex}
                      onDragEnd={handleMarkerDragEnd}
                    />
                  ))}
              </>
            )}
          </MapContainer>
        </div>
      </div>
    </>
  );
}