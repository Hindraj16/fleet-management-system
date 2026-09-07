import React, { useEffect, useState } from "react";
import { getGPSLocations, getVehicles, postGPSLocation } from "../api/fleetApi";
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

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.panTo(position);
    }
  }, [position, map]);
  return null;
}

export default function LiveTracking() {
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [useDateFilter, setUseDateFilter] = useState(false);

  // Start Time Breakdown
  const [startDate, setStartDate] = useState("2026-09-05");
  const [startHour, setStartHour] = useState("12");
  const [startMinute, setStartMinute] = useState("00");
  const [startAmpm, setStartAmpm] = useState("AM");

  // End Time Breakdown
  const [endDate, setEndDate] = useState("2026-09-05");
  const [endHour, setEndHour] = useState("11");
  const [endMinute, setEndMinute] = useState("59");
  const [endAmpm, setEndAmpm] = useState("PM");

  // Helper to construct ISO strings for backend filtering
  const buildISOString = (dateStr, hourStr, minStr, ampm) => {
    let hour = parseInt(hourStr, 10);
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const formattedHour = hour.toString().padStart(2, "0");
    return `${dateStr}T${formattedHour}:${minStr}`;
  };

  useEffect(() => {
    async function loadVehicles() {
      try {
        const data = await getVehicles();
        if (Array.isArray(data) && data.length > 0) {
          setVehiclesList(data);
          setSelectedVehicle(data[0].id.toString());
        }
      } catch (err) {
        console.warn("Could not fetch vehicles list:", err);
      }
    }
    loadVehicles();
  }, []);

  const fetchVehicleLocations = async (targetVehicleId = selectedVehicle) => {
    if (!targetVehicleId) return;

    try {
      setLoading(true);
      setError("");

      const sDate = useDateFilter
        ? buildISOString(startDate, startHour, startMinute, startAmpm)
        : null;
      const eDate = useDateFilter
        ? buildISOString(endDate, endHour, endMinute, endAmpm)
        : null;

      const data = await getGPSLocations(targetVehicleId, sDate, eDate);

      if (Array.isArray(data) && data.length > 0) {
        setLocations(data);
      } else {
        setLocations([]);
        setError(`No location telemetry recorded for Vehicle ID "${targetVehicleId}".`);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to fetch GPS location data. Ensure backend is running.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehicle) {
      fetchVehicleLocations(selectedVehicle);
    }
  }, [selectedVehicle]);

  const handleSeedDummyPing = async () => {
    if (!selectedVehicle) return;
    try {
      setLoading(true);
      await postGPSLocation({
        vehicle: selectedVehicle,
        latitude: 18.5204,
        longitude: 73.8567,
        speed: 40.0,
        ignition: true,
        gps_timestamp: new Date().toISOString(),
      });
      await fetchVehicleLocations(selectedVehicle);
    } catch (err) {
      console.error("Error creating ping:", err);
      setError("Failed to send test ping.");
    } finally {
      setLoading(false);
    }
  };

  const latestPoint = locations[0] || {};
  const mapCenter = [
    Number(latestPoint.latitude) || 18.5204,
    Number(latestPoint.longitude) || 73.8567,
  ];

  const routePolyline = locations
    .filter((loc) => loc.latitude && loc.longitude)
    .map((loc) => [Number(loc.latitude), Number(loc.longitude)]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Live Vehicle Tracking
      </h1>

      {/* Control Bar */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6 border border-gray-100 flex flex-wrap gap-6 items-end">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Select Vehicle
          </label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {vehiclesList.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number} (ID: {v.id})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            id="enableDates"
            checked={useDateFilter}
            onChange={(e) => setUseDateFilter(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="enableDates" className="text-sm font-semibold text-gray-700">
            Filter Range
          </label>
        </div>

        {useDateFilter && (
          <>
            {/* 12-Hour Start Time Control */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Time
              </label>
              <div className="flex gap-1 items-center border border-gray-300 rounded-lg p-1 bg-white">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm p-1 focus:outline-none"
                />
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="text-sm p-1 border-l border-gray-200 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const h = (i + 1).toString().padStart(2, "0");
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span>:</span>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className="text-sm p-1 focus:outline-none"
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
                <select
                  value={startAmpm}
                  onChange={(e) => setStartAmpm(e.target.value)}
                  className="text-sm font-bold text-blue-600 p-1 border-l border-gray-200 focus:outline-none"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* 12-Hour End Time Control */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Time
              </label>
              <div className="flex gap-1 items-center border border-gray-300 rounded-lg p-1 bg-white">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm p-1 focus:outline-none"
                />
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="text-sm p-1 border-l border-gray-200 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const h = (i + 1).toString().padStart(2, "0");
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span>:</span>
                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className="text-sm p-1 focus:outline-none"
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="59">59</option>
                </select>
                <select
                  value={endAmpm}
                  onChange={(e) => setEndAmpm(e.target.value)}
                  className="text-sm font-bold text-blue-600 p-1 border-l border-gray-200 focus:outline-none"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => fetchVehicleLocations()}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition disabled:bg-blue-300"
        >
          {loading ? "Updating..." : "Refresh Map"}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 text-amber-700 p-4 rounded-lg mb-6 border border-amber-200 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={handleSeedDummyPing}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs transition"
          >
            Send Test GPS Ping
          </button>
        </div>
      )}

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Active Vehicle ID
          </span>
          <p className="text-lg font-bold text-gray-800 mt-1">
            {selectedVehicle || "N/A"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Live Speed
          </span>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {latestPoint.speed ? `${latestPoint.speed} km/h` : "0 km/h"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Ignition State
          </span>
          <p className="text-lg font-bold mt-1">
            {latestPoint.ignition ? (
              <span className="text-green-600">Active (ON)</span>
            ) : (
              <span className="text-red-500">Idle / OFF</span>
            )}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Last Ping Received
          </span>
          <p className="text-sm font-semibold text-gray-700 mt-1 truncate">
            {latestPoint.gps_timestamp
              ? new Date(latestPoint.gps_timestamp).toLocaleString()
              : "No pings received yet"}
          </p>
        </div>
      </div>

      {/* Map View */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
        <div className="h-[520px] w-full rounded-lg overflow-hidden">
          <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap position={mapCenter} />

            {routePolyline.length > 0 && (
              <Polyline positions={routePolyline} color="#2563eb" weight={5} />
            )}

            {latestPoint.latitude && latestPoint.longitude && (
              <Marker position={mapCenter}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold">Vehicle ID: {latestPoint.vehicle}</p>
                    <p>Speed: {latestPoint.speed} km/h</p>
                    <p>Ignition: {latestPoint.ignition ? "ON" : "OFF"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(latestPoint.gps_timestamp).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}