import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Initial Mock Vehicle Data
const initialVehicles = [
  {
    id: 1,
    number: "MH12 AB 1234",
    driver: "Rahul Patil",
    speed: 62,
    status: "Moving",
    lat: 18.5204,
    lng: 73.8567,
    location: "Pune Station",
    battery: 87,
    fuel: 76,
    lastUpdate: "Just now",
  },
  {
    id: 2,
    number: "MH14 CD 5678",
    driver: "Amit Sharma",
    speed: 0,
    status: "Idle",
    lat: 18.5314,
    lng: 73.8446,
    location: "Shivajinagar",
    battery: 72,
    fuel: 54,
    lastUpdate: "1 min ago",
  },
  {
    id: 3,
    number: "MH12 EF 9012",
    driver: "Suresh Kumar",
    speed: 48,
    status: "Moving",
    lat: 18.5074,
    lng: 73.8077,
    location: "Kothrud",
    battery: 91,
    fuel: 82,
    lastUpdate: "Just now",
  },
  {
    id: 4,
    number: "MH13 GH 3456",
    driver: "Vikas More",
    speed: 0,
    status: "Offline",
    lat: 18.5679,
    lng: 73.9143,
    location: "Viman Nagar",
    battery: 34,
    fuel: 31,
    lastUpdate: "18 min ago",
  },
  {
    id: 5,
    number: "MH12 JK 7890",
    driver: "Rohit Jadhav",
    speed: 55,
    status: "Moving",
    lat: 18.5018,
    lng: 73.925,
    location: "Hadapsar",
    battery: 65,
    fuel: 68,
    lastUpdate: "Just now",
  },
];

