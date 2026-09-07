import React, { useState, useEffect, useRef } from "react";
import { getGPSLocations, getVehicles } from "../api/fleetApi";
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

// Helper component to auto-recenter map during playback
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.panTo(position);
    }
  }, [position, map]);
  return null;
}

export default function HistoryPlayback() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("2026-09-05T00:00");
  const [endDate, setEndDate] = useState("2026-09-05T23:59");

  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per step

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const timerRef = useRef(null);

  // Load registered vehicles on mount
  useEffect(() => {
    async function loadVehicles() {
      try {
        const data = await getVehicles();
        if (Array.isArray(data) && data.length > 0) {
          setVehicles(data);
          setSelectedVehicle(data[0].id.toString());
        }
      } catch (err) {
        console.warn("Unable to fetch vehicles list:", err);
      }
    }
    loadVehicles();
  }, []);

  // Fetch location history records
  const handleFetchHistory = async () => {
    if (!selectedVehicle) {
      setError("Please select a vehicle first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setIsPlaying(false);
      setCurrentIndex(0);

      const data = await getGPSLocations(selectedVehicle, startDate, endDate);

      if (Array.isArray(data) && data.length > 0) {
        // Reverse array if API returns newest-first so history plays chronologically
        const sortedHistory = [...data].reverse();
        setHistory(sortedHistory);
      } else {
        setHistory([]);
        setError("No route history found for the selected time range.");
      }
    } catch (err) {
      console.error("Error loading route history:", err);
      setError("Failed to fetch historical location data from backend.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Playback Loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          if (prevIndex >= history.length - 1) {
            setIsPlaying(false);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, history, playbackSpeed]);

  const currentPoint = history[currentIndex] || {};
  const currentCoords = [
    Number(currentPoint.latitude) || 18.5204,
    Number(currentPoint.longitude) || 73.8567,
  ];

  const fullPolyline = history.map((pt) => [
    Number(pt.latitude),
    Number(pt.longitude),
  ]);

  const traveledPolyline = history
    .slice(0, currentIndex + 1)
    .map((pt) => [Number(pt.latitude), Number(pt.longitude)]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Vehicle Route History Playback
      </h1>

      {/* Control Panel */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Vehicle
          </label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {vehicles.length > 0 ? (
              vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number || `Vehicle ${v.id}`}
                </option>
              ))
            ) : (
              <option value="">No vehicles found</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleFetchHistory}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 disabled:bg-blue-300"
        >
          {loading ? "Loading..." : "Load History"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {history.length > 0 && (
        <>
          {/* Summary Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold uppercase">
                Playback Status
              </span>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {isPlaying ? "Playing..." : "Paused"}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold uppercase">
                Current Speed
              </span>
              <p className="text-lg font-bold text-blue-600 mt-1">
                {currentPoint.speed || 0} km/h
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold uppercase">
                Ignition
              </span>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {currentPoint.ignition ? (
                  <span className="text-green-600">ON</span>
                ) : (
                  <span className="text-red-500">OFF</span>
                )}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold uppercase">
                Timestamp
              </span>
              <p className="text-sm font-semibold text-gray-700 mt-1 truncate">
                {currentPoint.gps_timestamp
                  ? new Date(currentPoint.gps_timestamp).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Map Section */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6">
            <div className="h-[500px] w-full rounded-lg overflow-hidden">
              <MapContainer
                center={currentCoords}
                zoom={14}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Recenter viewport smoothly as vehicle moves */}
                <RecenterMap position={currentCoords} />

                {/* Full Planned Path (Light Gray) */}
                <Polyline positions={fullPolyline} color="#cbd5e1" weight={4} />

                {/* Covered Route Path (Blue) */}
                <Polyline positions={traveledPolyline} color="#2563eb" weight={5} />

                {/* Live Position Marker */}
                <Marker position={currentCoords}>
                  <Popup>
                    <div>
                      <p className="font-bold">Point {currentIndex + 1} of {history.length}</p>
                      <p>Speed: {currentPoint.speed} km/h</p>
                      <p>
                        Time:{" "}
                        {new Date(currentPoint.gps_timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Playback Controls Toolbar */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition"
                >
                  {isPlaying ? "Pause" : "Play Route"}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(0);
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition"
                >
                  Reset
                </button>
              </div>

              {/* Progress Seek Bar */}
              <div className="flex-1 max-w-md flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500">
                  {currentIndex + 1} / {history.length}
                </span>
                <input
                  type="range"
                  min="0"
                  max={history.length - 1}
                  value={currentIndex}
                  onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">
                  Speed:
                </span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium focus:outline-none"
                >
                  <option value={2000}>0.5x</option>
                  <option value={1000}>1.0x</option>
                  <option value={500}>2.0x</option>
                  <option value={200}>5.0x</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}