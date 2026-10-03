import { useEffect, useState, useRef } from "react";
import {
  uploadKmlFile,
  assignRouteToVehicle,
  getRouteById,
  deleteAssignedRoute,
  getVehicles,
  getRoutesList,
  getRouteByName,
} from "../api/fleetApi";
import MapView from "../components/MapView";

export default function UploadKml() {
  // State definitions
  const [vehiclesList, setVehiclesList] = useState([]);
  const [existingRoutes, setExistingRoutes] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [fileContent, setFileContent] = useState("");

  // Search / Autosuggest State
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [routeNameInput, setRouteNameInput] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const [parsedLocations, setParsedLocations] = useState([]);

  // Fetch initial database records on mount
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const [vehiclesData, routesData] = await Promise.allSettled([
          getVehicles(),
          getRoutesList ? getRoutesList() : Promise.resolve([]),
        ]);

        if (!ignore) {
          if (vehiclesData.status === "fulfilled" && Array.isArray(vehiclesData.value)) {
            setVehiclesList(vehiclesData.value);
            if (vehiclesData.value.length > 0) {
              setSelectedVehicleId(vehiclesData.value[0].id.toString());
            }
          }

          if (routesData.status === "fulfilled" && Array.isArray(routesData.value)) {
            setExistingRoutes(routesData.value);
          }
        }
      } catch (err) {
        console.warn("Could not fetch database records:", err);
      }
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter existing database routes for autosuggest list
  const filteredRoutes = existingRoutes.filter((r) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const name = (r.route_name || r.name || "").toString().toLowerCase();
    const id = (r.id || "").toString().toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  // Handle Autosuggest selection
  const handleSelectRoute = (route) => {
    const name = route.route_name || route.name || "";
    setSearchTerm(name);
    setRouteNameInput(name);
    if (route.id) setActiveRouteId(route.id);
    setIsDropdownOpen(false);
  };

  // Handle Local KML File Selection
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".kml")) {
        setStatusMessage({
          type: "error",
          text: "Invalid file type. Please select a valid .kml file.",
        });
        return;
      }

      setFile(selectedFile);
      setStatusMessage({ type: "", text: "" });

      if (!routeNameInput) {
        setRouteNameInput(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }

      setParsedLocations([]);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFileContent(event.target.result);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  // Helper function to safely extract [lat, lng] point
  const parsePoint = (pt) => {
    if (!pt) return null;
    if (Array.isArray(pt) && pt.length >= 2) {
      const lat = parseFloat(pt[0]);
      const lng = parseFloat(pt[1]);
      return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
    }
    if (typeof pt === "object") {
      const lat = parseFloat(pt.latitude ?? pt.lat);
      const lng = parseFloat(pt.longitude ?? pt.lng);
      return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
    }
    return null;
  };

  // Helper function to process coordinates into line segments without bridging disjoint paths
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

    // Check if rawCoords is already segmented [[pt, pt], [pt, pt]]
    if (Array.isArray(items[0]) && (Array.isArray(items[0][0]) || typeof items[0][0] === "object")) {
      return items
        .map((seg) => seg.map(parsePoint).filter(Boolean))
        .filter((seg) => seg.length > 0);
    }

    // Flat array: check if start and end point loop, then strip loop closure
    const singleSegment = items.map(parsePoint).filter(Boolean);
    if (singleSegment.length > 2) {
      const first = singleSegment[0];
      const last = singleSegment[singleSegment.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        singleSegment.pop();
      }
    }

    return singleSegment.length > 0 ? [singleSegment] : [];
  };

  // KML coordinate parser (preserves distinct placemark/LineString segments)
  const parseKmlCoordinatesRaw = (kmlText) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");
      const coordNodes = xmlDoc.getElementsByTagName("coordinates");
      const segments = [];

      for (let i = 0; i < coordNodes.length; i++) {
        const rawCoords = coordNodes[i].textContent.trim().split(/\s+/);
        const currentSegment = [];

        rawCoords.forEach((coordStr) => {
          const parts = coordStr.split(",");
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              currentSegment.push([lat, lng]);
            }
          }
        });

        if (currentSegment.length > 0) {
          // Remove loop closure point if start and end are identical
          if (currentSegment.length > 2) {
            const first = currentSegment[0];
            const last = currentSegment[currentSegment.length - 1];
            if (first[0] === last[0] && first[1] === last[1]) {
              currentSegment.pop();
            }
          }
          segments.push(currentSegment);
        }
      }

      return segments;
    } catch (err) {
      console.warn("Failed to parse KML coordinates:", err);
      return [];
    }
  };

  const handleSaveRoute = async (e) => {
    e?.preventDefault();

    const routeName = routeNameInput.trim() || searchTerm.trim();

    if (!routeName) {
      setStatusMessage({ type: "error", text: "Please enter a route name." });
      return;
    }

    if (!file) {
      setStatusMessage({ type: "error", text: "Please choose a KML file before saving." });
      return;
    }

    const coordinatesToSend = fileContent ? parseKmlCoordinatesRaw(fileContent) : [];

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const responseData = await uploadKmlFile(
        routeName,
        file,
        coordinatesToSend
      );

      if (responseData?.id) {
        setActiveRouteId(responseData.id);
      }

      if (getRoutesList) {
        const updatedRoutes = await getRoutesList();
        setExistingRoutes(updatedRoutes);
      }

      setParsedLocations([]);

      setStatusMessage({
        type: "success",
        text: `Success: Route "${routeName}" saved to database! Click "Show Route" to display it on the map.`,
      });
    } catch (error) {
      console.error("Upload API Error:", error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || error.message || "Error saving route.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show Route (Fetch from Database and render on fleet map)
  const handleShowRoute = async () => {
    const targetRouteName = routeNameInput.trim() || searchTerm.trim();

    // Scenario A: Local KML File is selected -> Parse and preview on map
    if (fileContent) {
      const segments = parseKmlCoordinatesRaw(fileContent);
      setParsedLocations(segments);

      const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);

      if (totalPoints > 0) {
        setStatusMessage({
          type: "success",
          text: `Loaded route preview from local KML file (${segments.length} segments, ${totalPoints} points).`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Failed to parse coordinates from the uploaded KML file.",
        });
      }
      return;
    }

    // Scenario B: Fetch from Database by ID or Name
    if (!activeRouteId && !targetRouteName) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a Route Name or upload a KML file to show.",
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      let routeData = null;

      if (activeRouteId) {
        routeData = await getRouteById(activeRouteId);
      } else if (targetRouteName) {
        routeData = await getRouteByName(targetRouteName);
      }

      if (Array.isArray(routeData) && routeData.length > 0) {
        routeData = routeData[0];
      }

      if (routeData) {
        setRouteNameInput(routeData.route_name || targetRouteName);
        setActiveRouteId(routeData.id || null);

        const finalSegments = processDatabaseCoordinates(routeData.coordinates);
        setParsedLocations(finalSegments);

        const totalPoints = finalSegments.reduce((sum, seg) => sum + seg.length, 0);

        if (totalPoints === 0) {
          setStatusMessage({
            type: "error",
            text: `Route "${routeData.route_name || targetRouteName}" fetched from database, but has 0 coordinate points.`,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: `Loaded route "${routeData.route_name || targetRouteName}" (${totalPoints} points) onto map!`,
          });
        }
      } else {
        setStatusMessage({
          type: "error",
          text: `Route "${targetRouteName}" not found in database.`,
        });
      }
    } catch (error) {
      console.error("Fetch Route Error:", error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to fetch route from database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update Route Details
  const handleUpdateRoute = async () => {
    // 1. Guard against missing selections
    if (!selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a vehicle." });
      return;
    }

    if (!selectedRouteId) {
      setStatusMessage({ type: "error", text: "Please select a route." });
      return;
    }

    setIsLoading(true);

    try {
      await assignRouteToVehicle({
        vehicle: Number(selectedVehicleId),
        route: Number(selectedRouteId), // or route ID string/object depending on your model
      });

      setStatusMessage({
        type: "success",
        text: "Route updated in database!",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to update route.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete Route
  const handleDeleteRoute = async () => {
    if (!activeRouteId && !selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a route or vehicle to delete." });
      return;
    }

    setIsLoading(true);

    try {
      await deleteAssignedRoute(activeRouteId || selectedVehicleId);

      setFile(null);
      setRouteNameInput("");
      setSearchTerm("");
      setActiveRouteId(null);
      setParsedLocations([]);

      if (getRoutesList) {
        const updatedRoutes = await getRoutesList();
        setExistingRoutes(updatedRoutes);
      }

      setStatusMessage({
        type: "success",
        text: "Route deleted successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to delete route.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Count total points across segments for preview title
  const totalPointCount = parsedLocations.reduce(
    (acc, seg) => acc + (Array.isArray(seg) ? seg.length : 0),
    0
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* Control Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6">
        
        {/* Route Name Input with Autosuggest */}
        <div className="relative flex flex-col flex-1 min-w-[220px]" ref={dropdownRef}>
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Route Name
          </label>
          <input
            type="text"
            placeholder="Enter or select Route Name"
            value={routeNameInput || searchTerm}
            onChange={(e) => {
              setRouteNameInput(e.target.value);
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="p-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Database Autosuggest Dropdown */}
          {isDropdownOpen && (
            <ul className="absolute left-0 top-full z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((r, index) => (
                  <li
                    key={r.id || index}
                    onClick={() => handleSelectRoute(r)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <span className="font-medium">{r.route_name || r.name}</span>
                    {r.id && <span className="text-xs text-gray-400">ID: {r.id}</span>}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-gray-400">
                  No matching routes found
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Upload KML File Input */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Upload KML File
          </label>
          <input
            type="file"
            accept=".kml"
            onChange={handleFileUpload}
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div>
          <button
            type="button"
            onClick={handleSaveRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Route"}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleShowRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            Show Route
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleUpdateRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            Update Route
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleDeleteRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete Route"}
          </button>
        </div>
      </div>

      {/* Backend Status Message Banner */}
      {statusMessage.text && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Map Preview Section */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Route Preview {totalPointCount > 0 && `(${totalPointCount} points)`}
        </h2>
        <MapView
          key={`map-key-${totalPointCount}`}
          locations={parsedLocations}
          height="500px"
          autoFitBounds={true}
        />
      </div>
    </div>
  );
}