// Helper: Custom Marker Icon Generator
function createVehicleIcon(status) {
  let color = "#2563eb"; // Moving (Blue)
  if (status === "Idle") color = "#f97316"; // Idle (Orange)
  if (status === "Offline") color = "#ef4444"; // Offline (Red)

  return L.divIcon({
    className: "vehicle-marker-icon",
    html: `
      <div style="
        width: 44px;
        height: 44px;
        background-color: ${color};
        border: 3px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        🚗
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

// Helper: Map Camera Centering Controller
function MapController({ vehicle }) {
  const map = useMap();

  useEffect(() => {
    if (!vehicle) return;
    map.flyTo([vehicle.lat, vehicle.lng], 15, { duration: 1.2 });
  }, [vehicle, map]);

  return null;
}

// Helper: Auto-fit map viewport to filtered route coordinates
function FitRouteBounds({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  return null;
}

// Helper: Status Color Map
function getStatusColor(status) {
  if (status === "Moving") return "#16a34a";
  if (status === "Idle") return "#f97316";
  return "#ef4444";
}

export default function CombinedFleetTracking() {
  // Live Tracking States
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLive, setIsLive] = useState(true);

  // Date Formatting Helper
  const formatForInput = (date) => date.toISOString().slice(0, 16);

  // History Filter States
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [historyVehicleId, setHistoryVehicleId] = useState(1);
  const [startDate, setStartDate] = useState(formatForInput(yesterday));
  const [endDate, setEndDate] = useState(formatForInput(now));
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Live Simulation Interval
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setVehicles((currentVehicles) =>
        currentVehicles.map((vehicle) => {
          if (vehicle.status !== "Moving") return vehicle;

          const newLat = vehicle.lat + (Math.random() - 0.5) * 0.001;
          const newLng = vehicle.lng + (Math.random() - 0.5) * 0.001;
          const newSpeed = Math.max(
            20,
            vehicle.speed + Math.floor(Math.random() * 7 - 3)
          );

          return {
            ...vehicle,
            lat: newLat,
            lng: newLng,
            speed: newSpeed,
            lastUpdate: "Just now",
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Sync selected vehicle with state updates
  useEffect(() => {
    if (!selectedVehicle) return;

    const updatedVehicle = vehicles.find((v) => v.id === selectedVehicle.id);
    if (updatedVehicle) {
      setSelectedVehicle(updatedVehicle);
    }
  }, [vehicles]);

  // Sync selected history vehicle ID when clicking on a vehicle in panel
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setHistoryVehicleId(vehicle.id);
  };

  // Fetch Filtered Route History
  const fetchFilteredRoute = async () => {
    if (!historyVehicleId) return;

    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();

      const response = await axios.get("http://127.0.0.1:8000/api/gps/", {
        params: {
          vehicle: historyVehicleId,
          start_date: startIso,
          end_date: endIso,
        },
      });

      const data = response.data.results || response.data;

      // Sort chronologically
      const sortedData = [...data].sort(
        (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
      );

      const points = sortedData.map((item) => [item.latitude, item.longitude]);

      setHistoryLogs(sortedData);
      setRouteCoordinates(points);
    } catch (err) {
      console.error("Error fetching route history:", err);
      setHistoryError("Failed to fetch route history for selected range.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-fetch route history when vehicle ID changes
  useEffect(() => {
    fetchFilteredRoute();
  }, [historyVehicleId]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchFilteredRoute();
  };

  // Filter Vehicles List
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        vehicle.number.toLowerCase().includes(searchValue) ||
        vehicle.driver.toLowerCase().includes(searchValue) ||
        vehicle.location.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-slate-900 text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl">
            🚗
          </div>
          <div className="text-xl font-bold">
            Track <span className="text-blue-400">Fleet</span>
          </div>
        </div>

        <nav className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500">
            MAIN MENU
          </p>
          <Link
            to="/dashboard"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            📊 Dashboard
          </Link>
          <Link
            to="/vehicles"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            🚘 Vehicles
          </Link>
          <Link
            to="/tracking"
            className="mb-1 flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            📍 Live & History Tracking
          </Link>
          <Link
            to="/trips"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            🛣️ Trips
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm lg:px-8">
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">
              Live Fleet & Route History
            </h1>
            <p className="text-xs text-slate-500 lg:text-sm">
              Real-time GPS tracking with historical path filtering
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                isLive
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isLive ? "animate-pulse bg-green-500" : "bg-red-500"
                }`}
              />
              {isLive ? "GPS Live" : "GPS Paused"}
            </button>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          {/* ROUTE FILTER FORM CARD */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-800">
              📅 Route History Filter
            </h2>
            <form
              onSubmit={handleFilterSubmit}
              className="flex flex-wrap items-end gap-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Select Vehicle:
                </label>
                <select
                  value={historyVehicleId}
                  onChange={(e) => setHistoryVehicleId(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.number} - {v.driver}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Start Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  End Date & Time:
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loadingHistory}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingHistory ? "Filtering..." : "Apply Filter"}
              </button>

              <div className="text-xs text-slate-500">
                Points Found:{" "}
                <strong className="text-slate-800">
                  {routeCoordinates.length}
                </strong>
              </div>
            </form>

            {historyError && (
              <p className="mt-2 text-xs text-red-500">{historyError}</p>
            )}
          </div>

          {/* MAP & SIDEBAR GRID */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* MAP CARD */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-semibold">Live Map & Path Overlay</h2>
                  <p className="text-xs text-slate-500">
                    OpenStreetMap • {vehicles.length} Active Vehicles
                  </p>
                </div>
              </div>

              <div className="h-[550px] w-full">
                <MapContainer
                  center={[18.5204, 73.8567]}
                  zoom={12}
                  scrollWheelZoom={true}
                  zoomControl={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ZoomControl position="topright" />
                  <MapController vehicle={selectedVehicle} />

                  {/* Auto Fit Route Bounds */}
                  {routeCoordinates.length > 0 && (
                    <FitRouteBounds coordinates={routeCoordinates} />
                  )}

                  {/* Filtered Route Polyline */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{
                        color: "#0066ff",
                        weight: 5,
                        opacity: 0.85,
                        lineJoin: "round",
                      }}
                    />
                  )}

                  {/* Start Route Marker */}
                  {routeCoordinates.length > 0 && (
                    <Marker position={routeCoordinates[0]}>
                      <Popup>
                        <strong>🟢 Trip Start Point</strong>
                        <br />
                        {new Date(
                          historyLogs[0]?.recorded_at
                        ).toLocaleString()}
                      </Popup>
                    </Marker>
                  )}

                  {/* End Route Marker */}
                  {routeCoordinates.length > 0 && (
                    <Marker
                      position={routeCoordinates[routeCoordinates.length - 1]}
                    >
                      <Popup>
                        <strong>🔴 Trip End Point</strong>
                        <br />
                        {new Date(
                          historyLogs[historyLogs.length - 1]?.recorded_at
                        ).toLocaleString()}
                      </Popup>
                    </Marker>
                  )}

                  {/* Live Vehicle Markers */}
                  {filteredVehicles.map((vehicle) => (
                    <Marker
                      key={vehicle.id}
                      position={[vehicle.lat, vehicle.lng]}
                      icon={createVehicleIcon(vehicle.status)}
                      eventHandlers={{
                        click: () => handleSelectVehicle(vehicle),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[230px]">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800">
                              {vehicle.number}
                            </h3>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: getStatusColor(vehicle.status) }}
                            >
                              ● {vehicle.status}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <p>
                              👨‍✈️ <strong>Driver:</strong> {vehicle.driver}
                            </p>
                            <p>
                              📍 <strong>Location:</strong> {vehicle.location}
                            </p>
                            <p>
                              🚗 <strong>Speed:</strong> {vehicle.speed} km/h
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* VEHICLES SIDE PANEL */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="font-semibold">Vehicles</h2>
                <div className="relative mt-4">
                  <span className="absolute left-3 top-2.5">🔍</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search vehicle, driver..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {["All", "Moving", "Idle", "Offline"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-medium ${
                        statusFilter === status
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelectVehicle(vehicle)}
                    className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${
                      selectedVehicle?.id === vehicle.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{
                          backgroundColor: `${getStatusColor(
                            vehicle.status
                          )}20`,
                        }}
                      >
                        🚗
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {vehicle.number}
                          </p>
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: getStatusColor(vehicle.status) }}
                          >
                            ● {vehicle.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          👨‍✈️ {vehicle.driver}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}