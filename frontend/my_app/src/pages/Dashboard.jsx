import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";

/* =====================================================
   VEHICLE DATA
===================================================== */
const vehicles = [
  {
    id: 1,
    number: "MH12 AB 1234",
    driver: "Rahul Patil",
    status: "Moving",
    speed: 62,
    lat: 18.5204,
    lng: 73.8567,
    location: "Pune Station",
    battery: 87,
    fuel: 76,
  },
  {
    id: 2,
    number: "MH14 CD 5678",
    driver: "Amit Sharma",
    status: "Idle",
    speed: 0,
    lat: 18.5314,
    lng: 73.8446,
    location: "Shivajinagar",
    battery: 72,
    fuel: 54,
  },
  {
    id: 3,
    number: "MH12 EF 9012",
    driver: "Suresh Kumar",
    status: "Moving",
    speed: 48,
    lat: 18.5074,
    lng: 73.8077,
    location: "Kothrud",
    battery: 91,
    fuel: 82,
  },
  {
    id: 4,
    number: "MH13 GH 3456",
    driver: "Vikas More",
    status: "Offline",
    speed: 0,
    lat: 18.5679,
    lng: 73.9143,
    location: "Viman Nagar",
    battery: 34,
    fuel: 31,
  },
  {
    id: 5,
    number: "MH12 JK 7890",
    driver: "Rohit Jadhav",
    status: "Moving",
    speed: 55,
    lat: 18.5018,
    lng: 73.925,
    location: "Hadapsar",
    battery: 65,
    fuel: 68,
  },
];

/* =====================================================
   VEHICLE ICON
===================================================== */
function createVehicleIcon(status) {
  let color = "#2563eb";
  if (status === "Moving") color = "#16a34a";
  if (status === "Idle") color = "#f97316";
  if (status === "Offline") color = "#ef4444";

  return L.divIcon({
    className: "vehicle-marker",
    html: `
      <div
        style="
          width:42px;
          height:42px;
          background:${color};
          border:4px solid white;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:19px;
          box-shadow:0 4px 12px rgba(0,0,0,0.35);
        "
      >
        🚗
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}

function getStatusColor(status) {
  if (status === "Moving") return "#16a34a";
  if (status === "Idle") return "#f97316";
  return "#ef4444";
}

/* =====================================================
   DASHBOARD COMPONENT
===================================================== */
export default function Dashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const totalVehicles = vehicles.length;
  const movingVehicles = vehicles.filter((v) => v.status === "Moving").length;
  const idleVehicles = vehicles.filter((v) => v.status === "Idle").length;
  const offlineVehicles = vehicles.filter((v) => v.status === "Offline").length;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const value = search.toLowerCase();
      const matchesSearch =
        vehicle.number.toLowerCase().includes(value) ||
        vehicle.driver.toLowerCase().includes(value) ||
        vehicle.location.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "All" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-slate-900 text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl">
            🚗
          </div>
          <div className="text-xl font-bold">
            5w4pnn!l <span className="text-blue-400">Fleet</span>
          </div>
        </div>

        <nav className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500">
            MAIN MENU
          </p>
          <Link
            to="/dashboard"
            className="mb-1 flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white"
          >
            Dashboard
          </Link>
          <Link
            to="/vehicles"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Vehicles
          </Link>
          <Link
            to="/tracking"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Live Tracking
          </Link>
          <Link
            to="/vehiclehistorymap/1"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Vehicle History Map
          </Link>
          <Link
            to="/vehicle"
            className="mb-6 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            VehicleDetails
          </Link>

          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500">
            MANAGEMENT
          </p>
          <Link
            to="/alerts"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Alerts
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs">
              3
            </span>
          </Link>
          <Link
            to="/geofencing"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📐 Geofencing
          </Link>
          <Link
            to="/reports"
            className="mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            📈 Reports
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            ⚙️ Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="lg:ml-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm lg:px-8">
          <div>
            <h1 className="text-xl font-bold lg:text-2xl">Fleet Dashboard</h1>
            <p className="text-xs text-slate-500 lg:text-sm">
              Monitor your fleet in real-time
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-600 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              System Online
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              AD
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          {/* STAT CARDS */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Vehicles</p>
                  <p className="mt-1 text-3xl font-bold">{totalVehicles}</p>
                  <p className="mt-2 text-xs text-slate-400">Registered vehicles</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-2xl">🚘</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Moving</p>
                  <p className="mt-1 text-3xl font-bold text-green-600">{movingVehicles}</p>
                  <p className="mt-2 text-xs text-green-600">● Currently moving</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-2xl">🟢</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Idle</p>
                  <p className="mt-1 text-3xl font-bold text-orange-500">{idleVehicles}</p>
                  <p className="mt-2 text-xs text-orange-500">● Waiting</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-3 text-2xl">🟡</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Offline</p>
                  <p className="mt-1 text-3xl font-bold text-red-500">{offlineVehicles}</p>
                  <p className="mt-2 text-xs text-red-500">● Need attention</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-2xl">🔴</div>
              </div>
            </div>
          </div>

          {/* MAP SECTION */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-semibold">Fleet Location</h2>
                  <p className="mt-1 text-xs text-slate-500">Live vehicle locations</p>
                </div>
                <Link
                  to="/tracking"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  View Full Tracking
                </Link>
              </div>

              <div className="h-[500px] w-full">
                <MapContainer
                  center={[18.5204, 73.8567]}
                  zoom={12}
                  scrollWheelZoom={true}
                  zoomControl={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ZoomControl position="topright" />

                  {filteredVehicles.map((vehicle) => (
                    <Marker
                      key={vehicle.id}
                      position={[vehicle.lat, vehicle.lng]}
                      icon={createVehicleIcon(vehicle.status)}
                      eventHandlers={{
                        click: () => setSelectedVehicle(vehicle),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[220px]">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-bold text-slate-800">{vehicle.number}</h3>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: getStatusColor(vehicle.status) }}
                            >
                              ● {vehicle.status}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 text-xs text-slate-600">
                            <p>👨‍✈️ <strong>Driver:</strong> {vehicle.driver}</p>
                            <p>📍 <strong>Location:</strong> {vehicle.location}</p>
                            <p>🚗 <strong>Speed:</strong> {vehicle.speed} km/h</p>
                            <p>🔋 <strong>Battery:</strong> {vehicle.battery}%</p>
                            <p>⛽ <strong>Fuel:</strong> {vehicle.fuel}%</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}