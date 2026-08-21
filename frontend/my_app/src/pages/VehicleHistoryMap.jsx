import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper component to auto-fit map viewport to filtered route coordinates
const FitRouteBounds = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  return null;
};

export default function VehicleRouteFilterMap({ vehicleId = 1 }) {
  // Set default filter: past 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Format Date objects to 'YYYY-MM-THH:mm' for <input type="datetime-local" />
  const formatForInput = (date) => date.toISOString().slice(0, 16);

  const [startDate, setStartDate] = useState(formatForInput(yesterday));
  const [endDate, setEndDate] = useState(formatForInput(now));
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch filtered route data from Django DRF API
  const fetchFilteredRoute = async () => {
    if (!vehicleId) return;

    setLoading(true);
    setError(null);

    try {
      // Convert local input strings to full ISO 8601 strings for DRF
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();

      const response = await axios.get("http://127.0.0.1:8000/api/gps/", {
        params: {
          vehicle: vehicleId,
          start_date: startIso,
          end_date: endIso,
        },
      });

      const data = response.data.results || response.data;

      // Ensure points are sorted chronologically
      const sortedData = [...data].sort(
        (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
      );

      // Map to Leaflet LatLng tuples: [[lat, lng], [lat, lng], ...]
      const points = sortedData.map((item) => [item.latitude, item.longitude]);

      setHistoryLogs(sortedData);
      setRouteCoordinates(points);
    } catch (err) {
      console.error("Error fetching filtered route:", err);
      setError("Failed to fetch route data for the selected date range.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchFilteredRoute();
  }, [vehicleId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchFilteredRoute();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", height: "650px" }}>
      {/* Date Picker Form Bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        <div>
          <label style={{ fontWeight: "bold", fontSize: "13px", display: "block", marginBottom: "4px" }}>
            Start Date & Time:
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
            required
          />
        </div>

        <div>
          <label style={{ fontWeight: "bold", fontSize: "13px", display: "block", marginBottom: "4px" }}>
            End Date & Time:
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "18px",
            padding: "8px 18px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Filtering..." : "Apply Filter"}
        </button>

        <span style={{ marginTop: "18px", fontSize: "13px", color: "#666" }}>
          Points found: <strong>{routeCoordinates.length}</strong>
        </span>
      </form>

      {error && <div style={{ color: "red", fontSize: "14px" }}>{error}</div>}

      {/* Leaflet Map Rendering */}
      <div style={{ flex: 1, width: "100%", borderRadius: "8px", overflow: "hidden" }}>
        <MapContainer center={[18.5204, 73.8567]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routeCoordinates.length > 0 && (
            <>
              {/* Recenter Map dynamically to route bounds */}
              <FitRouteBounds coordinates={routeCoordinates} />

              {/* Filtered Route Path */}
              <Polyline
                positions={routeCoordinates}
                pathOptions={{
                  color: "#0066ff",
                  weight: 5,
                  opacity: 0.85,
                  lineJoin: "round",
                }}
              />

              {/* Start Marker */}
              <Marker position={routeCoordinates[0]}>
                <Popup>
                  <strong>🟢 Trip Start Point</strong>
                  <br />
                  {new Date(historyLogs[0]?.recorded_at).toLocaleString()}
                </Popup>
              </Marker>

              {/* End Marker */}
              <Marker position={routeCoordinates[routeCoordinates.length - 1]}>
                <Popup>
                  <strong>🔴 Trip End Point</strong>
                  <br />
                  {new Date(historyLogs[historyLogs.length - 1]?.recorded_at).toLocaleString()}
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}