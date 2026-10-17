import { useState, useEffect, useRef } from "react";
import { getVehicles } from "../api/fleetApi";

export default function AssignRoute() {
  const [vehiclesList, setVehiclesList] = useState([]);

  // Vehicle Selection State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef(null);

  // Route Input & Tags for "Select Route"
  const [routeInputValue, setRouteInputValue] = useState("");
  const [selectedRouteTags, setSelectedRouteTags] = useState([]);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const routeDropdownRef = useRef(null);

  // Default Route Selection State (Manual Dropdown)
  const [selectedDefaultRoute, setSelectedDefaultRoute] = useState("");
  const [activeDefaultRoute, setActiveDefaultRoute] = useState("");

  // Master Lists
  const [globalRouteOptions, setGlobalRouteOptions] = useState([]);
  const [allAssignedAssignments, setAllAssignedAssignments] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const extractRouteName = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.route_name || item.routeName || item.file_name || item.name || "";
  };

  const extractVehicleNumber = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.vehicle_number || item.vehicle || item.id || "";
  };

  // Initial Load
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const vehicleData = await getVehicles();
        if (!ignore && Array.isArray(vehicleData)) {
          setVehiclesList(vehicleData);
        }
      } catch (err) {
        console.warn("Could not fetch vehicles list:", err);
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/api/route-history/");
        if (response.ok) {
          const routeData = await response.json();
          if (!ignore) {
            const parsedRoutes = Array.isArray(routeData)
              ? routeData
              : routeData?.results || routeData?.data || [];
            setGlobalRouteOptions(parsedRoutes);
          }
        }
      } catch (err) {
        console.warn("Could not fetch route history:", err);
      }

      fetchAllAssignedRoutes();
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  const fetchAllAssignedRoutes = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/assign-route/");
      if (response.ok) {
        const data = await response.json();
        const parsedArray = Array.isArray(data) ? data : data?.results || data?.data || [];
        setAllAssignedAssignments(parsedArray);
      }
    } catch (err) {
      console.warn("Could not fetch all assigned routes:", err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target)) {
        setIsVehicleDropdownOpen(false);
      }
      if (routeDropdownRef.current && !routeDropdownRef.current.contains(event.target)) {
        setIsRouteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAssignedRoutesForVehicle = async (vehicleNumber) => {
    if (!vehicleNumber) return;

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/assign-route/by-vehicle/${encodeURIComponent(vehicleNumber)}/`
      );

      if (!response.ok) {
        setSelectedRouteTags([]);
        setSelectedDefaultRoute("");
        setActiveDefaultRoute("");
        return;
      }

      const data = await response.json();
      const routesArray = Array.isArray(data) ? data : [data];

      const assignedNames = Array.from(
        new Set(routesArray.map((r) => extractRouteName(r)).filter(Boolean))
      );
      setSelectedRouteTags(assignedNames);

      const defaultRouteObj = routesArray.find((r) => r.is_default || r.is_active);
      const autoRouteName = defaultRouteObj
        ? extractRouteName(defaultRouteObj)
        : assignedNames[0] || "";

      setActiveDefaultRoute(autoRouteName);
      setSelectedDefaultRoute("");
    } catch (err) {
      console.warn("No route assignments found for vehicle:", err);
      setSelectedRouteTags([]);
      setSelectedDefaultRoute("");
      setActiveDefaultRoute("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehicle = (v) => {
    const vehicleNum = v.vehicle_number || v.id;
    setSelectedVehicle(v);
    setSearchTerm(`${vehicleNum}`);
    setIsVehicleDropdownOpen(false);
    fetchAssignedRoutesForVehicle(vehicleNum);
  };

  const handleClearVehicle = () => {
    setSearchTerm("");
    setSelectedVehicle(null);
    setSelectedRouteTags([]);
    setSelectedDefaultRoute("");
    setActiveDefaultRoute("");
  };

  const handleAddRouteTag = (routeName) => {
    const trimmed = routeName.trim();
    if (trimmed && !selectedRouteTags.includes(trimmed)) {
      setSelectedRouteTags((prev) => [...prev, trimmed]);
    }
    setRouteInputValue("");
    setIsRouteDropdownOpen(false);
  };

  const handleRouteInputKeyDown = (e) => {
    if (e.key === "Enter" && routeInputValue.trim()) {
      e.preventDefault();
      handleAddRouteTag(routeInputValue);
    }
  };

  const handleRemoveRouteTag = (routeName) => {
    setSelectedRouteTags((prev) => prev.filter((tag) => tag !== routeName));
    if (selectedDefaultRoute === routeName) {
      setSelectedDefaultRoute("");
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

  const allMasterRouteNames = Array.from(
    new Set(globalRouteOptions.map((r) => extractRouteName(r)).filter(Boolean))
  );

  const filteredRoutes = allMasterRouteNames.filter((rName) => {
    if (!routeInputValue.trim()) return true;
    return rName.toLowerCase().includes(routeInputValue.toLowerCase().trim());
  });

  const displayedTableData = allAssignedAssignments.filter((item) => {
    if (!searchTerm.trim()) return true;
    const itemVehicle = extractVehicleNumber(item).toString().toLowerCase();
    return itemVehicle.includes(searchTerm.toLowerCase().trim());
  });

  const handleAssignRoute = async (e, customVehicle = null, customTargetRoute = null) => {
    if (e) e.preventDefault();

    const vehicleValue = customVehicle || selectedVehicle?.vehicle_number || searchTerm.trim();
    const targetRoute = customTargetRoute || selectedDefaultRoute;

    if (!vehicleValue) {
      setStatusMessage({ type: "error", text: "Please select a vehicle." });
      return;
    }

    if (!targetRoute) {
      setStatusMessage({
        type: "error",
        text: "Please select a route from 'Select Default Route'.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/assign-route/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: vehicleValue,
          route: targetRoute,
          assigned_routes: selectedRouteTags,
          is_default: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "An issue arose while assigning the route.");

      setStatusMessage({
        type: "success",
        text: `Route "${targetRoute}" has been set as the new Active Default for vehicle "${vehicleValue}"!`,
      });

      await fetchAssignedRoutesForVehicle(vehicleValue);
      await fetchAllAssignedRoutes();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Assign & Manage Vehicle Routes</h2>

        {statusMessage.text && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              statusMessage.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* 1. Select Vehicle/Sweeper Input */}
          <div className="relative" ref={vehicleDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Vehicle/Sweeper
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Select Vehicle"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedVehicle(null);
                  setIsVehicleDropdownOpen(true);
                }}
                onFocus={() => setIsVehicleDropdownOpen(true)}
                className="w-full p-2 pr-8 bg-white border border-gray-300 rounded text-sm text-gray-800 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearVehicle}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {isVehicleDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                {filteredVehicles.map((v) => (
                  <li
                    key={v.id || v.vehicle_number}
                    onClick={() => handleSelectVehicle(v)}
                    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer font-medium text-gray-800"
                  >
                    {v.vehicle_number}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. Select Route (Manual Typing + Tags + Dropdown) */}
          <div className="relative" ref={routeDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Route
            </label>
            <div className="w-full p-1.5 bg-white border border-gray-300 rounded min-h-[42px] flex flex-wrap gap-1 items-center shadow-sm">
              {/* Existing Tags */}
              {selectedRouteTags.map((rName, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-gray-200 text-gray-800 border border-gray-300 text-xs px-2 py-1 rounded shadow-sm"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRouteTag(rName);
                    }}
                    className="text-gray-500 hover:text-red-600 font-bold text-xs mr-0.5"
                  >
                    ✕
                  </button>
                  {rName}
                </span>
              ))}

              {/* Manual Typing Input Box */}
              <input
                type="text"
                placeholder={selectedRouteTags.length === 0 ? "Type or select routes..." : "Add more..."}
                value={routeInputValue}
                onChange={(e) => {
                  setRouteInputValue(e.target.value);
                  setIsRouteDropdownOpen(true);
                }}
                onFocus={() => setIsRouteDropdownOpen(true)}
                onKeyDown={handleRouteInputKeyDown}
                className="flex-grow p-1 text-sm outline-none bg-transparent min-w-[120px]"
              />
            </div>

            {/* Dropdown for suggestions or new route creation */}
            {isRouteDropdownOpen && (
              <ul className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg divide-y divide-gray-100">
                {routeInputValue.trim() && !filteredRoutes.includes(routeInputValue.trim()) && (
                  <li
                    onClick={() => handleAddRouteTag(routeInputValue)}
                    className="px-3 py-2 text-sm cursor-pointer font-bold text-blue-600 hover:bg-blue-50"
                  >
                    "{routeInputValue.trim()}" (Press Enter)
                  </li>
                )}
                {filteredRoutes.map((rName, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleAddRouteTag(rName)}
                    className={`px-3 py-2 text-sm cursor-pointer font-medium ${
                      selectedRouteTags.includes(rName)
                        ? "bg-blue-100 text-blue-700 font-bold"
                        : "hover:bg-blue-50 text-gray-800"
                    }`}
                  >
                    {rName}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. Select Default Route (Manual Dropdown) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Default Route
            </label>
            <select
              value={selectedDefaultRoute}
              onChange={(e) => setSelectedDefaultRoute(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded text-sm text-gray-800 shadow-sm"
            >
              <option value="">Select</option>
              {selectedRouteTags.map((rName, idx) => (
                <option key={idx} value={rName}>
                  {rName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assign Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => handleAssignRoute(e)}
            className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-medium rounded text-sm transition-colors shadow-sm"
          >
            {isLoading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-bold text-gray-800">
            Assigned Route Details
            {searchTerm ? ` (Filtered for Vehicle: ${searchTerm})` : " (All Vehicles)"}
          </h3>
          {searchTerm && (
            <button
              onClick={handleClearVehicle}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Show All Vehicles
            </button>
          )}
        </div>

        {displayedTableData.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {searchTerm
              ? `No routes have been assigned to vehicle "${searchTerm}".`
              : "No routes have been assigned to any vehicle yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-700 font-bold">
                  <th className="p-3">Sr.No</th>
                  <th className="p-3">Vehicle Number</th>
                  <th className="p-3">Assigned Route</th>
                  <th className="p-3">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedTableData.map((item, index) => {
                  const vehicleNum = extractVehicleNumber(item);
                  const routeName = extractRouteName(item);
                  const isActive =
                    item.is_default ||
                    item.is_active ||
                    (vehicleNum === searchTerm && routeName === activeDefaultRoute);

                  return (
                    <tr
                      key={index}
                      className={isActive ? "bg-blue-50/60 font-semibold" : "hover:bg-gray-50"}
                    >
                      <td className="p-3 text-gray-500">{index + 1}</td>
                      <td className="p-3 font-bold text-gray-800">{vehicleNum}</td>
                      <td className="p-3 text-blue-600 font-medium">{routeName}</td>
                      <td className="p-3">
                        {isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Active Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignRoute(null, vehicleNum, routeName)}
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline font-medium"
                          >
                            Set Active Default
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}