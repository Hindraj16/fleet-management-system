import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import truckImage from "../assets/truck.png";

const createEndIcon = () =>
  L.divIcon({
    className: "custom-end-marker",
    html: `<div style="
      background-color: #EF4444;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [9, 9],
  });

// Red Point (Saved Route Point)
const createRedDotIcon = (isSelected = false) =>
  L.divIcon({
    className: "custom-red-dot",
    html: `<div style="
      background-color: #EF4444;
      width: 10px;
      height: 10px;
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
      color: #0b0a0a;
      font-size: 10px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-weight: 700;
      padding: 4px 3px;
      border-radius: 4px;
      white-space: nowrap;
      writing-mode: vertical-rl;    
      transform: rotate(180deg);
      display: inline-block;
      text-align: center;
      line-height: 1;
      margin-bottom: 12px;
    ">${labelText}</div>`,
    iconSize: [22, 60],
    iconAnchor: [11, 75],
  });

// GPS Dot Icon for Tracking History (Blue Dots)
const createGpsDotIcon = () =>
  L.divIcon({
    className: "custom-gps-dot",
    html: `<div style="
      background-color: #3b4ef6;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

// Standard Compass Bearing Calculation
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Distance helper
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

// Truck Icon with rotation mapping
const createTruckIcon = (heading = 0) =>
  L.divIcon({
    className: "truck-map-marker",
    html: `<div style="
      width: 48px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    ">
      <img
        src="${truckImage}"
        alt="Vehicle"
        style="
          width: 48px;
          height: 80px;
          object-fit: contain;
          background: transparent;
          transform: rotate(${heading}deg);
          transform-origin: center center;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35));
        "
      />
    </div>`,
    iconSize: [48, 80],
    iconAnchor: [24, 40],
    popupAnchor: [0, -40],
  });

function MapClickHandler({ onMapClick, isDraggingRef }) {
  useMapEvents({
    click(e) {
      if (isDraggingRef && isDraggingRef.current) return; 
      if (onMapClick) { 
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Map auto-center route
function RecenterMap({ locations = [], fitKey = 0 }) {
  const map = useMap();
  const prevFitKeyRef = useRef(fitKey);

  useEffect(() => {
    if (!locations || locations.length === 0) return;
    if (fitKey !== prevFitKeyRef.current || fitKey > 0) {
      const validPoints = locations
        .filter((loc) => loc && !isNaN(loc.lat ?? loc[0]) && !isNaN(loc.lng ?? loc[1]))
        .map((loc) => [loc.lat ?? loc[0], loc.lng ?? loc[1]]);

      if (validPoints.length > 0) {
        map.fitBounds(validPoints, { padding: [40, 40], maxZoom: 17 });
      }
      prevFitKeyRef.current = fitKey;
    }
  }, [fitKey, locations, map]);

  return null;
}

function AutoRecenter({ segments, autoFitBounds, activePoint, highlightedCoords }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (highlightedCoords) {
      map.setView(highlightedCoords, 17, { animate: true });
      return;
    }
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
  }, [segments, autoFitBounds, activePoint, highlightedCoords, map]);

  return null;
}

export default function MapView({
  locations = [],
  markers = [],
  activePoint = null,
  highlightedIndex = null,
  height = "500px",
  zoom = 15,
  minZoom = 3,
  maxZoom = 19,
  fitKey = 0,
  autoFitBounds = true,
  onPointDrag = null,
  onMapClick = null,
  editable = false,
  customIcon = null,
  maxJumpMeters = 300,
  isDraggingRef = null,
}) {

  const parsePoint = (pt) => {
    if (!pt) return null;
    let v1 = null;
    let v2 = null;
    let nameVal = "";

    if (Array.isArray(pt) && pt.length >= 2) {
      v1 = Number(pt[0]);
      v2 = Number(pt[1]);
      if (pt.length > 2) nameVal = pt[2] || ""; 
    } else if (typeof pt === "object" && pt !== null) {
      nameVal = pt.name || pt.type || "";
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
      return { lat, lng, name: nameVal };
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
        if (pt) validPoints.push([pt.lat, pt.lng]);
      }
    } else {
      flatPoints.forEach((item) => {
        const pt = parsePoint(item);
        if (pt) validPoints.push([pt.lat, pt.lng]);
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

  let highlightedCoords = null;
  if (highlightedIndex !== null && locations[highlightedIndex]) {
    const p = parsePoint(locations[highlightedIndex]);
    if (p) highlightedCoords = [p.lat, p.lng];
  }

  const activeObj = parsePoint(activePoint);
  const extractedActive = activeObj ? [activeObj.lat, activeObj.lng] : null;
  const mapCenter = highlightedCoords || extractedActive || firstPoint || [18.5204, 73.8567];
  const processedMarkers = Array.isArray(markers) ? markers : [];

  // Robust heading calculation with chronological sorting
  let truckHeading = 0;
  if (activePoint) {
    const directHeading = Number(
      activePoint?.heading ??
      activePoint?.course ??
      activePoint?.angle ??
      activePoint?.dir ??
      activePoint?.bearing
    );

    if (!isNaN(directHeading)) {
      truckHeading = directHeading;
    } else if (activeObj) {
      const allTrackPoints = [
        ...processedMarkers.map((item, idx) => {
          const pt = parsePoint(item);
          if (!pt) return null;
          const ts = item?.gps_timestamp ? new Date(item.gps_timestamp).getTime() : idx;
          return { ...pt, timestamp: ts };
        }),
        { ...activeObj, timestamp: activePoint?.gps_timestamp ? new Date(activePoint.gps_timestamp).getTime() : Date.now() }
      ].filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);

      const currentIndex = allTrackPoints.findIndex(
        (p) => Math.abs(p.lat - activeObj.lat) < 0.000001 && Math.abs(p.lng - activeObj.lng) < 0.000001
      );

      let prevPoint = null;
      let currPoint = activeObj;

      if (currentIndex > 0) {
        currPoint = allTrackPoints[currentIndex];
        for (let i = currentIndex - 1; i >= 0; i--) {
          const dist = getDistanceMeters(allTrackPoints[i].lat, allTrackPoints[i].lng, currPoint.lat, currPoint.lng);
          if (dist > 1) {
            prevPoint = allTrackPoints[i];
            break;
          }
        }
      }

      if (!prevPoint && allTrackPoints.length >= 2) {
        currPoint = allTrackPoints[allTrackPoints.length - 1];
        prevPoint = allTrackPoints[allTrackPoints.length - 2];
      }

      if (prevPoint && currPoint) {
        truckHeading = calculateBearing(prevPoint.lat, prevPoint.lng, currPoint.lat, currPoint.lng);
      }
    }
  }

  const activeTruckIcon = customIcon || createTruckIcon(truckHeading);

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

        <MapClickHandler onMapClick={onMapClick} isDraggingRef={isDraggingRef} />
        <RecenterMap locations={locations} fitKey={fitKey} />

        <AutoRecenter
          segments={segments}
          autoFitBounds={autoFitBounds && highlightedIndex === null}
          activePoint={extractedActive}
          highlightedCoords={highlightedCoords}
        />

        {/* Route Polyline Line */}
        {segments.map((segmentCoords, index) => (
          <Polyline
            key={`route-seg-${index}-${segmentCoords.length}`}
            positions={segmentCoords}
            color="#2563eb"
            weight={3}
            opacity={0.85}
          />
        ))}

        {/* Render GPS Tracking Dots from markers prop */}
        {processedMarkers.map((item, idx) => {
          const pt = parsePoint(item);
          if (!pt) return null;
          const pos = [pt.lat, pt.lng];

          const speedVal = item?.speed !== undefined ? item.speed : "0.0";
          let dateVal = "N/A";
          let timeVal = "N/A";

          if (item?.gps_timestamp) {
            const d = new Date(item.gps_timestamp);
            dateVal = d.toLocaleDateString("en-GB", { timeZone: "UTC" });
            timeVal = d.toLocaleTimeString("en-US", {
              timeZone: "UTC",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });
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

        {/* Route Editable Red/Green Dots for EditKMLFile */}
        {editable &&
          locations.map((item, idx) => {
            const pt = parsePoint(item);
            if (!pt) return null;
            const pos = [pt.lat, pt.lng];

            const isNew = item.isNew === true;
            const isSelected = highlightedIndex === idx;

            return (
              <Marker
                key={`route-dot-${idx}-${pos[0]}-${pos[1]}`}
                position={pos}
                draggable={true}
                icon={isNew ? createGreenDotIcon() : createRedDotIcon(isSelected)}
                eventHandlers={{
                  click: (e) => L.DomEvent.stopPropagation(e),
                  mousedown: (e) => L.DomEvent.stopPropagation(e),
                  dragstart: (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (isDraggingRef) isDraggingRef.current = true;
                  },
                  dragend: (e) => {
                    L.DomEvent.stopPropagation(e);
                    const newLatLng = e.target.getLatLng();
                    if (onPointDrag) {
                      onPointDrag(idx, newLatLng.lat, newLatLng.lng);
                    }
                    setTimeout(() => {
                      if (isDraggingRef) isDraggingRef.current = false;
                    }, 200);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-gray-800">Point: {idx + 1}</p>
                    <p><strong>Type/Name:</strong> {pt.name && pt.name.trim() !== "" ? pt.name : "N/A"}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        
        {/* Labels for Custom Names */}
        {locations.map((item, idx) => {
          const pt = parsePoint(item);
          if (!pt) return null;
          const nameText = (item.name || pt.name || "").trim();

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
              position={[pt.lat, pt.lng]}
              icon={createLabelIcon(nameText)}
            />
          );
        })}

        {/* Active Vehicle Movement Marker */}
        {extractedActive && (
          <Marker
            position={extractedActive}
            icon={activeTruckIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-bold text-gray-800">
                  Vehicle ID: {activePoint?.vehicle ?? activePoint?.vehicle_id ?? "Selected vehicle"}
                </p>
                <p className="text-blue-600 font-semibold">
                  Speed: {activePoint?.speed ?? 0} km/h
                </p>
                <p>
                  <strong>Latitude:</strong> {extractedActive[0].toFixed(6)}
                </p>
                <p>
                  <strong>Longitude:</strong> {extractedActive[1].toFixed(6)}
                </p>
                {activePoint?.gps_timestamp && (
                  <p>
                    <strong>GPS time:</strong> {new Date(activePoint.gps_timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}