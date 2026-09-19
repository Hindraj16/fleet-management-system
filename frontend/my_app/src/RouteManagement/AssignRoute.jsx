import { useState, useEffect, useRef } from "react";
import { getVehicles } from "../api/fleetApi"; // Replace with your actual API endpoint import

export default function AssignRoute() {
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

  // State to store assigned route display table
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

  // Select vehicle from autosuggest list
  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSearchTerm(`${v.vehicle_number} (ID: ${v.id})`);
    setIsDropdownOpen(false);
  };

  // 1. Handle Add New Route (Saves route to select dropdown & database)
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
      // Optional: Post new route master record to backend database
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

  // 2. Handle Assign Route
  const handleAssignRoute = async (e) => {
    e.preventDefault();

    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();
    const activeRoute = routeNameInput || defaultRoute;

    if (!vehicleValue) {
      setStatusMessage({ type: "error", text: "Please enter or select a vehicle." });
      return;
    }

    if (!activeRoute) {
      setStatusMessage({ type: "error", text: "Please specify or select a route name." });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    const payload = {
      vehicle_number: vehicleValue,
      route_name: activeRoute,
    };

    try {
      const response = await fetch("https://your-api-domain.com/api/assign-route", {
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
        kml_file: data.kml_file || "No KML File Uploaded",
      });

      setStatusMessage({ type: "success", text: "Route assigned and saved to database successfully!" });
    } catch (error) {
      console.error("API Error:", error);
      setStatusMessage({ type: "error", text: error.message || "Failed to store in database server." });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Delete Route
  const handleDeleteRoute = async (e) => {
    e.preventDefault();

    const vehicleValue = selectedVehicle?.vehicle_number || searchTerm.trim();

    if (!vehicleValue) {
      setStatusMessage({ type: "error", text: "Please enter or select a vehicle number to delete." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://your-api-domain.com/api/delete-route/${vehicleValue}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete route from database.");
      }

      setAssignedRoute(null);
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

  return (
    <div className="space-y-6">
      {/* Route Action Control Box */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Assign & Manage Vehicle Routes</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Vehicle Autosuggest Input */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name / Number
            </label>
            <input
              type="text"
              placeholder="Search Vehicle No "
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

          {/* Add Route Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Route Name
            </label>
            <input
              type="text"
              placeholder="Enter new route name..."
              value={routeNameInput}
              onChange={(e) => setRouteNameInput(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-800"
            />
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
              <option value="">-- Select Route --</option>
              {routeOptions.map((route, idx) => (
                <option key={idx} value={route}>
                  {route}
                </option>
              ))}
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
                  <td className="p-3 font-medium">{assignedRoute.vehicle_number}</td>
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