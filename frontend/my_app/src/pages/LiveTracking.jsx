import { useEffect, useState, useCallback, useRef } from "react";
import { getVehicles, getGPSLocations, getAssignedRouteByVehicle, getRoutesList } from "../api/fleetApi";
import MapView from "../components/MapView";

export default function LiveTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState("");
  const [gpsPoints, setGpsPoints] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [liveMarkerPosition, setLiveMarkerPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useDateFilter, setUseDateFilter] = useState(true);
  const [startDate, setStartDate] = useState("2026-10-12T00:00");
  const [endDate, setEndDate] = useState("2026-10-12T23:59");
  const [playbackState, setPlaybackState] = useState("STOPPED");
  const [playbackIndex, setPlaybackIndex] = useState(0);

  // Load vehicles list on mount
  useEffect(() => {
    let ignore = false;
    async function loadVehicles() {
      try {
        const data = await getVehicles();
        if (!ignore && Array.isArray(data) && data.length > 0) {
          setVehiclesList(data);
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const parsePoint = (pt) => {
    if (!pt) return null;
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = parseFloat(pt[0]);
      const lng = parseFloat(pt[1]);
      return !isNaN(lat) && !isNaN(lng) ? { lat, lng, name: "" } : null;
    }
    if (typeof pt === "object") {
      const lat = parseFloat(pt.latitude ?? pt.lat);
      const lng = parseFloat(pt.longitude ?? pt.lng);
      const name = pt.name || pt.type || "";
      return !isNaN(lat) && !isNaN(lng) ? { lat, lng, name } : null;
    }
    return null;
  };

  const processDatabaseCoordinates = (rawCoords) => {
    if (!rawCoords) return [];
    let items = rawCoords;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error("JSON parse error for coordinates:", e);
        return [];
      }
    }
    if (!Array.isArray(items)) return [];

    // Jar detailed_points objects astil (lat, lng, name sahita)
    if (items.length > 0 && typeof items[0] === "object" && items[0] !== null && !Array.isArray(items[0])) {
      return items.map(parsePoint).filter(Boolean);
    }

    if (Array.isArray(items[0]) && (Array.isArray(items[0][0]) || typeof items[0][0] === "object")) {
      const flat = [];
      items.forEach(seg => {
        if (Array.isArray(seg)) {
          seg.forEach(pt => {
            const parsed = parsePoint(pt);
            if (parsed) flat.push(parsed);
          });
        }
      });
      return flat;
    }

    return items.map(parsePoint).filter(Boolean);
  };

  const fetchVehicleRouteAndLocations = useCallback(
    async (targetVehicleId = selectedVehicleId, targetVehicleNum = selectedVehicleNumber) => {
      if (!targetVehicleId) {
        setError("Please select a vehicle from the “Search Vehicle” option first.");
        return;
      }
      try {
        setLoading(true);
        setError("");
        setPlaybackState("STOPPED");
        setPlaybackIndex(0);
        setLiveMarkerPosition(null);
        let routeFound = false;
        let routeNameStr = "";

        // 1. Fetch assigned route for vehicle to get route_name (e.g. "route 688")
        try {
          const assignedRes = await getAssignedRouteByVehicle(targetVehicleId);
          console.log("Assigned Route API Response:", assignedRes);
          if (assignedRes) {
            const routeObj = Array.isArray(assignedRes) ? assignedRes[0] : assignedRes;
            if (routeObj) {
              routeNameStr = routeObj.route_name || routeObj.route || routeObj.name || "";
            }
          }
        } catch (e) {
          console.warn("Could not fetch assigned route:", e);
        }

        if (!routeNameStr && targetVehicleNum) {
          routeNameStr = targetVehicleNum;
        }

        console.log("Resolved Route Name:", routeNameStr);

        // 2. Fetch Route History to get actual coordinates & detailed_points (labels) for this route name
        if (routeNameStr) {
          try {
            const historyRes = await fetch("http://127.0.0.1:8000/api/route-history/");
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              const parsedHistory = Array.isArray(historyData)
                ? historyData
                : historyData?.results || historyData?.data || [];
              
              const matchedRoute = parsedHistory.find(
                (r) =>
                  (r.route_name || r.name || "").toString().trim().toLowerCase() ===
                  routeNameStr.toString().trim().toLowerCase()
              );

              if (matchedRoute) {
                const targetData = matchedRoute.detailed_points && matchedRoute.detailed_points.length > 0
                  ? matchedRoute.detailed_points
                  : matchedRoute.coordinates;

                if (targetData) {
                  const coords = processDatabaseCoordinates(targetData);
                  if (coords.length > 0) {
                    setRouteCoordinates(coords);
                    routeFound = true;
                    console.log("Route coordinates & labels successfully loaded:", coords.length);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Could not fetch route history:", e);
          }
        }

        // 3. Fallback to getRoutesList if route history didn't match
        if (!routeFound && routeNameStr) {
          try {
            const routesList = await getRoutesList();
            const parsedRoutes = Array.isArray(routesList) ? routesList : routesList?.results || [];
            const targetClean = routeNameStr.toString().trim().toLowerCase();
            const matchedRoute = parsedRoutes.find((r) => {
              const rName = (r.route_name || r.name || r.file_name || "").toString().trim().toLowerCase();
              return rName === targetClean || rName.includes(targetClean) || targetClean.includes(rName);
            });
            if (matchedRoute) {
              const targetData = matchedRoute.detailed_points && matchedRoute.detailed_points.length > 0
                ? matchedRoute.detailed_points
                : matchedRoute.coordinates;
              if (targetData) {
                const coords = processDatabaseCoordinates(targetData);
                if (coords.length > 0) {
                  setRouteCoordinates(coords);
                  routeFound = true;
                }
              }
            }
          } catch (e) {
            console.warn("Could not fetch routes list:", e);
          }
        }

        if (!routeFound) {
          setRouteCoordinates([]);
          setError("No Route Found or coordinates missing for route: " + routeNameStr);
        }

        // 4. Fetch GPS Locations for tracking/playback
        const sDate = useDateFilter ? startDate : null;
        const eDate = useDateFilter ? endDate : null;
        const gpsData = await getGPSLocations(targetVehicleId, sDate, eDate);
        let parsedGPS = Array.isArray(gpsData) ? gpsData : gpsData?.results || [];

        parsedGPS.sort((a, b) => new Date(a.gps_timestamp) - new Date(b.gps_timestamp));

        if (parsedGPS.length === 0 && routeFound) {
          setError((prev) => (prev ? `${prev} & No GPS Found` : "No GPS Found"));
          setGpsPoints([]);
        } else if (parsedGPS.length > 0) {
          setGpsPoints(parsedGPS);
        }

      } catch (err) {
        console.error("API Error:", err);
        setError("An error occurred while retrieving data..");
        setRouteCoordinates([]);
        setGpsPoints([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedVehicleId, selectedVehicleNumber, useDateFilter, startDate, endDate]
  );

  // Playback animation effect for Vehicle Movement from Start to End
  useEffect(() => {
    let timer = null;
    if (playbackState === "PLAYING" && gpsPoints.length > 0) {
      timer = setInterval(() => {
        setPlaybackIndex((prevIndex) => {
          if (prevIndex < gpsPoints.length - 1) {
            return prevIndex + 1;
          } else {
            clearInterval(timer);
            setPlaybackState("STOPPED");
            return prevIndex;
          }
        });
      }, 800); // 800ms per point movement
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [playbackState, gpsPoints]);

  // Update live marker position as playback index changes
  useEffect(() => {
    if (gpsPoints.length > 0 && gpsPoints[playbackIndex]) {
      setLiveMarkerPosition(gpsPoints[playbackIndex]);
    }
  }, [playbackIndex, gpsPoints]);

  const handlePlayPauseResumeClick = () => {
    if (gpsPoints.length === 0) {
      setError("Please click 'Show Route' first to load GPS data.");
      return;
    }
    setError("");
    if (playbackState === "STOPPED") {
      setPlaybackIndex(0);
      setPlaybackState("PLAYING");
    } else if (playbackState === "PLAYING") {
      setPlaybackState("PAUSED");
    } else if (playbackState === "PAUSED") {
      setPlaybackState("PLAYING");
    }
  };

  const filteredVehicles = vehiclesList.filter((v) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    return (
      (v.vehicle_number || "").toString().toLowerCase().includes(query) ||
      (v.id || "").toString().toLowerCase().includes(query)
    );
  });

  const handleSelectVehicle = (v) => {
    const vId = v.id.toString();
    const vNum = v.vehicle_number || "";
    setSelectedVehicleId(vId);
    setSelectedVehicleNumber(vNum);
    setSearchTerm(`${vNum} (ID: ${vId})`);
    setIsDropdownOpen(false);
    setIsTracking(false);
    setPlaybackState("STOPPED");
    setRouteCoordinates([]);
    setGpsPoints([]);
    setLiveMarkerPosition(null);
    setError("");
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-gray-50 flex flex-col font-sans text-gray-800">
      <main className="flex-1 w-full px-8 py-6 flex flex-col space-y-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800">Live Vehicle Tracking</h1>

        <div className="w-full bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-wrap gap-6 items-end">
          <div className="relative w-64" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Search Vehicle
            </label>
            <input
              type="text"
              placeholder="--- search vehicle ---"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
                if (!e.target.value.trim()) {
                  setSelectedVehicleId("");
                  setSelectedVehicleNumber("");
                }
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

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
                  <li className="px-4 py-2 text-sm text-gray-400">No vehicle was found</li>
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
            onClick={() => {
              if (!selectedVehicleId) {
                setError("Please first select a vehicle from 'Search Vehicle'");
                return;
              }
              setIsTracking(false);
              setPlaybackState("STOPPED");
              setPlaybackIndex(0);
              setGpsPoints([]); 
              setLiveMarkerPosition(null);
              fetchVehicleRouteAndLocations(selectedVehicleId, selectedVehicleNumber);
            }}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition disabled:bg-blue-300"
          >
            {loading ? "Loading..." : "Show"}
          </button>

          <button
            onClick={handlePlayPauseResumeClick}
            disabled={loading}
            className={`px-5 py-2 text-white font-medium text-sm rounded-lg shadow transition disabled:opacity-50 ${
              playbackState === "PLAYING"
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {playbackState === "PLAYING" ? "Pause" : playbackState === "PAUSED" ? "Resume" : "Play"}
          </button>

          <button
            onClick={() => {
              setIsTracking(false);
              setPlaybackState("STOPPED");
              setPlaybackIndex(0);
              setRouteCoordinates([]);
              setGpsPoints([]);
              setLiveMarkerPosition(null);
              setError("");
            }}
            disabled={loading}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg shadow transition"
          >
            Stop
          </button>
        </div>

        {error && (
          <div className="w-full bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-sm">
            <span>{error}</span>
          </div>
        )}

        <div className="w-full flex-1 bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-col">
          <MapView
            locations={routeCoordinates}  
            markers={playbackState !== "STOPPED" ? gpsPoints : []} 
            activePoint={liveMarkerPosition} 
            height="520px"
            editable={false}
          />
        </div>
      </main>
    </div>
  );
}