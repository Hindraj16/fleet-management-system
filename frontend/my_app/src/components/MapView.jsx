import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Start Icon
const createStartIcon = () =>
  L.divIcon({
    className: "custom-start-marker",
    html: `<div style="
      background-color: #10B981;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// End Icon
const createEndIcon = () =>
  L.divIcon({
    className: "custom-end-marker",
    html: `<div style="
      background-color: #EF4444;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// Red Point (Saved Route Point)
const createRedDotIcon = (isSelected = false) =>
  L.divIcon({
    className: "custom-red-dot",
    html: `<div style="
      background-color: ${isSelected ? "#F59E0B" : "#EF4444"};
      width: ${isSelected ? "14px" : "10px"};
      height: ${isSelected ? "14px" : "10px"};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      cursor: grab;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Green Point (New Unsaved Point Added via Mouse Click/Table)
const createGreenDotIcon = () =>
  L.divIcon({
    className: "custom-green-dot",
    html: `<div style="
      background-color: #10B981;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      cursor: grab;
      animation: pulse 1.5s infinite;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Vertical Label Icon
const createLabelIcon = (labelText) =>
  L.divIcon({
    className: "custom-route-label-badge",
    html: `<div style="
      background-color: #111827;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 3px;
      border-radius: 4px;
      border: 1px solid #374151;
      white-space: nowrap;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      display: inline-block;
      text-align: center;
      line-height: 1;
    ">${labelText}</div>`,
    iconSize: [20, 60],
    iconAnchor: [10, 60],
  });

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function AutoRecenter({ segments, autoFitBounds, highlightedCoords }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (highlightedCoords) {
      map.setView(highlightedCoords, 17, { animate: true });
      return;
    }

    const allPoints = segments.flat(1);
    if (autoFitBounds && allPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
        }
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    }
  }, [segments, autoFitBounds, highlightedCoords, map]);

  return null;
}

export default function MapView({
  locations = [],
  highlightedIndex = null,
  height = "500px",
  zoom = 15,
  minZoom = 3,
  maxZoom = 19,
  autoFitBounds = true,
  onPointDrag = null,
  onMapClick = null,
}) {
  const parsePoint = (pt) => {
    if (!pt) return null;
    let lat = Number(pt.lat ?? pt[0]);
    let lng = Number(pt.lng ?? pt[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  };

  const allParsedPoints = locations
    .map((item) => parsePoint(item))
    .filter(Boolean);

  const firstPoint = allParsedPoints[0] || null;
  const lastPoint =
    allParsedPoints.length > 0 ? allParsedPoints[allParsedPoints.length - 1] : null;

  let highlightedCoords = null;
  if (highlightedIndex !== null && locations[highlightedIndex]) {
    highlightedCoords = parsePoint(locations[highlightedIndex]);
  }

  const mapCenter = highlightedCoords || firstPoint || [18.5204, 73.8567];

  return (
    <div
      style={{ height }}
      className="w-full rounded-xl overflow-hidden shadow-md border border-gray-100 relative z-0"
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        className="h-full w-full cursor-crosshair"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={onMapClick} />

        <AutoRecenter
          segments={[allParsedPoints]}
          autoFitBounds={autoFitBounds && highlightedIndex === null}
          highlightedCoords={highlightedCoords}
        />

        {/* Route Blue Line */}
        {allParsedPoints.length > 1 && (
          <Polyline
            positions={allParsedPoints}
            color="#2563eb"
            weight={5}
            opacity={0.85}
          />
        )}

        {/* Render ALL Route Points as Red/Green Draggable Dots */}
        {locations.map((item, idx) => {
          const pos = parsePoint(item);
          if (!pos) return null;

          const isNew = item.isNew === true;
          const isSelected = highlightedIndex === idx;

          return (
            <Marker
              key={`route-dot-${idx}-${pos[0]}-${pos[1]}`}
              position={pos}
              draggable={true}
              icon={isNew ? createGreenDotIcon() : createRedDotIcon(isSelected)}
              eventHandlers={{
                dragend: (e) => {
                  const newLatLng = e.target.getLatLng();
                  if (onPointDrag) {
                    onPointDrag(idx, newLatLng.lat, newLatLng.lng);
                  }
                },
              }}
            />
          );
        })}

        {/* Render Vertical Labels for Custom Names */}
        {locations.map((item, idx) => {
          const pos = parsePoint(item);
          if (!pos) return null;
          const nameText = (item.name || "").trim();

          if (
            !nameText ||
            nameText.toLowerCase() === "type/name" ||
            nameText.toLowerCase().startsWith("point #")
          ) {
            return null;
          }

          return (
            <Marker
              key={`named-label-${idx}-${nameText}`}
              position={pos}
              icon={createLabelIcon(nameText)}
            />
          );
        })}

        {/* Start & End Overlay Icons */}
        {firstPoint && <Marker position={firstPoint} icon={createStartIcon()} />}
        {lastPoint && <Marker position={lastPoint} icon={createEndIcon()} />}
      </MapContainer>
    </div>
  );
}import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Start Icon
const createStartIcon = () =>
  L.divIcon({
    className: "custom-start-marker",
    html: `<div style="
      background-color: #10B981;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// End Icon
const createEndIcon = () =>
  L.divIcon({
    className: "custom-end-marker",
    html: `<div style="
      background-color: #EF4444;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// Red Point (Saved Route Point)
const createRedDotIcon = (isSelected = false) =>
  L.divIcon({
    className: "custom-red-dot",
    html: `<div style="
      background-color: ${isSelected ? "#F59E0B" : "#EF4444"};
      width: ${isSelected ? "14px" : "10px"};
      height: ${isSelected ? "14px" : "10px"};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      cursor: grab;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Green Point (New Unsaved Point Added via Mouse Click/Table)
const createGreenDotIcon = () =>
  L.divIcon({
    className: "custom-green-dot",
    html: `<div style="
      background-color: #10B981;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      cursor: grab;
      animation: pulse 1.5s infinite;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Vertical Label Icon
const createLabelIcon = (labelText) =>
  L.divIcon({
    className: "custom-route-label-badge",
    html: `<div style="
      background-color: #111827;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 3px;
      border-radius: 4px;
      border: 1px solid #374151;
      white-space: nowrap;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
      display: inline-block;
      text-align: center;
      line-height: 1;
    ">${labelText}</div>`,
    iconSize: [20, 60],
    iconAnchor: [10, 60],
  });

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function AutoRecenter({ segments, autoFitBounds, highlightedCoords }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (highlightedCoords) {
      map.setView(highlightedCoords, 17, { animate: true });
      return;
    }

    const allPoints = segments.flat(1);
    if (autoFitBounds && allPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
        }
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    }
  }, [segments, autoFitBounds, highlightedCoords, map]);

  return null;
}

export default function MapView({
  locations = [],
  highlightedIndex = null,
  height = "500px",
  zoom = 15,
  minZoom = 3,
  maxZoom = 19,
  autoFitBounds = true,
  onPointDrag = null,
  onMapClick = null,
}) {
  const parsePoint = (pt) => {
    if (!pt) return null;
    let lat = Number(pt.lat ?? pt[0]);
    let lng = Number(pt.lng ?? pt[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  };

  const allParsedPoints = locations
    .map((item) => parsePoint(item))
    .filter(Boolean);

  const firstPoint = allParsedPoints[0] || null;
  const lastPoint =
    allParsedPoints.length > 0 ? allParsedPoints[allParsedPoints.length - 1] : null;

  let highlightedCoords = null;
  if (highlightedIndex !== null && locations[highlightedIndex]) {
    highlightedCoords = parsePoint(locations[highlightedIndex]);
  }

  const mapCenter = highlightedCoords || firstPoint || [18.5204, 73.8567];

  return (
    <div
      style={{ height }}
      className="w-full rounded-xl overflow-hidden shadow-md border border-gray-100 relative z-0"
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        className="h-full w-full cursor-crosshair"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={onMapClick} />

        <AutoRecenter
          segments={[allParsedPoints]}
          autoFitBounds={autoFitBounds && highlightedIndex === null}
          highlightedCoords={highlightedCoords}
        />

        {/* Route Blue Line */}
        {allParsedPoints.length > 1 && (
          <Polyline
            positions={allParsedPoints}
            color="#2563eb"
            weight={5}
            opacity={0.85}
          />
        )}

        {/* Render ALL Route Points as Red/Green Draggable Dots */}
        {locations.map((item, idx) => {
          const pos = parsePoint(item);
          if (!pos) return null;

          const isNew = item.isNew === true;
          const isSelected = highlightedIndex === idx;

          return (
            <Marker
              key={`route-dot-${idx}-${pos[0]}-${pos[1]}`}
              position={pos}
              draggable={true}
              icon={isNew ? createGreenDotIcon() : createRedDotIcon(isSelected)}
              eventHandlers={{
                dragend: (e) => {
                  const newLatLng = e.target.getLatLng();
                  if (onPointDrag) {
                    onPointDrag(idx, newLatLng.lat, newLatLng.lng);
                  }
                },
              }}
            />
          );
        })}

        {/* Render Vertical Labels for Custom Names */}
        {locations.map((item, idx) => {
          const pos = parsePoint(item);
          if (!pos) return null;
          const nameText = (item.name || "").trim();

          if (
            !nameText ||
            nameText.toLowerCase() === "type/name" ||
            nameText.toLowerCase().startsWith("point #")
          ) {
            return null;
          }

          return (
            <Marker
              key={`named-label-${idx}-${nameText}`}
              position={pos}
              icon={createLabelIcon(nameText)}
            />
          );
        })}

        {/* Start & End Overlay Icons */}
        {firstPoint && <Marker position={firstPoint} icon={createStartIcon()} />}
        {lastPoint && <Marker position={lastPoint} icon={createEndIcon()} />}
      </MapContainer>
    </div>
  );
}