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

const createGpsDotIcon = () =>
  L.divIcon({
    className: "custom-gps-dot",
    html: `<div style="
      background-color: #3b4ef6;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });

const createVehicleIcon = () =>
  L.divIcon({
    className: "custom-topdown-vehicle-marker",
    html: `<div style="
      width: 38px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="34" height="50" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4));">
        <!-- Car Main Body Base -->
        <rect x="4" y="5" width="16" height="26" rx="5" fill="#1f2937" stroke="#ffffff" stroke-width="1.5"/>
        
        <!-- Front Windshield -->
        <path d="M6 10H18V15H6V10Z" fill="#38bdf8"/>
        
        <!-- Roof / Cabin Center -->
        <rect x="6" y="16" width="12" height="7" fill="#4b5563"/>
        
        <!-- Rear Window -->
        <path d="M6 24H18V28H6V24Z" fill="#93c5fd"/>
        
        <!-- Side Wing Mirrors -->
        <rect x="1" y="11" width="3" height="5" rx="1.5" fill="#1f2937"/>
        <rect x="20" y="11" width="3" height="5" rx="1.5" fill="#1f2937"/>
        
        <!-- Headlights Indicator -->
        <circle cx="7" cy="6" r="1" fill="#fde047"/>
        <circle cx="17" cy="6" r="1" fill="#fde047"/>
      </svg>
    </div>`,
    iconSize: [38, 56],
    iconAnchor: [19, 28],
  });
  
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function AutoRecenter({ segments, autoFitBounds, activePoint }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    if (activePoint) {
      map.setView(activePoint, map.getZoom(), { animate: true });
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
  }, [segments, autoFitBounds, activePoint, map]);

  return null;
}

export default function MapView({
  locations = [],
  markers = [],
  activePoint = null,
  height = "500px",
  zoom = 15,
  minZoom = 3,
  maxZoom = 19,
  autoFitBounds = true,
  customIcon = null,
  maxJumpMeters = 300,
}) {
  const parsePoint = (pt) => {
    if (!pt) return null;

    let v1 = null;
    let v2 = null;

    if (Array.isArray(pt) && pt.length >= 2) {
      v1 = Number(pt[0]);
      v2 = Number(pt[1]);
    } else if (typeof pt === "object") {
      if (pt.lat !== undefined && pt.lng !== undefined) {
        v1 = Number(pt.lat);
        v2 = Number(pt.lng);
      } else if (pt.latitude !== undefined && pt.longitude !== undefined) {
        v1 = Number(pt.latitude);
        v2 = Number(pt.longitude);
      }
    }

    if (v1 === null || v2 === null || isNaN(v1) || isNaN(v2)) return null;

    let lat = v1;
    let lng = v2;

    if (Math.abs(v1) > 35 && Math.abs(v2) <= 35) {
      lat = v2;
      lng = v1;
    }

    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }

    return null;
  };

  const processSegments = (data) => {
    if (!data) return [];

    let parsed = data;
    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        return [];
      }
    }

    let rawList = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (parsed.features && Array.isArray(parsed.features)) {
        rawList = parsed.features.flatMap((f) => f.geometry?.coordinates || []);
      } else if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
        rawList = parsed.coordinates;
      }
    }

    const flatPoints = rawList.flat(Infinity);
    const validPoints = [];

    if (typeof flatPoints[0] === "number" && typeof flatPoints[1] === "number") {
      for (let i = 0; i < flatPoints.length - 1; i += 2) {
        const pt = parsePoint([flatPoints[i], flatPoints[i + 1]]);
        if (pt) validPoints.push(pt);
      }
    } else {
      flatPoints.forEach((item) => {
        const pt = parsePoint(item);
        if (pt) validPoints.push(pt);
      });
    }

    if (validPoints.length < 2) return validPoints.length === 1 ? [[validPoints[0]]] : [];

    const splitSegments = [];
    let currentSegment = [validPoints[0]];

    for (let i = 1; i < validPoints.length; i++) {
      const prev = validPoints[i - 1];
      const curr = validPoints[i];

      const dist = getDistanceMeters(prev[0], prev[1], curr[0], curr[1]);

      if (dist > maxJumpMeters) {
        if (currentSegment.length > 1) {
          splitSegments.push(currentSegment);
        }
        currentSegment = [curr];
      } else {
        currentSegment.push(curr);
      }
    }

    if (currentSegment.length > 1) {
      splitSegments.push(currentSegment);
    }

    return splitSegments;
  };

  const segments = processSegments(locations);
  const allPoints = segments.flat(1);

  const firstPoint = allPoints[0] || null;
  const lastPoint = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null;

  const extractedActive = parsePoint(activePoint);
  const mapCenter = extractedActive || firstPoint || [18.5204, 73.8567];

  const processedMarkers = Array.isArray(markers) ? markers : [];

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
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
        />

        <AutoRecenter
          segments={segments}
          autoFitBounds={autoFitBounds}
          activePoint={extractedActive}
        />

        {segments.map((segmentCoords, index) => (
          <Polyline
            key={`route-seg-${index}-${segmentCoords.length}`}
            positions={segmentCoords}
            color="#2563eb"
            weight={6}
            opacity={0.85}
          />
        ))}

        {processedMarkers.map((item, idx) => {
          const pos = parsePoint(item);
          if (!pos) return null;

          const speedVal = item?.speed !== undefined ? item.speed : "0.0";
          
          let dateVal = "N/A";
          let timeVal = "N/A";
          
          if (item?.gps_timestamp) {
            const d = new Date(item.gps_timestamp);
            dateVal = d.toLocaleDateString('en-GB', { timeZone: 'UTC' });
            timeVal = d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          }

          return (
            <Marker key={`gps-dot-${idx}`} position={pos} icon={createGpsDotIcon()}>
              <Popup>
                <div className="text-xs space-y-1">
                  <span><strong>Lat:</strong> {pos[0].toFixed(5)}</span><br />
                  <span><strong>Lng:</strong> {pos[1].toFixed(5)}</span><br />
                  <span><strong>Speed:</strong> {speedVal} km/h</span><br />  
                  <span><strong>Date:</strong> {dateVal}</span><br />
                  <span><strong>Time:</strong> {timeVal}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {firstPoint && (
          <Marker position={firstPoint} icon={createStartIcon()}>
            <Popup>
              <div className="text-xs font-semibold text-emerald-700">
                Start Point
              </div>
            </Popup>
          </Marker>
        )}

        {lastPoint && (
          <Marker position={lastPoint} icon={createEndIcon()}>
            <Popup>
              <div className="text-xs font-semibold text-red-600">
                End Point
              </div>
            </Popup>
          </Marker>
        )}

        {/* 🚘 Vehicle Movement Marker with Custom Vehicle Icon */}
        {extractedActive && (
          <Marker
            position={extractedActive}
            icon={customIcon || createVehicleIcon()}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-bold text-gray-800">
                  Vehicle ID: {activePoint?.vehicle || activePoint?.vehicle_id || "753"}
                </p>
                <p className="text-blue-600 font-semibold">
                  Speed: {activePoint?.speed ?? 0} km/h
                </p>
                <p className="text-gray-600 text-xs">
                  Date: {activePoint?.gps_timestamp ? new Date(activePoint.gps_timestamp).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : "N/A"}
                </p>
                <p className="text-gray-600 text-xs">
                  Time: {activePoint?.gps_timestamp ? new Date(activePoint.gps_timestamp).toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: true }) : "N/A"}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}