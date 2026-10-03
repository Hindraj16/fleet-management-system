import { useState, useEffect, useRef } from "react";
import MapView from "../components/MapView"; // Import your reusable Map component

// Helper API function placeholder (replace or adjust path as needed)
async function getVehicles() {
  const res = await fetch("https://your-api-domain.com/api/vehicles/");
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  return res.json();
}

const POINTS_PER_SECTION = 50;

export default function EditKMLFile() {
  const [vehiclesList, setVehiclesList] = useState([]);

  // Vehicle Search & Autosuggest State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Route Management State
  const [routeNameInput, setRouteNameInput] = useState("");
  const [defaultRoute, setDefaultRoute] = useState("");
  const [routeOptions, setRouteOptions] = useState([
    "Route No 08 Sanjay park 1 to 3",
  ]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Route Coordinates & Accordion Sections
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapLocations, setMapLocations] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);

  // State to store assigned route display table & vehicle metadata
  const [assignedRoute, setAssignedRoute] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Fetch initial list of vehicles from database on mount
  useEffect(() => {
    let ignore = false;
    async function loadVehicles() {
      try {
        const data = await getVehicles();
        if (!ignore && Array.isArray(data)) {
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

  // Close autosuggest dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter vehicles matching user input from database list
  const filteredVehicles = vehiclesList.filter((v) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const vehicleNum = (v.vehicle_number || "").toString().toLowerCase();
    const vehicleId = (v.id || "").toString().toLowerCase();

    return vehicleNum.includes(query) || vehicleId.includes(query);
  });

  // Fetch route assigned to specific vehicle from database
  const fetchAssignedRouteForVehicle = async (vehicleNumber) => {
    if (!vehicleNumber) return;

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const response = await fetch(
        `https://your-api-domain.com/api/get-vehicle-route/${encodeURIComponent(vehicleNumber)}`
      );

      if (!response.ok) {
        throw new Error("No assigned route found for this vehicle.");
      }

      const data = await response.json();

      if (data && data.coordinates) {
        let rawCoords = data.coordinates;
        if (typeof rawCoords === "string") {
          try {
            rawCoords = JSON.parse(rawCoords);
          } catch (e) {
            console.error("Coordinate parse error:", e);
          }
        }

        setRouteCoordinates(rawCoords);
        setMapLocations(rawCoords);
        setRouteNameInput(data.route_name || "");
        setSelectedRouteId(data.route_id || null);

        setAssignedRoute({
          vehicle_number: vehicleNumber,
          route_name: data.route_name || "Assigned Route",
          total_points: rawCoords.length,
        });

        setStatusMessage({
          type: "success",
          text: `Loaded route for Vehicle ${vehicleNumber} (${rawCoords.length} points)`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `No active route mapped to vehicle ${vehicleNumber}.`,
        });
      }
    } catch (error) {
      console.warn("Fetch vehicle route notice:", error.message);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to load vehicle route from database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Select vehicle from autosuggest list and automatically fetch its assigned route
  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSearchTerm(`${v.vehicle_number}`);
    setIsDropdownOpen(false);

    // Auto load assigned route from DB
    fetchAssignedRouteForVehicle(v.vehicle_number);
  };

  // 1. Handle Add New Route
  const handleAddRoute = async (e) => {
    e.preventDefault();

    if (!routeNameInput.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a route name to add." });
      return;
    }

    const newRoute = routeNameInput.trim();

    if (routeOptions.includes(newRoute)) {
      setStatusMessage({ type: "error", text: "Route already exists in the list." });
      return;
    }

    setIsLoading(true);

    try {
      await fetch("https://your-api-domain.com/api/routes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_name: newRoute }),
      }).catch((err) => console.log("Database optional save notice:", err));

      setRouteOptions((prev) => [...prev, newRoute]);
      setDefaultRoute(newRoute);
      setStatusMessage({ type: "success", text: `Route "${newRoute}" added successfully!` });
    } catch (error) {
      console.error("Add Route Error:", error);
      setStatusMessage({ type: "error", text: "Failed to add new route." });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Show Route
  const handleShowRoute = () => {
    const activeVeh = selectedVehicle?.vehicle_number || searchTerm.trim();

    if (activeVeh) {
      fetchAssignedRouteForVehicle(activeVeh);
    } else if (routeCoordinates.length > 0) {
      setMapLocations([...routeCoordinates]);
      setStatusMessage({
        type: "success",
        text: `Displaying current route (${routeCoordinates.length} points)`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "Please select a vehicle or load route coordinates first.",
      });
    }
  };

  // 3. Handle Edit Route (Update coordinates array)
  const handleEditRoute = () => {
    setMapLocations([...routeCoordinates]);
    setStatusMessage({ type: "success", text: "Map updated with edited coordinates." });
  };

  // 4. Handle Save Route to Database
  const handleSaveKmlToDatabase = async () => {
    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();
    const activeRoute = routeNameInput || defaultRoute;

    if (!vehicleValue) {
      setStatusMessage({ type: "error", text: "Please select or enter a vehicle number." });
      return;
    }

    if (!activeRoute) {
      setStatusMessage({ type: "error", text: "Please enter a route name." });
      return;
    }

    if (routeCoordinates.length === 0) {
      setStatusMessage({ type: "error", text: "No route coordinates to save." });
      return;
    }

    setIsLoading(true);

    const payload = {
      vehicle_number: vehicleValue,
      route_name: activeRoute,
      coordinates: routeCoordinates,
    };

    try {
      const response = await fetch("https://your-api-domain.com/api/save-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save route in database.");
      }

      setAssignedRoute({
        vehicle_number: vehicleValue,
        route_name: activeRoute,
        total_points: routeCoordinates.length,
      });

      setStatusMessage({
        type: "success",
        text: `Route "${activeRoute}" assigned to Vehicle "${vehicleValue}" and saved to DB!`,
      });
    } catch (error) {
      console.error("Save Route Error:", error);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to save route in database server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Delete Route
  const handleDeleteRoute = async (e) => {
    if (e) e.preventDefault();

    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();

    if (!vehicleValue) {
      setStatusMessage({ type: "error", text: "Please enter or select a vehicle number to delete." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://your-api-domain.com/api/delete-route/${encodeURIComponent(vehicleValue)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete route from database.");
      }

      setAssignedRoute(null);
      setRouteCoordinates([]);
      setMapLocations([]);
      setRouteNameInput("");
      setDefaultRoute("");
      setSelectedVehicle(null);
      setStatusMessage({ type: "success", text: "Route assignment deleted from database." });
    } catch (error) {
      console.error("API Delete Error:", error);
      setStatusMessage({ type: "error", text: "Failed to delete route from backend server." });
    } finally {
      setIsLoading(false);
    }
  };

  // Coordinate Change Handler inside Accordion
  const handleCoordinateChange = (globalIndex, coordIndex, val) => {
    const updated = [...routeCoordinates];
    if (updated[globalIndex]) {
      const newPt = [...updated[globalIndex]];
      newPt[coordIndex] = Number(val);
      updated[globalIndex] = newPt;
      setRouteCoordinates(updated);
    }
  };

  // Remove single point handler
  const handleRemovePoint = (globalIndex) => {
    const updated = routeCoordinates.filter((_, idx) => idx !== globalIndex);
    setRouteCoordinates(updated);
  };

  // Chunk route coordinates into section blocks of 50
  const routeSections = [];
  for (let i = 0; i < routeCoordinates.length; i += POINTS_PER_SECTION) {
    routeSections.push(routeCoordinates.slice(i, i + POINTS_PER_SECTION));
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow-md mb-6 border border-gray-100 flex flex-col space-y-6">
      {/* Top Controls Header */}
      <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Vehicle Search / Autosuggest Input */}
            <div className="relative min-w-[220px]" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Name / Number
              </label>
              <input
                type="text"
                placeholder="Search Vehicle No..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedVehicle(null);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
              />

              {/* Autosuggest Dropdown List */}
              {isDropdownOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {filteredVehicles.length > 0 ? (
                    filteredVehicles.map((v) => (
                      <li
                        key={v.id || v.vehicle_number}
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

            {/* Route Name Input */}
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add / Assigned Route Name
              </label>
              <input
                type="text"
                placeholder="Enter route name..."
                value={routeNameInput}
                onChange={(e) => setRouteNameInput(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowRoute}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              {isLoading ? "Loading..." : "Show Route"}
            </button>
            <button
              onClick={handleEditRoute}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded hover:bg-blue-100 transition"
            >
              Edit Route
            </button>
            <button
              onClick={handleSaveKmlToDatabase}
              disabled={isLoading || routeCoordinates.length === 0}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:bg-gray-300 transition"
            >
              {isLoading ? "Saving..." : "Save Route"}
            </button>
            {(selectedRouteId || assignedRoute) && (
              <button
                onClick={handleDeleteRoute}
                disabled={isLoading}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition"
              >
                Delete Route
              </button>
            )}
          </div>
        </div>

        {/* Status Message Display */}
        {statusMessage.text && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium mb-3 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Section Accordion List */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-3 bg-gray-50">
          {routeSections.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No points loaded. Select a vehicle or click "Show Route" to load data from the database.
            </p>
          ) : (
            routeSections.map((sectionPoints, secIdx) => {
              const startIdx = secIdx * POINTS_PER_SECTION;
              const endIdx = startIdx + sectionPoints.length;
              const isExpanded = expandedSection === secIdx;

              return (
                <div
                  key={secIdx}
                  className="border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() =>
                      setExpandedSection(isExpanded ? null : secIdx)
                    }
                    className="w-full flex justify-between items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 transition text-left"
                  >
                    <span className="text-xs font-bold text-gray-700">
                      Section #{secIdx + 1} (Points {startIdx + 1} - {endIdx})
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {isExpanded ? "▲ Hide" : "▼ Expand"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2 bg-white">
                      {sectionPoints.map((pt, pointOffset) => {
                        const globalIdx = startIdx + pointOffset;
                        return (
                          <div
                            key={globalIdx}
                            className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200"
                          >
                            <span className="text-xs font-bold text-gray-600 min-w-[70px]">
                              Point #{globalIdx + 1}
                            </span>

                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">
                                  LAT:
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={pt[0]}
                                  onChange={(e) =>
                                    handleCoordinateChange(
                                      globalIdx,
                                      0,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">
                                  LNG:
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={pt[1]}
                                  onChange={(e) =>
                                    handleCoordinateChange(
                                      globalIdx,
                                      1,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemovePoint(globalIdx)}
                              className="text-red-500 hover:text-red-700 text-xs px-2 font-bold"
                              title="Remove Point"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Embedded Map Section with Vehicle Assignment Banner */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Route Preview Map
          </span>

          {/* Active Assigned Vehicle Badge */}
          {assignedRoute && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-700">
              <span>🚗 Vehicle Assigned: <strong>{assignedRoute.vehicle_number}</strong></span>
              <span className="text-blue-300">|</span>
              <span>Route: <strong>{assignedRoute.route_name}</strong></span>
            </div>
          )}
        </div>

        <MapView
          locations={mapLocations}
          height="450px"
          autoFitBounds={true}
        />
      </div>
    </div>
  );
}