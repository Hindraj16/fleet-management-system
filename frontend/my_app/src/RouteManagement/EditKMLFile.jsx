import { useState, useEffect, useRef } from "react";
import MapView from "../components/MapView"; // Import your reusable Map component
import { getVehicles } from "../api/fleetApi";

export default function EditKMLFile() {
  const [vehiclesList, setVehiclesList] = useState([]);

  // Vehicle Search & Autosuggest State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef(null);

  // Route Management State
  const [routeNameInput, setRouteNameInput] = useState("");
  const [defaultRoute, setDefaultRoute] = useState("");
  const [routeOptions, setRouteOptions] = useState([
    "Route No 08 Sanjay park 1 to 3",
  ]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Structured Route Points State: Array of objects { lat, lng, seg, name }
  const [routePoints, setRoutePoints] = useState([]);
  const [mapLocations, setMapLocations] = useState([]);

  // Currently Selected / Active Point Index for Highlighting on Map
  const [activePointIndex, setActivePointIndex] = useState(null);

  // Pagination State for Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // State to store assigned route display table & vehicle metadata
  const [assignedRoute, setAssignedRoute] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const isDraggingRef = useRef(false);

  // Extract helpers
  const extractRouteName = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    return (
      item.route_name ||
      item.routeName ||
      item.route ||
      item.file_name ||
      item.name ||
      ""
    );
  };

  const extractVehicleNumber = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.vehicle_number || item.vehicle || item.id || "";
  };

  // Keep Map locations synced whenever routePoints change
  useEffect(() => {
    const coords = routePoints.map((pt, idx) => ({
      lat: Number(pt.lat) || 0,
      lng: Number(pt.lng) || 0,
      name: pt.name && pt.name.trim() !== "" ? pt.name.trim() : "",
      seg: pt.seg || 0,
      isNew: pt.isNew || false,
      index: idx,
    }));
    setMapLocations(coords);
  }, [routePoints]);

  // Fetch initial list of vehicles and master routes on mount
  useEffect(() => {
    let ignore = false;
    async function loadInitialData() {
      try {
        const vehicleData = await getVehicles();
        if (!ignore) {
          const vehicleArray = Array.isArray(vehicleData)
            ? vehicleData
            : vehicleData?.results || [];
          setVehiclesList(vehicleArray);
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
            const routeNames = parsedRoutes
              .map((r) => extractRouteName(r))
              .filter(Boolean);
            if (routeNames.length > 0) {
              setRouteOptions((prev) =>
                Array.from(new Set([...prev, ...routeNames]))
              );
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch route history:", err);
      }
    }
    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Close autosuggest dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        vehicleDropdownRef.current &&
        !vehicleDropdownRef.current.contains(event.target)
      ) {
        setIsVehicleDropdownOpen(false);
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

  // Convert raw lat/lng array or objects into structured points
  const normalizeCoordinates = (rawCoords) => {
    if (typeof rawCoords === "string") {
      try {
        rawCoords = JSON.parse(rawCoords);
      } catch (e) {
        console.error("Coordinate parse error:", e);
        return [];
      }
    }
    if (!Array.isArray(rawCoords)) return [];

    return rawCoords.map((pt, idx) => {
      let lat = 0;
      let lng = 0;
      let seg = 0;
      let name = ""; // Default empty so it shows placeholder "Type/Name"

      if (Array.isArray(pt)) {
        lat = pt[0];
        lng = pt[1];
      } else if (typeof pt === "object" && pt !== null) {
        lat = pt.lat || pt.latitude || 0;
        lng = pt.lng || pt.longitude || 0;
        seg = pt.seg || pt.segment || 0;
        name = pt.name || pt.type || "";
      }

      if (idx === 0 && !name) name = "Route Start";
      else if (idx === rawCoords.length - 1 && !name) name = "Route End";

      return { lat, lng, seg, name, isNew: false };
    });
  };

  // Fetch route assigned to specific vehicle from database
  const fetchAssignedRouteForVehicle = async (vehicleNumber) => {
    if (!vehicleNumber) return;

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const assignRes = await fetch(
        `http://127.0.0.1:8000/api/assign-route/by-vehicle/${encodeURIComponent(vehicleNumber)}/`
      );

      if (!assignRes.ok) {
        throw new Error("No assigned route found for this vehicle.");
      }

      const assignData = await assignRes.json();
      const routesArray = Array.isArray(assignData) ? assignData : [assignData];

      if (routesArray.length === 0) {
        throw new Error("No route records associated with this vehicle.");
      }

      let activeRouteObj = routesArray.find(
        (r) => r.is_default === true || r.is_active === true
      );

      if (!activeRouteObj) {
        activeRouteObj = routesArray[routesArray.length - 1];
      }

      const assignedRouteName = extractRouteName(activeRouteObj);

      if (!assignedRouteName) {
        throw new Error("Active default route name could not be resolved.");
      }

      setRouteNameInput(assignedRouteName);

      // Fetch route history for coordinates
      const historyRes = await fetch("http://127.0.0.1:8000/api/route-history/");
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const parsedHistory = Array.isArray(historyData)
          ? historyData
          : historyData?.results || historyData?.data || [];

        const matchedRoute = parsedHistory.find(
          (r) =>
            extractRouteName(r).trim().toLowerCase() ===
            assignedRouteName.trim().toLowerCase()
        );

        if (matchedRoute && matchedRoute.coordinates) {
          const structuredPts = normalizeCoordinates(matchedRoute.coordinates);

          if (structuredPts.length > 0) {
            setRoutePoints(structuredPts);
            setSelectedRouteId(matchedRoute.id || null);
            setCurrentPage(1);

            setAssignedRoute({
              vehicle_number: vehicleNumber,
              route_name: assignedRouteName,
              total_points: structuredPts.length,
            });

            setStatusMessage({
              type: "success",
              text: `Loaded Active Default Route "${assignedRouteName}" for Vehicle ${vehicleNumber} (${structuredPts.length} points)`,
            });
            setIsLoading(false);
            return;
          }
        }
      }

      if (activeRouteObj.coordinates) {
        const structuredPts = normalizeCoordinates(activeRouteObj.coordinates);
        if (structuredPts.length > 0) {
          setRoutePoints(structuredPts);
          setCurrentPage(1);
          setAssignedRoute({
            vehicle_number: vehicleNumber,
            route_name: assignedRouteName,
            total_points: structuredPts.length,
          });
          setStatusMessage({
            type: "success",
            text: `Loaded Active Default Route "${assignedRouteName}" for Vehicle ${vehicleNumber} (${structuredPts.length} points)`,
          });
          return;
        }
      }

      throw new Error(
        `Active Default Route "${assignedRouteName}" assigned to ${vehicleNumber}, but no coordinates found in route history.`
      );
    } catch (error) {
      console.warn("Fetch vehicle route notice:", error.message);
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to load vehicle route from database.",
      });
      setRoutePoints([]);
      setAssignedRoute(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehicle = (v) => {
    const vehicleNum = extractVehicleNumber(v);
    setSelectedVehicle(v);
    setSearchTerm(vehicleNum);
    setIsVehicleDropdownOpen(false);

    fetchAssignedRouteForVehicle(vehicleNum);
  };

  const handleShowRoute = () => {
    const activeVeh = selectedVehicle
      ? extractVehicleNumber(selectedVehicle)
      : searchTerm.trim();

    if (activeVeh) {
      fetchAssignedRouteForVehicle(activeVeh);
    } else if (routePoints.length > 0) {
      setStatusMessage({
        type: "success",
        text: `Displaying current route (${routePoints.length} points)`,
      });
    } else {
      setStatusMessage({
        type: "error",
        text: "Please select a vehicle or load route coordinates first.",
      });
    }
  };

  // Point Actions
  const handlePointChange = (globalIndex, field, value) => {
    setActivePointIndex(globalIndex);
    const updated = [...routePoints];
    updated[globalIndex] = {
      ...updated[globalIndex],
      [field]: field === "lat" || field === "lng" || field === "seg" ? Number(value) : value,
    };
    setRoutePoints(updated);
  };

  const handleAddPointBelow = (globalIndex) => {
    const updated = [...routePoints];
    const currentPt = updated[globalIndex] || { lat: 18.56, lng: 73.92 };
    const newPt = {
      lat: Number((currentPt.lat + 0.0001).toFixed(6)),
      lng: Number((currentPt.lng + 0.0001).toFixed(6)),
      seg: currentPt.seg || 0,
      name: "",
      isNew: true, // Mark newly added point as green
    };
    updated.splice(globalIndex + 1, 0, newPt);
    setRoutePoints(updated);
    setActivePointIndex(globalIndex + 1);
  };

  const handleMoveUp = (globalIndex) => {
    if (globalIndex === 0) return;
    const updated = [...routePoints];
    const temp = updated[globalIndex];
    updated[globalIndex] = updated[globalIndex - 1];
    updated[globalIndex - 1] = temp;
    setRoutePoints(updated);
    setActivePointIndex(globalIndex - 1);
  };

  const handleMoveDown = (globalIndex) => {
    if (globalIndex === routePoints.length - 1) return;
    const updated = [...routePoints];
    const temp = updated[globalIndex];
    updated[globalIndex] = updated[globalIndex + 1];
    updated[globalIndex + 1] = temp;
    setRoutePoints(updated);
    setActivePointIndex(globalIndex + 1);
  };

  const handleDeletePoint = (globalIndex) => {
    const updated = routePoints.filter((_, idx) => idx !== globalIndex);
    setRoutePoints(updated);
    setActivePointIndex(null);
  };

  // Handle Map Click to Add Green Point
  const handleMapClick = (lat, lng) => {
    if (isDraggingRef.current) return;
    const newPt = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      seg: 0,
      name: "",
      isNew: true, // Green dot for new point
    };

    setRoutePoints((prev) => {
      const updated = [...prev];
      // Jar konta point select asel tar tyachya khali add hoil, nahi tar shevati
      const insertIndex =
        activePointIndex !== null &&
        activePointIndex >= 0 &&
        activePointIndex < updated.length
          ? activePointIndex + 1
          : updated.length;

      updated.splice(insertIndex, 0, newPt);
      setActivePointIndex(insertIndex);
      return updated;
    });
  };

  // Handle Point Drag on Map
  const handlePointDrag = (index, newLat, newLng) => {
    isDraggingRef.current = true;
    setRoutePoints((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        lat: Number(newLat.toFixed(6)),
        lng: Number(newLng.toFixed(6)), 
      };
      return updated;
    });
    setActivePointIndex(index);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 300);
  };


  const handleSaveKmlToDatabase = async () => {
    const vehicleValue = selectedVehicle
      ? extractVehicleNumber(selectedVehicle)
      : searchTerm.trim();
    const activeRoute = routeNameInput || defaultRoute;

    if (!vehicleValue || !activeRoute || routePoints.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please select vehicle, route name, and load points first.",
      });
      return;
    }

    setIsLoading(true);

    const simpleCoords = routePoints.map((pt) => [pt.lat, pt.lng]);

    const payload = {
      vehicle_number: vehicleValue,
      route_name: activeRoute,
      coordinates: simpleCoords,
      detailed_points: routePoints,
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/save-route/ ", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save route in database.");
      }

      // After successful save, turn green points to red (isNew = false)
      const savedPoints = routePoints.map((pt) => ({ ...pt, isNew: false }));
      setRoutePoints(savedPoints);

      setAssignedRoute({
        vehicle_number: vehicleValue,
        route_name: activeRoute,
        total_points: routePoints.length,
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

  // Pagination Logic
  const totalPages = Math.ceil(routePoints.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTablePoints = routePoints.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="bg-white p-5 rounded-xl shadow-md mb-6 border border-gray-100 flex flex-col space-y-6">
      {/* Top Controls Header */}
      <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Vehicle Search Input */}
            <div className="relative min-w-[220px]" ref={vehicleDropdownRef}>
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

              {isVehicleDropdownOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {filteredVehicles.length > 0 ? (
                    filteredVehicles.map((v) => {
                      const vNum = extractVehicleNumber(v);
                      return (
                        <li
                          key={v.id || vNum}
                          onClick={() => handleSelectVehicle(v)}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{vNum}</span>{" "}
                          {v.id && (
                            <span className="text-xs text-gray-400">
                              (ID: {v.id})
                            </span>
                          )}
                        </li>
                      );
                    })
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
            {/* <button 
              onClick={handleShowRoute}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              {isLoading ? "Loading..." : "Show Route"}
            </button> */}
            <button
              onClick={handleSaveKmlToDatabase}
              disabled={isLoading || routePoints.length === 0}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:bg-gray-300 transition"
            >
              {isLoading ? "Saving..." : "Save Route"}
            </button>
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

        {/* LIGHT THEMED POINTS TABLE */}
        <div className="bg-white text-gray-800 rounded-lg p-3 shadow-md border border-gray-200">
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 font-semibold bg-gray-50">
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5">Latitude</th>
                  <th className="p-2.5">Longitude</th>
                  <th className="p-2.5 text-center w-16">Seg</th>
                  <th className="p-2.5">Type/Name</th>
                  <th className="p-2.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentTablePoints.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-6 text-gray-400 font-medium"
                    >
                      No points loaded. Select a vehicle or click "Show Route".
                    </td>
                  </tr>
                ) : (
                  currentTablePoints.map((pt, offset) => {
                    const globalIdx = startIndex + offset;
                    const isSelected = activePointIndex === globalIdx;

                    return (
                      <tr
                        key={globalIdx}
                        onClick={() => setActivePointIndex(globalIdx)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 font-semibold border-l-4 border-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Number Badge */}
                        <td className="p-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] shadow ${
                              isSelected
                                ? "bg-amber-500 text-white animate-pulse"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {globalIdx + 1}
                          </span>
                        </td>

                        {/* Latitude Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={pt.lat}
                            onFocus={() => setActivePointIndex(globalIdx)}
                            onChange={(e) =>
                              handlePointChange(
                                globalIdx,
                                "lat",
                                e.target.value
                              )
                            }
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </td>

                        {/* Longitude Input */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={pt.lng}
                            onFocus={() => setActivePointIndex(globalIdx)}
                            onChange={(e) =>
                              handlePointChange(
                                globalIdx,
                                "lng",
                                e.target.value
                              )
                            }
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </td>

                        {/* Segment Input */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={pt.seg}
                            onFocus={() => setActivePointIndex(globalIdx)}
                            onChange={(e) =>
                              handlePointChange(
                                globalIdx,
                                "seg",
                                e.target.value
                              )
                            }
                            className="w-full text-center bg-white border border-gray-300 rounded px-1.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                          />
                        </td>

                        {/* Type / Name Input */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={pt.name}
                            placeholder="Type/Name"
                            onFocus={() => setActivePointIndex(globalIdx)}
                            onChange={(e) =>
                              handlePointChange(
                                globalIdx,
                                "name",
                                e.target.value
                              )
                            }
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500 placeholder-gray-400"
                          />
                        </td>

                        {/* Actions (+, Up, Down, Delete) */}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm font-bold">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPointBelow(globalIdx);
                              }}
                              className="text-gray-400 hover:text-green-600 transition"
                              title="Add Point Below"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveUp(globalIdx);
                              }}
                              disabled={globalIdx === 0}
                              className="text-gray-400 hover:text-blue-600 disabled:opacity-30 transition"
                              title="Move Up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveDown(globalIdx);
                              }}
                              disabled={globalIdx === routePoints.length - 1}
                              className="text-gray-400 hover:text-blue-600 disabled:opacity-30 transition"
                              title="Move Down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoint(globalIdx);
                              }}
                              className="text-gray-400 hover:text-red-600 transition"
                              title="Delete Point"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200 text-xs text-gray-500">
            <span>
              Showing {routePoints.length > 0 ? startIndex + 1 : 0}-
              {Math.min(startIndex + itemsPerPage, routePoints.length)} of{" "}
              {routePoints.length} points
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded disabled:opacity-40 transition"
              >
                &lt; Prev
              </button>
              <span className="font-semibold text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded disabled:opacity-40 transition"
              >
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Map Section */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Route Preview Map
          </span>

          {assignedRoute && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-700">
              <span>
                Vehicle Assigned: <strong>{assignedRoute.vehicle_number}</strong>
              </span>
              <span className="text-blue-300">|</span>
              <span>
                Active Default Route: <strong>{assignedRoute.route_name}</strong>
              </span>
            </div>  
          )}
        </div>

        <MapView
          locations={mapLocations}
          highlightedIndex={activePointIndex}
          height="450px"
          autoFitBounds={false}
          editable={true}
          onPointDrag={handlePointDrag}
          onMapClick={handleMapClick}
          isDraggingRef={isDraggingRef}
        />
      </div>
    </div>
  );
}