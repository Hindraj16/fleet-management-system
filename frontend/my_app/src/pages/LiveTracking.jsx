import { useEffect, useState, useCallback, useRef } from "react";
import { getGPSLocations, getVehicles, postGPSLocation } from "../api/fleetApi";
import MapView from "../components/MapView";

export default function LiveTracking() {
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // Keep search term empty initially so placeholder shows on page load/refresh
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [useDateFilter, setUseDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("2026-09-05");
  const [endDate, setEndDate] = useState("2026-09-05");

  // Load vehicles list from backend on page load
  useEffect(() => {
    let ignore = false;
    async function loadVehicles() {
      try {
        const data = await getVehicles();
        if (!ignore && Array.isArray(data) && data.length > 0) {
          setVehiclesList(data);
          // Set initial vehicle ID for telemetry, but DO NOT write to searchTerm
          const defaultVehicle = data[0];
          setSelectedVehicleId(defaultVehicle.id.toString());
        }
      } catch (err) {
        console.warn("Could not fetch vehicles list:", err);
      }
    }
    loadVehicles();
    return () => {
      ignore = true;
    };
  }, []);

  // Close autosuggest dropdown when user clicks outside input
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch telemetry locations from backend
  const fetchVehicleLocations = useCallback(
    async (targetVehicleId = selectedVehicleId) => {
      if (!targetVehicleId) return;

      try {
        setLoading(true);
        setError("");

        const sDate = useDateFilter ? startDate : null;
        const eDate = useDateFilter ? endDate : null;

        const data = await getGPSLocations(targetVehicleId, sDate, eDate);

        if (Array.isArray(data) && data.length > 0) {
          setLocations(data);
        } else {
          setLocations([]);
          setError(
            `No location telemetry recorded for Vehicle ID "${targetVehicleId}".`
          );
        }
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to fetch GPS location data. Ensure backend is running.");
        setLocations([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedVehicleId, useDateFilter, startDate, endDate]
  );

  useEffect(() => {
    if (selectedVehicleId) {
      fetchVehicleLocations(selectedVehicleId);
    }
  }, [selectedVehicleId, fetchVehicleLocations]);

  // Filter vehicles from database matching user input
  const filteredVehicles = vehiclesList.filter((v) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const vehicleNum = (v.vehicle_number || "").toString().toLowerCase();
    const vehicleId = (v.id || "").toString().toLowerCase();

    return vehicleNum.includes(query) || vehicleId.includes(query);
  });

  // Handle selection from dropdown list
  const handleSelectVehicle = (v) => {
    setSelectedVehicleId(v.id.toString());
    setSearchTerm(`${v.vehicle_number} (ID: ${v.id})`);
    setIsDropdownOpen(false);
  };

  const handleSeedDummyPing = async () => {
    if (!selectedVehicleId) return;
    try {
      setLoading(true);
      await postGPSLocation({
        vehicle: selectedVehicleId,
        latitude: 18.5204,
        longitude: 73.8567,
        speed: 40.0,
        ignition: true,
        gps_timestamp: new Date().toISOString(),
      });
      await fetchVehicleLocations(selectedVehicleId);
    } catch (err) {
      console.error("Error creating ping:", err);
      setError("Failed to send test ping.");
    } finally {
      setLoading(false);
    }
  };

  const latestPoint = locations[0] || {};

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-50 flex flex-col font-sans text-gray-800">
      <main className="flex-1 w-full px-8 py-6 flex flex-col space-y-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800">Live Vehicle Tracking</h1>

        {/* Control Bar */}
        <div className="w-full bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-wrap gap-6 items-end">
          {/* Autosuggest Search Input */}
          <div className="relative w-64" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Search Vehicle
            </label>
            <input
              type="text"
              placeholder="Search Vehicle No "
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            {/* Autosuggest Dropdown List */}
            {isDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map((v) => (
                    <li
                      key={v.id}
                      onClick={() => handleSelectVehicle(v)}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{v.vehicle_number}</span>{" "}
                      <span className="text-xs text-gray-400">(ID: {v.id})</span>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-sm text-gray-400">
                    No matching vehicles
                  </li>
                )}
              </ul>
            )}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            onClick={() => fetchVehicleLocations(selectedVehicleId)}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition disabled:bg-blue-300"
          >
            {loading ? "Updating..." : "Show Map"}
          </button>
        </div>

        {error && (
          <div className="w-full bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleSeedDummyPing}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs transition"
            >
              Send Test GPS Ping
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className="w-full flex-1 bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-col">
          <MapView locations={locations} activePoint={latestPoint} height="520px" />
        </div>
      </main>
    </div>
  );
}