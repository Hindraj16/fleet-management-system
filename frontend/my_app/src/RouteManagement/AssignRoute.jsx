import { useState, useEffect, useRef } from "react";
import { getVehicles } from "../api/fleetApi"; // Replace with your actual API endpoint import

export default function AssignRoute() {
  const [vehiclesList, setVehiclesList] = useState([]);

  // Vehicle Search & Autosuggest State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef(null);

  // Route Name Autosuggest & Selection State
  const [routeNameInput, setRouteNameInput] = useState("");
  const [defaultRoute, setDefaultRoute] = useState("");
  const [routeOptions, setRouteOptions] = useState([]); // Master route history list from database
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const routeDropdownRef = useRef(null);

  // State to store assigned route display table
  const [assignedRoute, setAssignedRoute] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Helper function to extract route name from Django UploadRouteHistory objects
  const extractRouteName = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    if (typeof item === "object") {
      // Prioritize `route_name` (e.g., "rgb"), fallback to `file_name`
      return item.route_name || item.routeName || item.file_name || item.name || "";
    }
    return String(item);
  };

  // Fetch initial list of vehicles and saved upload route histories from database on mount
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      // 1. Fetch Vehicles List
      try {
        const vehicleData = await getVehicles();
        if (!ignore && Array.isArray(vehicleData)) {
          setVehiclesList(vehicleData);
        }
      } catch (err) {
        console.warn("Could not fetch vehicles list:", err);
      }

      // 2. Fetch Saved Route Histories from Django Backend DB Table (UploadRouteHistory)
      try {
        // Adjust endpoint URL according to your Django backend routes
        const response = await fetch("http://127.0.0.1:8000/api/route-history/"); 
        
        if (response.ok) {
          const routeData = await response.json();
          if (!ignore) {
            let parsedRoutes = [];

            // Handle Django DRF array formats and paginated responses ({ results: [...] })
            if (Array.isArray(routeData)) {
              parsedRoutes = routeData;
            } else if (Array.isArray(routeData?.results)) {
              parsedRoutes = routeData.results;
            } else if (Array.isArray(routeData?.data)) {
              parsedRoutes = routeData.data;
            }

            setRouteOptions(parsedRoutes);

            // Auto-select the LATEST created route ("rgb") as default
            if (parsedRoutes.length > 0) {
              const latestItem = parsedRoutes[parsedRoutes.length - 1];
              const latestRouteName = extractRouteName(latestItem);

              if (latestRouteName) {
                setDefaultRoute(latestRouteName);
                setRouteNameInput(latestRouteName);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch upload route history list from API:", err);
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        vehicleDropdownRef.current &&
        !vehicleDropdownRef.current.contains(event.target)
      ) {
        setIsVehicleDropdownOpen(false);
      }
      if (
        routeDropdownRef.current &&
        !routeDropdownRef.current.contains(event.target)
      ) {
        setIsRouteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter vehicles matching user input
  const filteredVehicles = vehiclesList.filter((v) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const vehicleNum = (v.vehicle_number || "").toString().toLowerCase();
    const vehicleId = (v.id || "").toString().toLowerCase();

    return vehicleNum.includes(query) || vehicleId.includes(query);
  });

  // Filter route options matching user input for Route Autosuggest
  const filteredRoutes = routeOptions.filter((r) => {
    const name = extractRouteName(r);
    if (!routeNameInput.trim()) return true;
    return name.toLowerCase().includes(routeNameInput.toLowerCase().trim());
  });

  // Fetch existing assigned route for selected vehicle from database
  const fetchAssignedRouteForVehicle = async (vehicleNumber) => {
    if (!vehicleNumber) return;

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-vehicle-route/${encodeURIComponent(vehicleNumber)}`);
      if (!response.ok) {
        setAssignedRoute(null);
        return;
      }

      const data = await response.json();
      const activeRouteName = extractRouteName(data) || data.route_name;

      if (data && activeRouteName) {
        setAssignedRoute({
          vehicle_number: vehicleNumber,
          route_name: activeRouteName,
          kml_file: data.file_name || data.kml_file || "Uploaded",
        });

        // Set current assigned route to inputs/dropdown
        setDefaultRoute(activeRouteName);
        setRouteNameInput(activeRouteName);
      } else {
        setAssignedRoute(null);
      }
    } catch (err) {
      console.warn("No active route assignment found:", err);
      setAssignedRoute(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Select vehicle from autosuggest
  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSearchTerm(`${v.vehicle_number}`);
    setIsVehicleDropdownOpen(false);

    // Automatically load & set latest assigned route for this vehicle
    fetchAssignedRouteForVehicle(v.vehicle_number);
  };

  // Select route from autosuggest
  const handleSelectRouteFromAutosuggest = (routeVal) => {
    const selectedName = extractRouteName(routeVal);
    setRouteNameInput(selectedName);
    setDefaultRoute(selectedName);
    setIsRouteDropdownOpen(false);
  };

  // 1. Handle Add New Route (Saves route to database & sets as default)
  const handleAddRoute = async (e) => {
    e.preventDefault();

    if (!routeNameInput.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter a route name to add.",
      });
      return;
    }

    const newRoute = routeNameInput.trim();

    // Check duplicate route names
    const exists = routeOptions.some(
      (r) => extractRouteName(r).toLowerCase() === newRoute.toLowerCase()
    );

    if (exists) {
      setStatusMessage({
        type: "error",
        text: "Route already exists in upload route history.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await fetch("http://127.0.0.1:8000/api/route-history/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_name: newRoute }),
      }).catch((err) => console.log("Database save notice:", err));

      setRouteOptions((prev) => [...prev, { route_name: newRoute }]);
      setDefaultRoute(newRoute);
      setStatusMessage({
        type: "success",
        text: `Route "${newRoute}" added & set as current default route!`,
      });
    } catch (error) {
      console.error("Add Route Error:", error);
      setStatusMessage({ type: "error", text: "Failed to add new route." });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Assign Route
  const handleAssignRoute = async (e) => {
    e.preventDefault();

    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();
    const activeRoute = routeNameInput || defaultRoute;

    if (!vehicleValue) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a vehicle.",
      });
      return;
    }

    if (!activeRoute) {
      setStatusMessage({
        type: "error",
        text: "Please specify or select a route name.",
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    const payload = {
      vehicle_number: vehicleValue,
      route_name: activeRoute,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/assign-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save assignment in database.");
      }

      const data = await response.json();

      setAssignedRoute({
        vehicle_number: data.vehicle_number || vehicleValue,
        route_name: data.route_name || payload.route_name,
        kml_file: data.file_name || data.kml_file || "No KML File Uploaded",
      });

      setDefaultRoute(activeRoute);

      setStatusMessage({
        type: "success",
        text: `Route "${activeRoute}" successfully assigned to vehicle "${vehicleValue}"!`,
      });
    } catch (error) {
      console.error("API Error:", error);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to store in database server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Delete Route
  const handleDeleteRoute = async (e) => {
    e.preventDefault();

    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();

    if (!vehicleValue) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a vehicle number to delete.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/delete-route/${encodeURIComponent(vehicleValue)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete route from database.");
      }

      setAssignedRoute(null);
      setRouteNameInput("");
      setDefaultRoute("");
      setSelectedVehicle(null);
      setStatusMessage({
        type: "success",
        text: "Route assignment deleted from database.",
      });
    } catch (error) {
      console.error("API Delete Error:", error);
      setStatusMessage({
        type: "error",
        text: "Failed to delete route from backend server.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Action Control Box */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col space-y-4">
        <h2 className="text-lg font-bold text-gray-800">
          Assign & Manage Vehicle Routes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Vehicle Autosuggest Input */}
          <div className="relative" ref={vehicleDropdownRef}>
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
                setIsVehicleDropdownOpen(true);
              }}
              onFocus={() => setIsVehicleDropdownOpen(true)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
            />

            {/* Vehicle Autosuggest Dropdown */}
            {isVehicleDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map((v) => (
                    <li
                      key={v.id || v.vehicle_number}
                      onClick={() => handleSelectVehicle(v)}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{v.vehicle_number}</span>{" "}
                      <span className="text-xs text-gray-400">
                        (ID: {v.id})
                      </span>
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

          {/* Add Route Input WITH Database History Autosuggest */}
          <div className="relative" ref={routeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add / Search Route Name
            </label>
            <input
              type="text"
              placeholder="Enter or search route name..."
              value={routeNameInput}
              onChange={(e) => {
                setRouteNameInput(e.target.value);
                setIsRouteDropdownOpen(true);
              }}
              onFocus={() => setIsRouteDropdownOpen(true)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
            />

            {/* UploadRouteHistory Database Autosuggest Dropdown */}
            {isRouteDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((r, idx) => {
                    const name = extractRouteName(r);
                    const isLatest = idx === routeOptions.length - 1;
                    return (
                      <li
                        key={idx}
                        onClick={() => handleSelectRouteFromAutosuggest(r)}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                      >
                        <span className="font-medium">{name}</span>
                        {isLatest && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="px-4 py-2 text-sm text-gray-400">
                    No matching route history found
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Select Default/Saved Route */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Default Route
            </label>
            <select
              value={defaultRoute}
              onChange={(e) => {
                setDefaultRoute(e.target.value);
                if (e.target.value) setRouteNameInput(e.target.value);
              }}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
            >
              <option value="">-- Select Default Route --</option>
              {Array.isArray(routeOptions) &&
                routeOptions.map((route, idx) => {
                  const val = extractRouteName(route);
                  const isLatest = idx === routeOptions.length - 1;
                  return (
                    <option key={idx} value={val}>
                      {val} {isLatest ? "(Latest)" : ""}
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Add Route Button */}
          <div>
            <button
              type="button"
              onClick={handleAddRoute}
              disabled={isLoading || !routeNameInput.trim()}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition text-sm disabled:opacity-50"
            >
              Add Route
            </button>
          </div>

          {/* Assign Route Button */}
          <div>
            <button
              type="button"
              onClick={handleAssignRoute}
              disabled={isLoading || (!searchTerm && !selectedVehicle)}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition text-sm disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Assign Route"}
            </button>
          </div>

          {/* Delete Route Button */}
          <div>
            <button
              type="button"
              onClick={handleDeleteRoute}
              disabled={isLoading || (!searchTerm && !selectedVehicle)}
              className="w-full px-4 py-2 bg-red-400 hover:bg-red-500 text-white font-medium rounded-lg transition text-sm disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete Route"}
            </button>
          </div>
        </div>
      </div>

      {/* API Status Alert Box */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-lg text-sm font-medium border ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Assigned Route Details Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-md font-bold text-gray-800 mb-4">
          Assigned Route Details
        </h3>

        {!assignedRoute ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Please select a vehicle above to view or set its route details.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                  <th className="p-3 w-1/3">Vehicle Number</th>
                  <th className="p-3 w-1/3">Assigned Route</th>
                  <th className="p-3 w-1/3">Upload KML Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="p-3 font-medium">
                    {assignedRoute.vehicle_number}
                  </td>
                  <td className="p-3 text-blue-600 font-medium">
                    {assignedRoute.route_name || "No Route Assigned"}
                  </td>
                  <td className="p-3 text-gray-400 italic">
                    {assignedRoute.kml_file}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}